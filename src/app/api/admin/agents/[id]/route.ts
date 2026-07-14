import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [agentRes, propertiesRes, leadsRes] = await Promise.all([
    supabaseAdmin.from('agents').select('*').eq('id', id).single(),
    supabaseAdmin.from('properties').select('*').eq('agent_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('leads').select('*').eq('agent_id', id).order('last_interaction', { ascending: false })
  ])

  if (agentRes.error || !agentRes.data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const leads = leadsRes.data || []
  const properties = propertiesRes.data || []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const stats = {
    totalProperties: properties.length,
    activeProperties: properties.filter((p: { status: string }) => p.status === 'active').length,
    totalLeads: leads.length,
    newLeads: leads.filter((l: { stage: string }) => l.stage === 'new').length,
    qualifiedLeads: leads.filter((l: { stage: string }) => l.stage === 'qualified').length,
    closedLeads: leads.filter((l: { stage: string }) => l.stage === 'closed').length,
    recentLeads: leads.filter((l: { last_interaction: string }) => new Date(l.last_interaction) > sevenDaysAgo).length,
  }

  return NextResponse.json({ agent: agentRes.data, properties, leads, stats })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const allowed = ['phone_number_id', 'webhook_verify_token', 'agent_phone', 'status']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('agents').update(updates).eq('id', id)
  if (error) {
    console.error('PATCH /api/admin/agents/[id] error:', error)
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

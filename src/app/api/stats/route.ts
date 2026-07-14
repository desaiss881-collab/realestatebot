import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

async function getAgentFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return agent ?? null
}

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [propertiesRes, leadsRes] = await Promise.all([
    supabaseAdmin.from('properties').select('id, status').eq('agent_id', agent.id),
    supabaseAdmin.from('leads').select('id, stage, last_interaction').eq('agent_id', agent.id)
  ])

  const properties = propertiesRes.data || []
  const leads = leadsRes.data || []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return NextResponse.json({
    totalProperties: properties.length,
    activeProperties: properties.filter(p => p.status === 'active').length,
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.stage === 'new').length,
    recentLeads: leads.filter(l => new Date(l.last_interaction) > sevenDaysAgo).length,
    qualifiedLeads: leads.filter(l => l.stage === 'qualified').length,
  })
}

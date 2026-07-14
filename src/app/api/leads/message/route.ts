import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const META_TOKEN = process.env.META_ACCESS_TOKEN!

async function getAgentFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: agent } = await supabaseAdmin.from('agents').select('*').eq('user_id', user.id).single()
  return agent ?? null
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!agent.phone_number_id) {
    return NextResponse.json({ error: 'WhatsApp Phone Number ID not set for this agent. Add it in WhatsApp Setup.' }, { status: 400 })
  }

  const { lead_id, message } = await req.json()
  if (!lead_id || !message?.trim()) {
    return NextResponse.json({ error: 'lead_id and message are required' }, { status: 400 })
  }

  // Verify lead belongs to this agent
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, customer_phone, collected_data')
    .eq('id', lead_id)
    .eq('agent_id', agent.id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Send via Meta API
  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${agent.phone_number_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: lead.customer_phone, text: { body: message.trim() } })
  })

  const metaJson = await metaRes.json()

  if (metaJson.error) {
    return NextResponse.json({ error: metaJson.error.message ?? 'Meta API error' }, { status: 502 })
  }

  // Log the outgoing message
  await supabaseAdmin.from('messages').insert({
    lead_id: lead.id,
    direction: 'out',
    body: message.trim()
  })

  // Update lead's last_interaction and stage to 'contacted' if still 'new'
  const updates: Record<string, unknown> = { last_interaction: new Date().toISOString() }
  if (lead.collected_data?.stage === 'new') updates.stage = 'contacted'
  await supabaseAdmin.from('leads').update(updates).eq('id', lead.id)

  return NextResponse.json({ success: true })
}

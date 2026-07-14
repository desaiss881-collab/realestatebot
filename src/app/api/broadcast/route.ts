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

async function sendWhatsAppText(phoneNumberId: string, to: string, body: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, text: { body } })
  })
  return res.json()
}

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const intentFilter = url.searchParams.get('intent') // 'buy' | 'rent' | null

  let query = supabaseAdmin
    .from('leads')
    .select('id, customer_phone, stage, search_preferences, collected_data')
    .eq('agent_id', agent.id)

  if (intentFilter) {
    query = query.contains('search_preferences', { intent: intentFilter })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data, total: data?.length ?? 0 })
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!agent.phone_number_id) {
    return NextResponse.json({ error: 'No WhatsApp phone number linked to this agent yet. The number is auto-detected when a customer messages you first.' }, { status: 400 })
  }

  const { message, intent_filter, stage_filter } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  let query = supabaseAdmin
    .from('leads')
    .select('id, customer_phone, collected_data')
    .eq('agent_id', agent.id)

  if (intent_filter) {
    query = query.contains('search_preferences', { intent: intent_filter })
  }
  if (stage_filter) {
    query = query.eq('stage', stage_filter)
  }

  const { data: leads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!leads?.length) return NextResponse.json({ sent: 0, failed: 0, message: 'No leads matched the filters' })

  let sent = 0
  let failed = 0

  for (const lead of leads) {
    try {
      const name = (lead.collected_data?.customer_name as string) || ''
      // Personalise message if it contains {name}
      const personalised = message.replace('{name}', name || 'there')
      await sendWhatsAppText(agent.phone_number_id, lead.customer_phone, personalised)
      // Log the broadcast message
      await supabaseAdmin.from('messages').insert({ lead_id: lead.id, direction: 'out', body: `[Broadcast] ${personalised}` })
      sent++
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300))
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}

import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

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

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const intent = url.searchParams.get('intent') // 'buy' | 'rent' | null

  let query = supabaseAdmin
    .from('customers')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  if (intent === 'buy' || intent === 'rent') {
    query = query.eq('intent', intent)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers: data })
}

export async function POST(req: Request) {
  // Broadcast to selected customers
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!agent.phone_number_id) {
    return NextResponse.json({
      error: 'No WhatsApp number linked yet. Your number is auto-detected when a customer messages you first.'
    }, { status: 400 })
  }

  const { message, customer_ids } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (!customer_ids?.length) return NextResponse.json({ error: 'No customers selected' }, { status: 400 })

  const { data: customers, error } = await supabaseAdmin
    .from('customers')
    .select('id, phone, name')
    .eq('agent_id', agent.id)
    .in('id', customer_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let failed = 0

  for (const customer of customers || []) {
    try {
      const personalised = message.replace('{name}', customer.name || 'there')
      const res = await fetch(`https://graph.facebook.com/v20.0/${agent.phone_number_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: customer.phone, text: { body: personalised } })
      })
      const result = await res.json()
      if (result.error) { failed++; continue }
      sent++
      await new Promise(r => setTimeout(r, 300))
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}

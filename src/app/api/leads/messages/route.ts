import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAgentFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: agent } = await supabaseAdmin.from('agents').select('id').eq('user_id', user.id).single()
  return agent ?? null
}

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req)
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const leadId = url.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })

  // Verify lead belongs to this agent
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('agent_id', agent.id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, direction, body, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: messages ?? [] })
}

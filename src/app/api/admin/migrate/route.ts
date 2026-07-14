import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, email, status')
    .is('user_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data })
}

export async function POST(req: Request) {
  const { agent_id, password } = await req.json()

  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .select('id, name, email')
    .eq('id', agent_id)
    .single()

  if (agentError || !agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!agent.email) return NextResponse.json({ error: 'Agent has no email address' }, { status: 400 })

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: agent.email,
    password,
    email_confirm: true
  })

  if (authError) return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 500 })

  const { error: updateError } = await supabaseAdmin
    .from('agents')
    .update({ user_id: authData.user.id })
    .eq('id', agent_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ agents: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, ...agentData } = body

  // Create auth user first if email and password provided
  let userId: string | null = null
  if (email && password) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 500 })
    }

    userId = authData.user.id
  }

  // Create agent record with user_id
  const agentRecord = {
    ...agentData,
    email: email || null,
    user_id: userId
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert(agentRecord)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ agent: data })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, status } = body

  const { error } = await supabaseAdmin
    .from('agents')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

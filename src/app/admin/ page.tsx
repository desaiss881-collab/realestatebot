'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Agent = {
  id: string
  name: string
  email: string | null
  agent_slug: string
  status: string
  created_at: string
}

export default function AdminPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadAgents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setAgents(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAgents()
  }, [])

  async function updateStatus(id: string, status: string) {
    await supabase.from('agents').update({ status }).eq('id', id)
    loadAgents()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agent Management</h1>
        <button onClick={handleLogout} style={{ padding: '6px 12px' }}>Log Out</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Slug</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{agent.name}</td>
              <td style={{ padding: 8 }}>{agent.email || '-'}</td>
              <td style={{ padding: 8 }}>{agent.agent_slug}</td>
              <td style={{ padding: 8 }}>{agent.status}</td>
              <td style={{ padding: 8 }}>
                {agent.status !== 'approved' && (
                  <button onClick={() => updateStatus(agent.id, 'approved')} style={{ marginRight: 8 }}>
                    Approve
                  </button>
                )}
                {agent.status !== 'rejected' && (
                  <button onClick={() => updateStatus(agent.id, 'rejected')}>
                    Reject
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
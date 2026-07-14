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
    const res = await fetch('/api/agents')
    const json = await res.json()
    if (json.error) {
      console.error(json.error)
    } else {
      setAgents(json.agents || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAgents()
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
    loadAgents()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function statusBadge(status: string) {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    if (status === 'approved') return base + ' bg-green-100 text-green-800'
    if (status === 'rejected') return base + ' bg-red-100 text-red-800'
    if (status === 'suspended') return base + ' bg-gray-100 text-gray-800'
    return base + ' bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Agent Management</h1>
            <p className="text-sm text-gray-500 mt-1">Review, approve, and manage real estate agents</p>
            <div className="flex gap-4 mt-1">
              <a href="/admin/new-agent" className="text-sm text-blue-600 hover:underline">+ Add New Agent</a>
              <a href="/admin/migrate" className="text-sm text-orange-600 hover:underline">Link Existing Agents</a>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Log Out
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No agents yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <a href={`/admin/agents/${agent.id}`} className="hover:text-blue-600 hover:underline">{agent.name}</a>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{agent.email || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{agent.agent_slug}</td>
                    <td className="px-6 py-4">
                      <span className={statusBadge(agent.status)}>{agent.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {agent.status !== 'approved' && (
                        <button
                          onClick={() => updateStatus(agent.id, 'approved')}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      {agent.status !== 'rejected' && (
                        <button
                          onClick={() => updateStatus(agent.id, 'rejected')}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      )}
                      <a
                        href={`/admin/agents/${agent.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

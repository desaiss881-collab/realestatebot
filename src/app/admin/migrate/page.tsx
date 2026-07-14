'use client'

import { useEffect, useState } from 'react'

type AgentStub = {
  id: string
  name: string
  email: string | null
  status: string
}

export default function AdminMigratePage() {
  const [agents, setAgents] = useState<AgentStub[]>([])
  const [loading, setLoading] = useState(true)
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/migrate')
      .then(r => r.json())
      .then(json => {
        setAgents(json.agents || [])
        setLoading(false)
      })
  }, [])

  async function linkAgent(agent: AgentStub) {
    const password = passwords[agent.id]
    if (!password || password.length < 6) {
      setResults(r => ({ ...r, [agent.id]: 'Password must be at least 6 characters' }))
      return
    }
    setWorking(w => ({ ...w, [agent.id]: true }))
    const res = await fetch('/api/admin/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agent.id, password })
    })
    const json = await res.json()
    if (json.error) {
      setResults(r => ({ ...r, [agent.id]: `Error: ${json.error}` }))
    } else {
      setResults(r => ({ ...r, [agent.id]: '✓ Linked successfully' }))
      setAgents(prev => prev.filter(a => a.id !== agent.id))
    }
    setWorking(w => ({ ...w, [agent.id]: false }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">&larr; Back to Admin</a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Link Agents to Login</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set a password for existing agents so they can log in to their dashboard.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-20">Loading...</p>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">All agents are linked</p>
            <p className="text-sm mt-1">Every agent has a login account.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
            {agents.map((agent) => (
              <div key={agent.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.email || 'No email — cannot link'}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{agent.status}</span>
                </div>
                {agent.email ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Set password (min 6 chars)"
                      value={passwords[agent.id] || ''}
                      onChange={(e) => setPasswords(p => ({ ...p, [agent.id]: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={() => linkAgent(agent)}
                      disabled={working[agent.id]}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {working[agent.id] ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">Add an email to this agent first to enable login.</p>
                )}
                {results[agent.id] && (
                  <p className={`text-sm mt-2 ${results[agent.id].startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                    {results[agent.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

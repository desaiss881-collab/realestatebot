'use client'

import { useEffect, useState } from 'react'

type Agent = {
  id: string
  name: string
  email: string | null
  agent_slug: string
  status: string
  user_id: string | null
  phone_number_id: string | null
  webhook_verify_token: string | null
  agent_phone: string | null
}

type Property = {
  id: string
  title: string
  status: string
  price: number
  area: string
  intent: string
}

type Lead = {
  id: string
  customer_phone: string
  stage: string
  last_interaction: string
}

type Stats = {
  totalProperties: number
  activeProperties: number
  totalLeads: number
  newLeads: number
  qualifiedLeads: number
  closedLeads: number
  recentLeads: number
}

function statusBadge(status: string) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  if (status === 'approved') return base + ' bg-green-100 text-green-800'
  if (status === 'rejected') return base + ' bg-red-100 text-red-800'
  if (status === 'suspended') return base + ' bg-gray-100 text-gray-800'
  return base + ' bg-yellow-100 text-yellow-800'
}

function stageBadge(stage: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (stage === 'new') return base + ' bg-blue-100 text-blue-800'
  if (stage === 'contacted') return base + ' bg-yellow-100 text-yellow-800'
  if (stage === 'qualified') return base + ' bg-green-100 text-green-800'
  return base + ' bg-gray-100 text-gray-600'
}

export default function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'properties' | 'leads' | 'whatsapp'>('properties')
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waAgentPhone, setWaAgentPhone] = useState('')
  const [waSaving, setWaSaving] = useState(false)
  const [waSaved, setWaSaved] = useState(false)
  const [waError, setWaError] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/admin/agents/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.error) { setError(json.error); setLoading(false); return }
          setAgent(json.agent)
          setProperties(json.properties)
          setLeads(json.leads)
          setStats(json.stats)
          setWaPhoneId(json.agent.phone_number_id || '')
          setWaAgentPhone(json.agent.agent_phone || '')
          setLoading(false)
        })
    })
  }, [params])

  if (loading) return <p className="p-10 text-center text-gray-500">Loading...</p>
  if (error || !agent) return <p className="p-10 text-center text-red-500">{error || 'Agent not found'}</p>

  async function saveWaSettings() {
    setWaSaving(true)
    setWaSaved(false)
    setWaError('')
    const res = await fetch(`/api/admin/agents/${agent!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number_id: waPhoneId.trim() || null, agent_phone: waAgentPhone.trim() || null })
    })
    const json = await res.json()
    if (json.error) setWaError(json.hint || json.details || json.error)
    else setWaSaved(true)
    setWaSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">&larr; Back to Admin</a>
        </div>

        {/* Agent Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{agent.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{agent.email || 'No email'} &middot; /{agent.agent_slug}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={statusBadge(agent.status)}>{agent.status}</span>
                {agent.user_id
                  ? <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Login linked</span>
                  : <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">No login yet</span>
                }
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
                <p className="text-xs text-gray-500 mt-1">Properties</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.activeProperties}</p>
                <p className="text-xs text-gray-500 mt-1">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
                <p className="text-xs text-gray-500 mt-1">Total Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.recentLeads}</p>
                <p className="text-xs text-gray-500 mt-1">Last 7 Days</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('properties')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === 'properties' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Properties ({properties.length})
          </button>
          <button
            onClick={() => setTab('leads')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === 'leads' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => setTab('whatsapp')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === 'whatsapp' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📱 WhatsApp Setup
          </button>
        </div>

        {tab === 'properties' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {properties.length === 0 ? (
              <p className="p-10 text-center text-gray-500">No properties yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Area</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {properties.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.title}</td>
                      <td className="px-6 py-3 text-gray-500">{p.area}</td>
                      <td className="px-6 py-3 text-gray-700">₹{Number(p.price).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3 text-gray-500">{p.intent === 'buy' ? 'Sale' : 'Rent'}</td>
                      <td className="px-6 py-3"><span className={statusBadge(p.status)}>{p.status}</span></td>
                      <td className="px-6 py-3">
                        <a href={`/p/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {leads.length === 0 ? (
              <p className="p-10 text-center text-gray-500">No leads yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Stage</th>
                    <th className="px-6 py-3 font-medium">Last Interaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{l.customer_phone}</td>
                      <td className="px-6 py-3"><span className={stageBadge(l.stage)}>{l.stage}</span></td>
                      <td className="px-6 py-3 text-gray-500">{new Date(l.last_interaction).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="space-y-6">

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="font-semibold text-blue-900 mb-3">📋 How to connect this agent to WhatsApp</h3>
              <p className="text-sm text-blue-800 mb-3">
                Your platform uses a <strong>single shared webhook</strong> — already configured in Meta. You do <strong>not</strong> need to add a new webhook for each agent.
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Go to <strong>Meta for Developers</strong> → Your App → WhatsApp → Phone Numbers</li>
                <li>Add the agent&apos;s WhatsApp Business number (or use an existing one)</li>
                <li>Copy the <strong>Phone Number ID</strong> (numeric, e.g. 123456789012345)</li>
                <li>Paste it in the field below and click <strong>Save</strong></li>
                <li>Messages from that number will automatically route to this agent ✅</li>
              </ol>
            </div>

            {/* Agent's Personal Phone */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Agent&apos;s Personal WhatsApp Number</h3>
              <p className="text-xs text-gray-500 mb-3">
                When the agent messages their own bot from this number, they will receive a real-time summary
                of all open leads (New, Contacted, Qualified) instead of going through the customer flow.
              </p>
              <input
                type="text"
                value={waAgentPhone}
                onChange={e => setWaAgentPhone(e.target.value)}
                placeholder="e.g. 919876543210 or +91 98765 43210"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-mono"
              />
              <p className="text-xs text-gray-400 mt-2">Include country code. Spaces/dashes are OK (automatically stripped).</p>
            </div>

            {/* Phone Number ID */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Phone Number ID</h3>
              <p className="text-xs text-gray-500 mb-3">
                Found in Meta → WhatsApp → API Setup → Phone Number ID. Required for sending broadcast messages.
                This is also auto-saved when the agent receives their first WhatsApp message.
              </p>
              <input
                type="text"
                value={waPhoneId}
                onChange={e => setWaPhoneId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-mono"
              />
              {agent.phone_number_id && (
                <p className="text-xs text-green-600 mt-2">✓ Phone Number ID is set — broadcast is ready</p>
              )}
              {!agent.phone_number_id && (
                <p className="text-xs text-orange-500 mt-2">⚠ Not set yet — broadcast will fail until this is configured</p>
              )}
            </div>

            <button
              onClick={saveWaSettings}
              disabled={waSaving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {waSaving ? 'Saving...' : waSaved ? '✓ Saved' : 'Save WhatsApp Settings'}
            </button>
            {waSaved && <p className="text-sm text-green-600 text-center font-medium">Settings saved successfully.</p>}
            {waError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <strong>Error:</strong> {waError}<br />
                <span className="text-xs text-red-500 mt-1 block">
                  Make sure these columns exist in Supabase: run <code className="bg-red-100 px-1 rounded">ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS webhook_verify_token text; ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS agent_phone text;</code>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

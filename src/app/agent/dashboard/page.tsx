'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type AgentProfile = {
  id: string
  name: string
  email: string | null
  agent_slug: string
  status: string
  service_areas: string[]
}

type Stats = {
  totalProperties: number
  activeProperties: number
  totalLeads: number
  newLeads: number
  recentLeads: number
  qualifiedLeads: number
}

const statCards = [
  {
    key: 'activeProperties' as keyof Stats,
    label: 'Active Listings',
    icon: '🏠',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
  },
  {
    key: 'totalLeads' as keyof Stats,
    label: 'Total Leads',
    icon: '👥',
    color: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
  },
  {
    key: 'newLeads' as keyof Stats,
    label: 'New Leads',
    icon: '🔔',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  {
    key: 'qualifiedLeads' as keyof Stats,
    label: 'Qualified',
    icon: '✅',
    color: 'from-emerald-400 to-green-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
]

export default function AgentDashboard() {
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editingAreas, setEditingAreas] = useState(false)
  const [draftAreas, setDraftAreas] = useState<string[]>([])
  const [newArea, setNewArea] = useState('')
  const [savingAreas, setSavingAreas] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) { window.location.href = '/agent'; return }

    const { data, error } = await supabase
      .from('agents').select('*').eq('user_id', userData.user.id).single()

    if (error || !data) { setNotFound(true); setLoading(false); return }
    setAgent(data)

    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (token) {
      const statsRes = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      const statsJson = await statsRes.json()
      if (!statsJson.error) setStats(statsJson)
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/agent'
  }

  function startEditAreas() {
    setDraftAreas(agent?.service_areas ?? [])
    setNewArea('')
    setEditingAreas(true)
  }

  function addArea() {
    const trimmed = newArea.trim()
    if (!trimmed || draftAreas.includes(trimmed)) return
    setDraftAreas(prev => [...prev, trimmed])
    setNewArea('')
  }

  function removeArea(area: string) {
    setDraftAreas(prev => prev.filter(a => a !== area))
  }

  async function saveAreas() {
    setSavingAreas(true)
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/agents/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ service_areas: draftAreas }),
    })
    const json = await res.json()
    if (!json.error) {
      setAgent(prev => prev ? { ...prev, service_areas: draftAreas } : prev)
      setEditingAreas(false)
    }
    setSavingAreas(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Profile Not Linked</h2>
          <p className="text-sm text-gray-500 mb-4">No agent profile is linked to this account. Contact your admin.</p>
          <button onClick={handleLogout} className="text-sm text-violet-600 hover:underline">Log Out</button>
        </div>
      </div>
    )
  }

  const initials = agent?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AG'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold text-white shadow-inner">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-violet-200 uppercase tracking-widest">Agent Dashboard</p>
                <h1 className="text-2xl font-bold">Welcome back, {agent?.name?.split(' ')[0]} 👋</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full ${agent?.status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {agent?.status}
                  </span>
                  <span className="text-violet-300 text-xs">/{agent?.agent_slug}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium backdrop-blur transition"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-6 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ key, label, icon, bg, text }) => (
            <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} text-xl mb-3`}>
                {icon}
              </div>
              <p className={`text-3xl font-bold ${text}`}>{stats ? stats[key] : '—'}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Service Areas */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Service Areas</p>
            {!editingAreas && (
              <button
                onClick={startEditAreas}
                className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editingAreas ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {draftAreas.map(area => (
                  <span key={area} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-medium border border-violet-100">
                    📍 {area}
                    <button
                      onClick={() => removeArea(area)}
                      className="ml-0.5 text-violet-400 hover:text-red-500 font-bold leading-none transition"
                    >×</button>
                  </span>
                ))}
                {draftAreas.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No service areas added</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArea}
                  onChange={e => setNewArea(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addArea()}
                  placeholder="Add area (e.g. Bandra, Powai)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 bg-gray-50"
                />
                <button
                  onClick={addArea}
                  disabled={!newArea.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 disabled:opacity-40 transition"
                >+ Add</button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={saveAreas}
                  disabled={savingAreas}
                  className="px-5 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition disabled:opacity-50"
                >{savingAreas ? 'Saving…' : 'Save'}</button>
                <button
                  onClick={() => setEditingAreas(false)}
                  className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:border-gray-300 transition"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {agent?.service_areas?.length ? agent.service_areas.map(area => (
                <span key={area} className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-medium border border-violet-100">
                  📍 {area}
                </span>
              )) : (
                <p className="text-sm text-gray-400 italic">No service areas set — click Edit to add some.</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a
            href="/agent/properties"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-violet-200 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-50 rounded-bl-full opacity-60" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                🏘️
              </div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-violet-700 transition-colors">My Properties</h2>
              <p className="text-sm text-gray-500 mt-1">Add, edit, and manage your listings</p>
              {stats && (
                <p className="text-xs text-gray-400 mt-3 font-medium">
                  <span className="text-violet-600 font-semibold">{stats.activeProperties}</span> active
                  &nbsp;·&nbsp;
                  <span className="text-gray-500">{stats.totalProperties}</span> total
                </p>
              )}
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-violet-600 group-hover:gap-2 gap-1 transition-all">
                Manage listings <span>→</span>
              </div>
            </div>
          </a>

          <a
            href="/agent/leads"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-sky-200 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-100 to-blue-50 rounded-bl-full opacity-60" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                💬
              </div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-sky-700 transition-colors">My Leads</h2>
              <p className="text-sm text-gray-500 mt-1">Manage leads from your WhatsApp bot</p>
              {stats && (
                <p className="text-xs text-gray-400 mt-3 font-medium">
                  <span className="text-amber-500 font-semibold">{stats.newLeads}</span> new
                  &nbsp;·&nbsp;
                  <span className="text-sky-600">{stats.recentLeads}</span> this week
                </p>
              )}
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 group-hover:gap-2 gap-1 transition-all">
                View leads <span>→</span>
              </div>
            </div>
          </a>

          <a
            href="/agent/customers"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-50 rounded-bl-full opacity-60" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                👥
              </div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">Customers</h2>
              <p className="text-sm text-gray-500 mt-1">Buyer &amp; renter database for offers</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-600 group-hover:gap-2 gap-1 transition-all">
                View database <span>→</span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

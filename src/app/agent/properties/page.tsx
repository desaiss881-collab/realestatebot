'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Property = {
  id: string
  title: string
  intent: string
  size_sqft: number
  price: number
  area: string
  status: string
  image_urls: string[]
  created_at: string
}

function statusBadge(status: string) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  if (status === 'active') return base + ' bg-green-100 text-green-800'
  if (status === 'sold') return base + ' bg-blue-100 text-blue-800'
  if (status === 'rented') return base + ' bg-purple-100 text-purple-800'
  if (status === 'archived') return base + ' bg-gray-100 text-gray-800'
  return base + ' bg-yellow-100 text-yellow-800'
}

const MAX_BUDGET = 100_000_000 // 10 Crore

function formatBudget(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)} Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function AgentPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [budgetFilter, setBudgetFilter] = useState(MAX_BUDGET)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    loadProperties()
  }, [])

  async function getToken() {
    const { data } = await supabaseRef.current!.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function loadProperties() {
    setLoading(true)
    const token = await getToken()
    if (!token) {
      window.location.href = '/agent'
      return
    }

    const res = await fetch('/api/properties', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setProperties(json.properties || [])
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const token = await getToken()
    await fetch('/api/properties', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id, status })
    })
    loadProperties()
  }

  const filteredProperties = properties.filter(p => p.price <= budgetFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/agent/dashboard" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</a>
            <h1 className="text-2xl font-semibold text-gray-900 mt-2">My Properties</h1>
            <p className="text-sm text-gray-500 mt-1">
              {budgetFilter < MAX_BUDGET ? `${filteredProperties.length} of ${properties.length}` : properties.length} listing{properties.length !== 1 ? 's' : ''}
            </p>
          </div>
          <a
            href="/agent/properties/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            + Post Property
          </a>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {/* Budget Slider */}
        {!loading && properties.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Max Budget Filter</label>
              <span className="text-sm font-bold text-blue-700">
                {budgetFilter >= MAX_BUDGET ? 'No limit' : formatBudget(budgetFilter)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_BUDGET}
              step={100_000}
              value={budgetFilter}
              onChange={e => setBudgetFilter(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>₹0</span>
              <span>₹10 Cr</span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 py-20">Loading...</p>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">No properties yet</p>
            <p className="text-sm mt-1">Click &quot;Post Property&quot; to add your first listing</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">No properties within this budget</p>
            <p className="text-sm mt-1">Try increasing the budget slider above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProperties.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {p.image_urls?.length > 0 ? (
                  <img src={p.image_urls[0]} alt={p.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-base font-semibold text-gray-900">{p.title}</h2>
                    <span className={statusBadge(p.status)}>{p.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{p.area} &middot; {p.size_sqft} sqft &middot; For {p.intent === 'buy' ? 'Sale' : 'Rent'}</p>
                  <p className="text-base font-semibold text-blue-700 mb-3">₹{Number(p.price).toLocaleString('en-IN')}</p>
                  <div className="flex gap-2">
                    <select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                      className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                      <option value="rented">Rented</option>
                      <option value="archived">Archived</option>
                    </select>
                    <a
                      href={`/agent/properties/${p.id}`}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${p.id}`)
                        alert('Share link copied!')
                      }}
                      className="px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

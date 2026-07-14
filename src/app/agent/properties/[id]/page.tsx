'use client'

import { useEffect, useState } from 'react'
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
  pdf_url: string | null
}

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [propertyId, setPropertyId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    params.then(({ id }) => {
      setPropertyId(id)
      loadProperty(id)
    })
  }, [params])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function loadProperty(id: string) {
    const token = await getToken()
    if (!token) { window.location.href = '/agent'; return }
    const res = await fetch(`/api/properties/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setLoading(false); return }
    setProperty(json.property)
    setLoading(false)
  }

  async function uploadFile(file: File, bucket: string): Promise<string> {
    const token = await getToken()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    return json.url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!property) return
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      let image_urls = property.image_urls
      if (imageFiles && imageFiles.length > 0) {
        const newUrls = await Promise.all(
          Array.from(imageFiles).map(f => uploadFile(f, 'property-images'))
        )
        image_urls = [...image_urls, ...newUrls]
      }

      let pdf_url = property.pdf_url
      if (pdfFile) {
        pdf_url = await uploadFile(pdfFile, 'property-pdfs')
      }

      const token = await getToken()
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...property, image_urls, pdf_url })
      })
      const json = await res.json()
      if (json.error) { setError(json.error); setSaving(false); return }
      setProperty(json.property)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this property? This cannot be undone.')) return
    const token = await getToken()
    await fetch(`/api/properties/${propertyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    window.location.href = '/agent/properties'
  }

  function removeImage(url: string) {
    if (!property) return
    setProperty({ ...property, image_urls: property.image_urls.filter(u => u !== url) })
  }

  if (loading) return <p className="p-10 text-center text-gray-500">Loading...</p>
  if (!property) return <p className="p-10 text-center text-red-500">{error || 'Property not found'}</p>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <a href="/agent/properties" className="text-sm text-blue-600 hover:underline">&larr; Back to Properties</a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Edit Property</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={property.title}
              onChange={(e) => setProperty({ ...property, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
            <select
              value={property.intent}
              onChange={(e) => setProperty({ ...property, intent: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="buy">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
            <input
              type="text"
              required
              value={property.area}
              onChange={(e) => setProperty({ ...property, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size (sqft)</label>
              <input
                type="number"
                required
                min="1"
                value={property.size_sqft}
                onChange={(e) => setProperty({ ...property, size_sqft: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={property.price}
                onChange={(e) => setProperty({ ...property, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={property.status}
              onChange={(e) => setProperty({ ...property, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {property.image_urls?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Images</label>
              <div className="flex flex-wrap gap-2">
                {property.image_urls.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-md border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add More Images <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF Brochure <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {property.pdf_url && (
              <div className="mb-2 flex items-center gap-2">
                <a href={property.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View current PDF</a>
                <button type="button" onClick={() => setProperty({ ...property, pdf_url: null })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            )}
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400 mt-1">Requires a &quot;property-pdfs&quot; public bucket in Supabase Storage</p>
          </div>

          {success && <p className="text-sm text-green-600">Property updated successfully.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="py-2 px-4 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

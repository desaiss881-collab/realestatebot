import { supabaseAdmin } from '@/lib/supabase-admin'
import { notFound } from 'next/navigation'

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('*, agents(name, phone, email)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!property) notFound()

  const agent = property.agents as { name: string; phone: string | null; email: string | null } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Images */}
        {property.image_urls?.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 mb-6">
            <img src={property.image_urls[0]} alt={property.title} className="w-full h-72 object-cover rounded-xl" />
            {property.image_urls.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {property.image_urls.slice(1, 4).map((url: string) => (
                  <img key={url} src={url} alt="" className="w-full h-28 object-cover rounded-lg" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-72 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 mb-6">No images</div>
        )}

        {/* Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
              <p className="text-gray-500 mt-1">{property.area}</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              For {property.intent === 'buy' ? 'Sale' : 'Rent'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Price</p>
              <p className="text-xl font-bold text-blue-700 mt-1">₹{Number(property.price).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Size</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{property.size_sqft} sqft</p>
            </div>
          </div>

          {property.pdf_url && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a
                href={property.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
              >
                📄 Download Brochure (PDF)
              </a>
            </div>
          )}
        </div>

        {/* Agent Contact */}
        {agent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Listed by</h2>
            <p className="text-lg font-semibold text-gray-900">{agent.name}</p>
            <div className="flex gap-3 mt-4">
              {agent.phone && (
                <a
                  href={`https://wa.me/${agent.phone.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md text-center hover:bg-green-700"
                >
                  WhatsApp
                </a>
              )}
              {agent.phone && (
                <a
                  href={`tel:${agent.phone}`}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md text-center hover:bg-gray-50"
                >
                  Call
                </a>
              )}
              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md text-center hover:bg-gray-50"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Building2, Plus, Search, ToggleLeft, ToggleRight, ExternalLink, X } from 'lucide-react'

const METHOD_BADGE = {
  greenhouse: { label: 'Greenhouse API', color: 'bg-green-100 text-green-700' },
  lever:      { label: 'Lever API',       color: 'bg-blue-100 text-blue-700' },
  workday:    { label: 'Workday',          color: 'bg-purple-100 text-purple-700' },
  playwright: { label: 'Web Scraper',      color: 'bg-amber-100 text-amber-700' },
  manual:     { label: 'Manual',           color: 'bg-slate-100 text-slate-500' },
}

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', careers_url: '', scrape_method: 'playwright' })
  const [adding, setAdding]       = useState(false)

  const fetchCompanies = async () => {
    try {
      const { data } = await api.get('/companies/')
      setCompanies(data)
    } catch {
      toast.error('Failed to load companies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const toggle = async (company) => {
    const newState = !company.is_enabled
    // Optimistic update
    setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, is_enabled: newState } : c))
    try {
      await api.post('/companies/toggle', { company_id: company.id, is_enabled: newState })
    } catch {
      toast.error('Failed to update.')
      setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, is_enabled: company.is_enabled } : c))
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newCompany.name || !newCompany.careers_url) {
      toast.error('Name and URL are required.')
      return
    }
    setAdding(true)
    try {
      await api.post('/companies/add', newCompany)
      toast.success(`${newCompany.name} added!`)
      setNewCompany({ name: '', careers_url: '', scrape_method: 'playwright' })
      setShowAdd(false)
      fetchCompanies()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add company.')
    } finally {
      setAdding(false)
    }
  }

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const enabled  = filtered.filter((c) => c.is_enabled).length

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="page-main max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
            <p className="text-sm text-slate-500">
              {enabled} of {companies.length} companies enabled
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Add company modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Add Company</h2>
                <button onClick={() => setShowAdd(false)}>
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="label">Company name</label>
                  <input className="input" placeholder="e.g. Zepto" value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Careers page URL</label>
                  <input className="input" placeholder="https://company.com/careers" value={newCompany.careers_url}
                    onChange={(e) => setNewCompany({ ...newCompany, careers_url: e.target.value })} />
                </div>
                <div>
                  <label className="label">Scraping method</label>
                  <select className="input" value={newCompany.scrape_method}
                    onChange={(e) => setNewCompany({ ...newCompany, scrape_method: e.target.value })}>
                    <option value="playwright">Web Scraper (default)</option>
                    <option value="greenhouse">Greenhouse API</option>
                    <option value="lever">Lever API</option>
                    <option value="workday">Workday</option>
                    <option value="manual">Manual (link only)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    If the company uses Greenhouse or Lever, select those for better results.
                  </p>
                </div>
                {(newCompany.scrape_method === 'greenhouse' || newCompany.scrape_method === 'lever') && (
                  <div>
                    <label className="label">ATS Slug (company identifier)</label>
                    <input className="input" placeholder="e.g. razorpay"
                      onChange={(e) => setNewCompany({ ...newCompany, ats_slug: e.target.value })} />
                    <p className="text-xs text-slate-400 mt-1">
                      Found in the careers URL, e.g. boards.greenhouse.io/v1/boards/<b>razorpay</b>/jobs
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={adding} className="btn-primary flex-1">
                    {adding ? 'Adding…' : 'Add Company'}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Company list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((company) => {
              const badge = METHOD_BADGE[company.scrape_method] || METHOD_BADGE.playwright
              return (
                <div key={company.id} className={`card p-4 flex items-center gap-3 transition-opacity ${!company.is_enabled ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">{company.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {company.last_scraped && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Last scraped: {new Date(company.last_scraped).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {company.careers_url && (
                      <a href={company.careers_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => toggle(company)} className="text-slate-400 hover:text-brand-600 transition-colors">
                      {company.is_enabled
                        ? <ToggleRight className="w-8 h-8 text-brand-500" />
                        : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="card p-10 text-center text-slate-400">
                No companies found matching "{search}"
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

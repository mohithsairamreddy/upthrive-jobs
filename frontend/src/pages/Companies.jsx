import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Building2, Plus, Search, ExternalLink, X, ToggleLeft, ToggleRight } from 'lucide-react'

const METHOD = {
  greenhouse: { label: 'Greenhouse', color: 'badge-green' },
  lever:      { label: 'Lever',      color: 'badge-blue'  },
  workday:    { label: 'Workday',    color: 'badge-purple' },
  playwright: { label: 'Scraper',    color: 'badge-amber' },
  manual:     { label: 'Manual',     color: 'badge-slate' },
}

function CompanyCard({ company, onToggle }) {
  const m = METHOD[company.scrape_method] || METHOD.playwright

  return (
    <div className={`card p-4 flex items-center gap-3 transition-all duration-150 ${
      !company.is_enabled ? 'opacity-40' : 'hover:border-slate-300'
    }`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-500">
        {company.name[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800 text-sm truncate">{company.name}</span>
          <span className={m.color}>{m.label}</span>
        </div>
        {company.last_scraped && (
          <p className="text-xs text-slate-400 mt-0.5">
            Scraped {new Date(company.last_scraped).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {company.careers_url && (
          <a href={company.careers_url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Open careers page">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={() => onToggle(company)}
          className="p-1 rounded-lg hover:bg-slate-50 transition-colors"
          title={company.is_enabled ? 'Disable' : 'Enable'}>
          {company.is_enabled
            ? <ToggleRight className="w-7 h-7 text-brand-500" />
            : <ToggleLeft  className="w-7 h-7 text-slate-300" />}
        </button>
      </div>
    </div>
  )
}

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')   // all | enabled | disabled
  const [showAdd, setShowAdd]     = useState(false)
  const [newCo, setNewCo]         = useState({ name: '', careers_url: '', scrape_method: 'playwright', ats_slug: '' })
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
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_enabled: newState } : c))
    try {
      await api.post('/companies/toggle', { company_id: company.id, is_enabled: newState })
    } catch {
      toast.error('Failed to update.')
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_enabled: company.is_enabled } : c))
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newCo.name || !newCo.careers_url) { toast.error('Name and URL required.'); return }
    setAdding(true)
    try {
      await api.post('/companies/add', newCo)
      toast.success(`${newCo.name} added!`)
      setNewCo({ name: '', careers_url: '', scrape_method: 'playwright', ats_slug: '' })
      setShowAdd(false)
      fetchCompanies()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add.')
    } finally {
      setAdding(false)
    }
  }

  const filtered = companies
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => filter === 'all' ? true : filter === 'enabled' ? c.is_enabled : !c.is_enabled)

  const enabledCount  = companies.filter(c => c.is_enabled).length
  const disabledCount = companies.length - enabledCount

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-main">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Companies</h1>
            <p className="page-sub">
              <span className="text-emerald-600 font-medium">{enabledCount} enabled</span>
              {disabledCount > 0 && <span className="text-slate-400"> · {disabledCount} disabled</span>}
              <span className="text-slate-400"> · {companies.length} total</span>
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add company
          </button>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" className="input pl-9" placeholder="Search companies…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm bg-white">
            {[['all', 'All'], ['enabled', 'Enabled'], ['disabled', 'Disabled']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-2 font-medium transition-colors ${
                  filter === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {filtered.map(company => (
                <CompanyCard key={company.id} company={company} onToggle={toggle} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="card p-12 text-center col-span-2">
                <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No companies match "{search}"</p>
              </div>
            )}
          </>
        )}

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="card p-6 w-full max-w-md animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-slate-900 text-lg">Add Company</h2>
                <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="label">Company name</label>
                  <input className="input" placeholder="e.g. Zepto"
                    value={newCo.name} onChange={e => setNewCo({ ...newCo, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Careers page URL</label>
                  <input className="input" placeholder="https://company.com/careers"
                    value={newCo.careers_url} onChange={e => setNewCo({ ...newCo, careers_url: e.target.value })} />
                </div>
                <div>
                  <label className="label">Scraping method</label>
                  <select className="input" value={newCo.scrape_method}
                    onChange={e => setNewCo({ ...newCo, scrape_method: e.target.value })}>
                    <option value="playwright">Web Scraper (default)</option>
                    <option value="greenhouse">Greenhouse API</option>
                    <option value="lever">Lever API</option>
                    <option value="manual">Manual link only</option>
                  </select>
                </div>
                {(newCo.scrape_method === 'greenhouse' || newCo.scrape_method === 'lever') && (
                  <div>
                    <label className="label">ATS slug</label>
                    <input className="input" placeholder="e.g. razorpay"
                      value={newCo.ats_slug} onChange={e => setNewCo({ ...newCo, ats_slug: e.target.value })} />
                    <p className="text-xs text-slate-400 mt-1">
                      Found in the URL: boards.greenhouse.io/<b>slug</b>/jobs
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={adding} className="btn-primary flex-1">
                    {adding ? 'Adding…' : 'Add company'}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

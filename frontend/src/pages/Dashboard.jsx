import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { Zap, TrendingUp, Target, RefreshCw, SlidersHorizontal, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, accent = 'brand' }) {
  const accents = {
    brand:   { bg: 'bg-brand-50',   icon: 'text-brand-600',   val: 'text-brand-700'   },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700'   },
  }
  const a = accents[accent] || accents.brand

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${a.val}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 ${a.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${a.icon}`} style={{ width: 18, height: 18 }} />
        </div>
      </div>
    </div>
  )
}

function SkeletonStat() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-slate-100 rounded" />
          <div className="h-8 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
        <div className="w-9 h-9 bg-slate-100 rounded-lg" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-slate-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="flex gap-1">
            {[1,2,3,4].map(i => <div key={i} className="h-5 w-14 bg-slate-100 rounded-full" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [matches, setMatches]   = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ min_score: '', location: '', job_type: '' })
  const [page, setPage]         = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, page_size: 20 }
      if (filters.min_score) params.min_score = filters.min_score
      if (filters.location)  params.location  = filters.location
      if (filters.job_type)  params.job_type  = filters.job_type

      const [matchRes, statsRes] = await Promise.all([
        api.get('/jobs/matches', { params }),
        api.get('/jobs/stats'),
      ])
      setMatches(matchRes.data.matches || [])
      setStats(statsRes.data)
      setPage(p)
      setLastUpdated(new Date())
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(detail ? `Failed to load: ${detail}` : 'Failed to load matches.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(1) }, [])

  const applyFilters = (e) => { e.preventDefault(); fetchData(1) }
  const clearFilters = () => { setFilters({ min_score: '', location: '', job_type: '' }); fetchData(1) }

  const firstName = user?.email?.split('@')[0] || 'there'
  const greeting  = new Date().getHours() < 12 ? 'Good morning' :
                    new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="app-shell bg-slate-50">
      <Navbar />
      <main className="page-main">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="page-title">{greeting}, {firstName}</h1>
            <p className="page-sub flex items-center gap-2">
              Jobs refreshed daily at 7:00 AM IST
              {lastUpdated && (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchData(page)}
            disabled={loading}
            className="btn-secondary gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {loading && !stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <SkeletonStat /><SkeletonStat /><SkeletonStat />
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={Zap}
              label="Today's matches"
              value={stats.today_matches}
              sub="New since last run"
              accent="brand"
            />
            <StatCard
              icon={TrendingUp}
              label={`Last ${stats.retention_days} days`}
              value={stats.total_matches}
              sub={stats.avg_score > 0 ? `avg ${stats.avg_score}% match score` : 'No matches yet'}
              accent="emerald"
            />
            <StatCard
              icon={Target}
              label="Your threshold"
              value={`${stats.threshold}%`}
              sub="Adjust in Settings"
              accent="amber"
            />
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 mb-5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost w-full justify-start gap-2 font-medium text-slate-600"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide filters' : 'Filter results'}
            {(filters.min_score || filters.location || filters.job_type) && (
              <span className="ml-1 badge-brand text-[10px]">Active</span>
            )}
          </button>

          {showFilters && (
            <form onSubmit={applyFilters} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
              <div>
                <label className="label">Min score (%)</label>
                <input type="number" className="input" placeholder="e.g. 75"
                  min="10" max="99" value={filters.min_score}
                  onChange={e => setFilters({ ...filters, min_score: e.target.value })} />
              </div>
              <div>
                <label className="label">Location</label>
                <input type="text" className="input" placeholder="e.g. Bangalore"
                  value={filters.location}
                  onChange={e => setFilters({ ...filters, location: e.target.value })} />
              </div>
              <div>
                <label className="label">Job type</label>
                <select className="input" value={filters.job_type}
                  onChange={e => setFilters({ ...filters, job_type: e.target.value })}>
                  <option value="">All types</option>
                  <option>Full-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                  <option>Part-time</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-3 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Apply filters</button>
                <button type="button" className="btn-secondary text-sm" onClick={clearFilters}>
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 text-lg">No matches yet</p>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              Matches appear after the daily scrape at 7 AM IST.
              Make sure you've uploaded your resume and set target roles in Settings.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{matches.length}</span> matches
                {page > 1 && ` · page ${page}`}
              </p>
            </div>

            <div className="space-y-3">
              {matches.map(m => <JobCard key={m.id} match={m} />)}
            </div>

            {/* Pagination */}
            {(page > 1 || matches.length === 20) && (
              <div className="flex items-center justify-center gap-3 pt-6">
                {page > 1 && (
                  <button className="btn-secondary gap-1.5 text-sm" onClick={() => fetchData(page - 1)}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                )}
                <span className="text-sm text-slate-400 px-2">Page {page}</span>
                {matches.length === 20 && (
                  <button className="btn-secondary gap-1.5 text-sm" onClick={() => fetchData(page + 1)}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

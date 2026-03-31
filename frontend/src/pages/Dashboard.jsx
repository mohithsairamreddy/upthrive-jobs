import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { Zap, TrendingUp, Bell, RefreshCw, SlidersHorizontal, Clock } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sub && <p className="text-xs text-brand-600">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-10 bg-slate-200 rounded-full" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="h-3.5 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 w-14 bg-slate-100 rounded-full" />
            ))}
          </div>
        </div>
        <div className="h-8 w-16 bg-slate-200 rounded-lg flex-shrink-0" />
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
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
      if (detail) {
        toast.error(`Failed to load matches: ${detail}`)
      } else {
        toast.error('Failed to load matches. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(1) }, [])

  const applyFilters = (e) => {
    e.preventDefault()
    fetchData(1)
  }

  const firstName = user?.email?.split('@')[0] || 'there'

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="ml-56 flex-1 p-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Job matches — updated daily at 7:30 AM IST
              {lastUpdated && (
                <span className="ml-2 inline-flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  Last refreshed {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchData(page)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {loading && !stats ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatSkeleton /><StatSkeleton /><StatSkeleton />
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard icon={Zap}       label="Today's matches"  value={stats.today_matches} />
            <StatCard
              icon={TrendingUp}
              label={`Last ${stats.retention_days} days`}
              value={stats.total_matches}
              sub={stats.avg_score > 0 ? `avg ${stats.avg_score}% match` : undefined}
            />
            <StatCard icon={Bell} label="Your threshold" value={`${stats.threshold}%`} sub="Change in Settings" />
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide filters' : 'Filter results'}
          </button>

          {showFilters && (
            <form onSubmit={applyFilters} className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="label">Min score (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 75"
                  min="10" max="99"
                  value={filters.min_score}
                  onChange={(e) => setFilters({ ...filters, min_score: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Bangalore"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Job type</label>
                <select
                  className="input"
                  value={filters.job_type}
                  onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
                >
                  <option value="">All types</option>
                  <option>Full-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                  <option>Part-time</option>
                </select>
              </div>
              <div className="col-span-3 flex gap-2">
                <button type="submit" className="btn-primary text-sm">Apply</button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => { setFilters({ min_score: '', location: '', job_type: '' }); fetchData(1) }}
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center">
            <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600 text-lg">No matches yet</p>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
              Matches will appear here after the daily scrape runs. You can trigger it manually from GitHub Actions.
            </p>
            <p className="text-xs text-slate-400 mt-3">
              Make sure you've uploaded your resume and set your target job roles in Settings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => <JobCard key={m.id} match={m} />)}

            {/* Pagination */}
            <div className="flex justify-center gap-2 pt-4">
              {page > 1 && (
                <button className="btn-secondary text-sm" onClick={() => fetchData(page - 1)}>
                  ← Previous
                </button>
              )}
              {matches.length === 20 && (
                <button className="btn-secondary text-sm" onClick={() => fetchData(page + 1)}>
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

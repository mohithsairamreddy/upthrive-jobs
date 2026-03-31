import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Zap, TrendingUp, Bell, RefreshCw, SlidersHorizontal } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
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

export default function Dashboard() {
  const [matches, setMatches]   = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ min_score: '', location: '', job_type: '' })
  const [page, setPage]         = useState(1)
  const [showFilters, setShowFilters] = useState(false)

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
    } catch (err) {
      toast.error('Failed to load matches.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(1) }, [])

  const applyFilters = (e) => {
    e.preventDefault()
    fetchData(1)
  }

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="ml-56 flex-1 p-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Matches</h1>
            <p className="text-sm text-slate-500">Updated daily at 7:30 AM IST</p>
          </div>
          <button
            onClick={() => fetchData(page)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard icon={Zap}       label="Today's matches"  value={stats.today_matches} />
            <StatCard icon={TrendingUp} label={`Last ${stats.retention_days} days`} value={stats.total_matches} sub={`avg ${stats.avg_score}% match`} />
            <StatCard icon={Bell}       label="Your threshold"   value={`${stats.threshold}%`} sub="Change in Settings" />
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
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">No matches yet</p>
            <p className="text-sm mt-1">
              Make sure you've uploaded your resume. New jobs are matched every morning.
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

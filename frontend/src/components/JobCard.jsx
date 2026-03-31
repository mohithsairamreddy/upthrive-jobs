import { MapPin, Briefcase, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function CompanyAvatar({ name, logoUrl }) {
  const [imgError, setImgError] = useState(false)
  const initial = (name || '?')[0].toUpperCase()

  // Generate a deterministic background color from the company name
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
  ]
  const colorIndex = name
    ? name.charCodeAt(0) % colors.length
    : 0

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-lg object-contain border border-slate-100 bg-white flex-shrink-0"
      />
    )
  }

  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors[colorIndex]}`}>
      {initial}
    </div>
  )
}

function ScoreBar({ score }) {
  const barColor =
    score >= 85 ? 'bg-green-500' :
    score >= 70 ? 'bg-blue-500' :
                  'bg-amber-400'
  const textColor =
    score >= 85 ? 'text-green-700' :
    score >= 70 ? 'text-blue-700' :
                  'text-amber-700'

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>{score}%</span>
    </div>
  )
}

function isNewJob(postedAt, scrapedAt) {
  const ref = postedAt || scrapedAt
  if (!ref) return false
  const date = new Date(ref)
  const now = new Date()
  return (now - date) < 24 * 60 * 60 * 1000
}

export default function JobCard({ match }) {
  const [expanded, setExpanded] = useState(false)
  const job = match.jobs || {}
  const company = job.companies || {}
  const keywords = match.matched_keywords || []
  const isNew = isNewJob(job.posted_at, job.scraped_at)

  // Truncate description to ~200 chars
  const desc = job.description || ''
  const shortDesc = desc.length > 200 ? desc.slice(0, 200).trimEnd() + '…' : desc
  const hasLongDesc = desc.length > 200

  return (
    <div className="card p-4 hover:border-brand-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <CompanyAvatar name={company.name} logoUrl={company.logo_url} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isNew && (
                <span className="text-xs font-semibold bg-brand-600 text-white px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
              <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
            </div>
            <p className="text-sm text-brand-600 font-medium mt-0.5">{company.name}</p>

            {/* Match score bar */}
            <div className="mt-1.5">
              <ScoreBar score={match.match_score} />
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {job.location}
                </span>
              )}
              {job.job_type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {job.job_type}
                </span>
              )}
            </div>

            {/* Description */}
            {desc && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {expanded || !hasLongDesc ? desc : shortDesc}
                </p>
                {hasLongDesc && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="text-xs text-brand-500 hover:text-brand-700 mt-0.5 flex items-center gap-0.5"
                  >
                    {expanded
                      ? <><ChevronUp className="w-3 h-3" /> Show less</>
                      : <><ChevronDown className="w-3 h-3" /> Show more</>}
                  </button>
                )}
              </div>
            )}

            {/* Matched keywords */}
            {keywords.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">Matched skills:</p>
                <div className="flex flex-wrap gap-1">
                  {keywords.slice(0, 8).map((kw) => (
                    <span key={kw} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100">
                      {kw}
                    </span>
                  ))}
                  {keywords.length > 8 && (
                    <span className="text-xs text-slate-400 px-1 py-0.5">
                      +{keywords.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 btn-primary text-sm"
        >
          Apply <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}

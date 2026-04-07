import { MapPin, Briefcase, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

function CompanyAvatar({ name, logoUrl }) {
  const [imgError, setImgError] = useState(false)
  const initial = (name || '?')[0].toUpperCase()

  const palettes = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ]
  const palette = name ? palettes[name.charCodeAt(0) % palettes.length] : palettes[0]

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-xl object-contain border border-slate-100 bg-white flex-shrink-0 shadow-sm"
      />
    )
  }

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm ${palette}`}>
      {initial}
    </div>
  )
}

function ScoreBadge({ score }) {
  const { bg, text, ring } =
    score >= 85 ? { bg: 'bg-emerald-500',  text: 'text-white', ring: 'ring-emerald-200' } :
    score >= 70 ? { bg: 'bg-brand-500',    text: 'text-white', ring: 'ring-brand-200'   } :
                  { bg: 'bg-amber-400',    text: 'text-white', ring: 'ring-amber-200'   }

  return (
    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${bg} ring-2 ${ring}
                     flex flex-col items-center justify-center shadow-sm`}>
      <span className={`text-base font-bold leading-none ${text}`}>{score}</span>
      <span className={`text-[9px] font-medium mt-0.5 ${text} opacity-80`}>match</span>
    </div>
  )
}

function JDQualityBadge({ score }) {
  if (score === null || score === undefined) return null
  if (score >= 0.65) return (
    <span className="badge-green text-[10px]">
      <CheckCircle2 className="w-2.5 h-2.5" /> Quality JD
    </span>
  )
  if (score < 0.35) return (
    <span className="badge-amber text-[10px]">
      <AlertTriangle className="w-2.5 h-2.5" /> Vague JD
    </span>
  )
  return null
}

function isNewJob(postedAt, scrapedAt) {
  const ref = postedAt || scrapedAt
  if (!ref) return false
  return (new Date() - new Date(ref)) < 24 * 60 * 60 * 1000
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

export default function JobCard({ match }) {
  const [expanded, setExpanded] = useState(false)
  const job       = match.jobs || {}
  const company   = job.companies || {}
  const keywords  = match.matched_keywords || []
  const isNew     = isNewJob(job.posted_at, job.scraped_at)
  const posted    = timeAgo(job.posted_at || job.scraped_at)

  const desc      = job.description || ''
  const shortDesc = desc.length > 220 ? desc.slice(0, 220).trimEnd() + '…' : desc
  const hasMore   = desc.length > 220

  return (
    <div className="card-hover p-4 animate-fade-in">
      <div className="flex items-start gap-3">

        {/* Score badge */}
        <ScoreBadge score={match.match_score} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <CompanyAvatar name={company.name} logoUrl={company.logo_url} />

            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                {isNew && <span className="badge-brand">New</span>}
                <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                  {job.title}
                </h3>
              </div>

              {/* Company + meta */}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm font-medium text-brand-600">{company.name}</span>
                {job.location && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                )}
                {job.job_type && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Briefcase className="w-3 h-3" /> {job.job_type}
                  </span>
                )}
                {posted && (
                  <span className="text-xs text-slate-400">{posted}</span>
                )}
              </div>

              {/* JD quality + badges row */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <JDQualityBadge score={job.jd_quality_score} />
              </div>
            </div>

            {/* Apply button */}
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
            >
              Apply <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Description */}
          {desc && (
            <div className="mt-2.5 pl-[52px]">
              <p className="text-xs text-slate-500 leading-relaxed">
                {expanded || !hasMore ? desc : shortDesc}
              </p>
              {hasMore && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="btn-ghost text-xs px-0 py-0.5 mt-0.5 text-brand-500"
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
            <div className="mt-3 pl-[52px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Matched skills
              </p>
              <div className="flex flex-wrap gap-1">
                {keywords.slice(0, 10).map(kw => (
                  <span key={kw} className="badge-blue text-[10px]">{kw}</span>
                ))}
                {keywords.length > 10 && (
                  <span className="text-xs text-slate-400 self-center">
                    +{keywords.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

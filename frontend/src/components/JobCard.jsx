import { MapPin, Briefcase, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function ScoreBadge({ score }) {
  const color =
    score >= 85 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 70 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-full border ${color}`}>
      {score}% match
    </span>
  )
}

export default function JobCard({ match }) {
  const [expanded, setExpanded] = useState(false)
  const job = match.jobs || {}
  const company = job.companies || {}
  const keywords = match.matched_keywords || []

  return (
    <div className="card p-4 hover:border-brand-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
            <ScoreBadge score={match.match_score} />
          </div>
          <p className="text-sm text-brand-600 font-medium mt-0.5">{company.name}</p>

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

          {/* Matched keywords */}
          {keywords.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">Matched skills:</p>
              <div className="flex flex-wrap gap-1">
                {keywords.slice(0, expanded ? keywords.length : 6).map((kw) => (
                  <span key={kw} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100">
                    {kw}
                  </span>
                ))}
                {keywords.length > 6 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-slate-400 flex items-center gap-0.5 hover:text-slate-600"
                  >
                    {expanded ? (
                      <><ChevronUp className="w-3 h-3" /> Less</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> +{keywords.length - 6} more</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
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

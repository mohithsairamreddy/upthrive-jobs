import { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function ResumeUpload() {
  const [resume, setResume]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef()

  const fetchResume = async () => {
    try {
      const { data } = await api.get('/resume/')
      setResume(data)
    } catch {
      setResume(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchResume() }, [])

  const handleUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      toast.error('Only PDF and DOCX files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB.')
      return
    }
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const { data } = await api.post('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`Resume parsed! ${data.skills_found} skills found.`)
      fetchResume()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete your resume? This will stop future job matching.')) return
    await api.delete('/resume/')
    toast.success('Resume deleted.')
    setResume(null)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-main max-w-3xl">

        <div className="page-header">
          <div>
            <h1 className="page-title">Resume</h1>
            <p className="page-sub">Upload your PDF or DOCX. Parsed automatically for ATS matching.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resume ? (
          <div className="space-y-4">
            {/* Resume info card */}
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{resume.file_name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {[
                      resume.education,
                      resume.experience_years > 0 && `${resume.experience_years} yrs exp`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => inputRef.current.click()}
                    className="btn-secondary text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detected skills */}
            {resume.parsed_skills?.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <h3 className="font-semibold text-slate-800">
                    Detected Skills
                    <span className="ml-2 badge-brand">{resume.parsed_skills.length}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resume.parsed_skills.map(s => (
                    <span key={s} className="badge-blue">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Detected titles */}
            {resume.job_titles?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Detected Job Titles</h3>
                <div className="flex flex-wrap gap-1.5">
                  {resume.job_titles.map(t => (
                    <span key={t} className="badge-slate">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>If your resume is image-based or scanned, the parser may miss some skills. Use a text-based PDF for best results.</p>
            </div>
          </div>
        ) : (
          /* Upload zone */
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current.click()}
            className={`card p-16 text-center cursor-pointer transition-all duration-200 ${
              dragging
                ? 'border-brand-500 bg-brand-50 shadow-md'
                : 'hover:border-brand-300 hover:bg-slate-50 hover:shadow-md'
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${
              dragging ? 'bg-brand-100' : 'bg-slate-100'
            }`}>
              <Upload className={`w-7 h-7 ${dragging ? 'text-brand-600' : 'text-slate-400'}`} />
            </div>
            <p className="font-semibold text-slate-700 text-lg">
              {uploading ? 'Parsing your resume…' : 'Drop resume here or click to browse'}
            </p>
            <p className="text-sm text-slate-400 mt-1">PDF or DOCX · Max 5 MB</p>
            {uploading && (
              <div className="mt-5 flex justify-center">
                <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={e => handleUpload(e.target.files[0])}
        />
      </main>
    </div>
  )
}

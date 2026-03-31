import { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Upload, FileText, Trash2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResumeUpload() {
  const [resume, setResume]   = useState(null)
  const [loading, setLoading] = useState(true)
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
    <div className="flex min-h-screen">
      <Navbar />
      <main className="ml-56 flex-1 p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Resume</h1>
        <p className="text-sm text-slate-500 mb-6">Upload your PDF or DOCX resume. It will be parsed for ATS matching.</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resume ? (
          /* Existing resume */
          <div className="space-y-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{resume.file_name}</p>
                <p className="text-sm text-slate-500">
                  {resume.education && `${resume.education} · `}
                  {resume.experience_years > 0 && `${resume.experience_years} yrs exp`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => inputRef.current.click()} className="btn-secondary text-sm">
                  Replace
                </button>
                <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Parsed skills */}
            {resume.parsed_skills?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-500" /> Detected Skills ({resume.parsed_skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resume.parsed_skills.map((s) => (
                    <span key={s} className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job titles */}
            {resume.job_titles?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-3">Detected Job Titles</h3>
                <div className="flex flex-wrap gap-2">
                  {resume.job_titles.map((t) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>If your resume is image-based or scanned, the parser may miss some skills. Use a text-based PDF for best results.</p>
            </div>
          </div>
        ) : (
          /* Upload zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
            className={`card p-16 text-center cursor-pointer transition-colors ${
              dragging ? 'border-brand-500 bg-brand-50' : 'hover:border-brand-300 hover:bg-slate-50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragging ? 'text-brand-500' : 'text-slate-300'}`} />
            <p className="font-semibold text-slate-700">
              {uploading ? 'Parsing resume…' : 'Drop your resume here or click to browse'}
            </p>
            <p className="text-sm text-slate-400 mt-1">PDF or DOCX · Max 5 MB</p>
            {uploading && (
              <div className="mt-4 flex justify-center">
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
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      </main>
    </div>
  )
}

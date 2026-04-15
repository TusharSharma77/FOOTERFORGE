import { useState, useRef, useCallback } from 'react'
import './App.css'

export default function App() {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [enrollment, setEnrollment] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [downloadName, setDownloadName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setErrorMsg('Please upload a valid PDF file.')
      setStatus('error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10 MB limit.')
      setStatus('error')
      return
    }
    setFile(f)
    setStatus('idle')
    setErrorMsg('')
    setDownloadUrl(null)
  }, [])

  const onFileChange = (e) => handleFile(e.target.files?.[0])
  const onDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]) }
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const removeFile = () => {
    setFile(null); setDownloadUrl(null); setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setErrorMsg('Please upload a PDF file.'); setStatus('error'); return }
    if (!name.trim()) { setErrorMsg('Please enter your name.'); setStatus('error'); return }
    if (!enrollment.trim()) { setErrorMsg('Please enter your enrollment number.'); setStatus('error'); return }

    setStatus('loading'); setErrorMsg('')

    const formData = new FormData()
    formData.append('pdf', file)
    formData.append('name', name.trim())
    formData.append('enrollmentNumber', enrollment.trim())

    try {
      const res = await fetch('/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error: ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const dName = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'modified.pdf'
      setDownloadUrl(url); setDownloadName(dName); setStatus('success')
    } catch (err) {
      setErrorMsg(err.message); setStatus('error')
    }
  }

  const reset = () => {
    setFile(null); setName(''); setEnrollment('')
    setStatus('idle'); setErrorMsg(''); setDownloadUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isLoading = status === 'loading'

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬚</span>
            <span className="logo-text">FooterForge</span>
          </div>
          <p className="header-tagline">Stamp your PDFs with precision</p>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1 className="hero-title">Replace PDF Footers<br /><em>in seconds.</em></h1>
          <p className="hero-sub">Upload any PDF, enter your name and enrollment number, and receive a beautifully stamped document ready to download.</p>
        </section>

        <div className="card">
          {status === 'success' ? (
            <SuccessPanel
              downloadUrl={downloadUrl} downloadName={downloadName}
              onReset={reset} name={name} enrollment={enrollment} fileName={file?.name}
            />
          ) : (
            <form className="form" onSubmit={handleSubmit} noValidate>
              {/* Drop Zone */}
              <div
                className={`drop-zone${isDragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
                onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="application/pdf"
                  onChange={onFileChange} className="hidden-input" />
                {file ? (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button type="button" className="remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeFile() }}>✕</button>
                  </div>
                ) : (
                  <div className="drop-prompt">
                    <span className="drop-icon">⬆</span>
                    <p className="drop-text"><strong>Drop your PDF here</strong><br />or click to browse</p>
                    <span className="drop-limit">PDF only · Max 10 MB</span>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="fields">
                <div className="field">
                  <label className="label" htmlFor="name">Full Name</label>
                  <input id="name" type="text" className="input" placeholder="e.g. Arjun Sharma"
                    value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} autoComplete="name" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="enrollment">Enrollment Number</label>
                  <input id="enrollment" type="text" className="input mono" placeholder="e.g. 21CS10045"
                    value={enrollment} onChange={(e) => setEnrollment(e.target.value)} disabled={isLoading} />
                </div>
              </div>

              {/* Footer preview */}
              {(name || enrollment) && (
                <div className="preview-strip">
                  <span className="preview-label">Footer preview</span>
                  <span className="preview-text mono">
                    Name: {name || '—'}{'   '}|{'   '}Enrollment: {enrollment || '—'}
                  </span>
                </div>
              )}

              {/* Error */}
              {status === 'error' && (
                <div className="alert alert-error"><span>⚠</span> {errorMsg}</div>
              )}

              {/* Submit */}
              <button type="submit" className={`btn-primary${isLoading ? ' loading' : ''}`} disabled={isLoading}>
                {isLoading ? (<><span className="spinner" />Processing PDF…</>) : (<><span>⬦</span> Stamp Footer</>)}
              </button>
            </form>
          )}
        </div>

        {/* Steps */}
        <section className="steps">
          {[
            { num: '01', title: 'Upload', desc: 'Drop in any PDF up to 10 MB' },
            { num: '02', title: 'Fill details', desc: 'Enter name & enrollment number' },
            { num: '03', title: 'Download', desc: 'Get your stamped PDF instantly' },
          ].map((s) => (
            <div className="step" key={s.num}>
              <span className="step-num">{s.num}</span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <p>Built with pdf-lib · Express · React · Vite</p>
      </footer>
    </div>
  )
}

function SuccessPanel({ downloadUrl, downloadName, onReset, name, enrollment, fileName }) {
  return (
    <div className="success-panel">
      <div className="success-icon">✓</div>
      <h2 className="success-title">PDF Ready!</h2>
      <p className="success-sub">Footer stamped on <strong>{fileName}</strong></p>
      <div className="success-footer-preview mono">
        Name: {name}{'   '}|{'   '}Enrollment: {enrollment}
      </div>
      <a href={downloadUrl} download={downloadName} className="btn-primary download-btn">
        ⬇ Download Modified PDF
      </a>
      <button className="btn-ghost" onClick={onReset}>Process another PDF</button>
    </div>
  )
}

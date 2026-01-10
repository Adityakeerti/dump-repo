import React, { useEffect, useMemo, useState } from 'react'
import './MarksheetPage.css'
import { getAuth } from '../utils/authStorage'

// Use same hostname as current page but port 8000 for OCR backend
const API_BASE = `http://${window.location.hostname}:8000`
const API_URL = `${API_BASE}/process`
import MarksheetHistory from '../components/MarksheetHistory'

export default function MarksheetPage() {
    const [authed, setAuthed] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [step, setStep] = useState('COURSE')
    const [course, setCourse] = useState('UG')
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [data10, setData10] = useState(null)
    const [data12, setData12] = useState(null)
    const [progress, setProgress] = useState(0)
    const [verified, setVerified] = useState(false)
    const [semCount, setSemCount] = useState('')
    const [semCursor, setSemCursor] = useState(1)
    const [semesterResults, setSemesterResults] = useState({})
    const [currentResult, setCurrentResult] = useState(null)
    const [prevStep, setPrevStep] = useState(null)
    const [currentResultType, setCurrentResultType] = useState(null)
    const [lastMainStep, setLastMainStep] = useState('COURSE')
    const [existingDocs, setExistingDocs] = useState([]) // Array of strings: '10', '12', 'sem-X'

    // Auto-authenticate from student-specific localStorage on mount
    useEffect(() => {
        const { token, user } = getAuth('student')
        if (token && user) {
            setUserEmail(user.email || user.username || 'student@college.edu')
            setAuthed(true)
        }
    }, [])

    const onContinue = async () => {
        setError(null)
        if (step === 'COURSE') {
            if (course === 'PG') {
                alert('Postgraduate flow will be added later.')
                return
            }
            setLastMainStep('HISTORY')
            setStep('HISTORY')
            return
        }
        if (step === 'UPLOAD_10' || step === 'UPLOAD_12' || step === 'UPLOAD_SEM' || step === 'UPLOAD_SINGLE') {
            if (!file) { setError('Please upload a file.'); return }
            const uploadStep = step
            setPrevStep(step)
            setStep('PROCESS')
            setLoading(true)
            setProgress(0)
            try {
                const form = new FormData()
                form.append('file', file)
                let url = API_URL
                if (uploadStep === 'UPLOAD_SEM' || (uploadStep === 'UPLOAD_SINGLE' && currentResultType === 'sem')) {
                    const semRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][semCursor - 1] || 'I'
                    url = `${API_URL}?mode=college&expected_sem=${semRoman}`
                }
                const res = await fetch(url, { method: 'POST', body: form })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error || 'Processing failed')

                if (uploadStep === 'UPLOAD_10') {
                    setData10(json)
                    setCurrentResult(json)
                    setCurrentResultType('10')
                } else if (uploadStep === 'UPLOAD_12') {
                    setData12(json)
                    setCurrentResult(json)
                    setCurrentResultType('12')
                } else if (uploadStep === 'UPLOAD_SEM') {
                    setSemesterResults(prev => ({ ...prev, [semCursor]: json }))
                    setCurrentResult(json)
                    setCurrentResultType('sem')
                } else if (uploadStep === 'UPLOAD_SINGLE') {
                    setCurrentResult(json)
                }
                setStep('PREVIEW')
            } catch (e) {
                setError(e?.message || 'Network error')
                setStep(uploadStep)
            } finally {
                setLoading(false)
                setProgress(100)
            }
            return
        }
        if (step === 'PREVIEW') {
            if (!verified) { setError('Please verify the information to continue.'); return }

            if (prevStep === 'UPLOAD_SINGLE') {
                try {
                    const marksheets = [{
                        ...currentResult,
                        filename: currentResult.server_filename || 'upload.jpg',
                        type_identifier: currentResultType === 'sem' ? 'SEMESTER' : (currentResultType + 'TH'),
                        semester_override: currentResultType === 'sem' ? semCursor : undefined
                    }]
                    const response = await fetch(`${API_BASE}/submit_marksheets`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_email: userEmail, marksheets: marksheets })
                    })
                    if (!response.ok) throw new Error('Submission failed')
                    setStep('SUCCESS')
                } catch (e) { setError(e.message) }
                return
            }

            if (currentResultType === 'sem') {
                const next = semCursor + 1
                const semNum = parseInt(semCount.trim() || '1', 10) || 1
                if (next <= Math.max(1, semNum - 1)) {
                    setLastMainStep('UPLOAD_SEM')
                    setSemCursor(next)
                    setCurrentResult(null)
                    setCurrentResultType(null)
                    setFile(null)
                    setVerified(false)
                    setStep('UPLOAD_SEM')
                    return
                }
                setCurrentResult(null)
                setCurrentResultType(null)
                setStep('REVIEW_ALL')
                return
            }

            if (currentResultType === '10') {
                setLastMainStep('UPLOAD_12')
                setStep('UPLOAD_12')
                setFile(null)
                setVerified(false)
                setCurrentResult(null)
                setCurrentResultType(null)
                return
            }

            if (currentResultType === '12') {
                setLastMainStep('SEM_INPUT')
                setStep('SEM_INPUT')
                setFile(null)
                setVerified(false)
                setCurrentResult(null)
                setCurrentResultType(null)
                return
            }
        }
        if (step === 'SEM_INPUT') {
            const semNum = parseInt(semCount.trim(), 10)
            if (!semCount.trim() || isNaN(semNum)) {
                setError('Please enter your current semester number.')
                return
            }
            if (semNum < 2) {
                setError('Current semester must be at least 2 to upload previous semesters.')
                return
            }
            setLastMainStep('UPLOAD_SEM')
            setSemCursor(1)
            setStep('UPLOAD_SEM')
            return
        }
        if (step === 'REVIEW_ALL') {
            if (!verified) { setError('Please verify all information before submitting.'); return }

            try {
                const marksheets = []
                if (data10) marksheets.push({ ...data10, filename: data10.server_filename || '10th_marksheet.jpg', type_identifier: '10TH' })
                if (data12) marksheets.push({ ...data12, filename: data12.server_filename || '12th_marksheet.jpg', type_identifier: '12TH' })
                Object.entries(semesterResults).forEach(([sem, data]) => {
                    marksheets.push({ ...data, filename: data.server_filename || `semester_${sem}_marksheet.jpg`, type_identifier: 'SEMESTER', semester_override: sem })
                })

                const response = await fetch(`${API_BASE}/submit_marksheets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: userEmail,
                        marksheets: marksheets
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.detail || 'Failed to submit marksheets')
                }

                setStep('SUCCESS')
            } catch (e) {
                setError(e.message || 'Failed to submit marksheets')
            }
            return
        }
    }

    useEffect(() => {
        if (step !== 'PROCESS' || !loading) return
        const totalMs = 30000
        const start = Date.now()
        let raf
        const tick = () => {
            const elapsed = Date.now() - start
            const pct = Math.min(99, Math.floor((elapsed / totalMs) * 100))
            setProgress(pct)
            if (pct < 99 && loading && step === 'PROCESS') {
                raf = requestAnimationFrame(tick)
            }
        }
        raf = requestAnimationFrame(tick)
        return () => { cancelAnimationFrame(raf) }
    }, [loading, step])


    const goBack = () => {
        if (step === 'PREVIEW') {
            if (prevStep === 'UPLOAD_SINGLE') {
                setStep('UPLOAD_SINGLE')
                setVerified(false)
                return
            }
            if (currentResultType === '10') {
                setLastMainStep('UPLOAD_10')
                setStep('UPLOAD_10')
                setCurrentResult(null)
                setCurrentResultType(null)
                setFile(null)
            } else if (currentResultType === '12') {
                setLastMainStep('UPLOAD_12')
                setStep('UPLOAD_12')
                setCurrentResult(null)
                setCurrentResultType(null)
                setFile(null)
            } else if (currentResultType === 'sem') {
                setLastMainStep('UPLOAD_SEM')
                setStep('UPLOAD_SEM')
                setCurrentResult(null)
                setCurrentResultType(null)
                setFile(null)
            }
            setVerified(false)
            return
        }
        if (step === 'PROCESS') {
            if (prevStep) {
                setLastMainStep(prevStep)
                setStep(prevStep)
                setPrevStep(null)
                setFile(null)
                setLoading(false)
                return
            }
            setLastMainStep('UPLOAD_10')
            setFile(null)
            setLoading(false)
            return setStep('UPLOAD_10')
        }
        if (step === 'UPLOAD_SELECTION') return setStep('HISTORY')
        if (step === 'SEM_INPUT_SINGLE') return setStep('UPLOAD_SELECTION')
        if (step === 'UPLOAD_SINGLE') {
            if (currentResultType === 'sem') return setStep('SEM_INPUT_SINGLE')
            return setStep('UPLOAD_SELECTION')
        }
        if (step === 'REVIEW_ALL') {
            if (Object.keys(semesterResults).length > 0) {
                const lastSem = Math.max(...Object.keys(semesterResults).map(Number))
                setSemCursor(lastSem)
                setLastMainStep('UPLOAD_SEM')
                setStep('UPLOAD_SEM')
                setFile(null)
            } else {
                setLastMainStep('SEM_INPUT')
                setStep('SEM_INPUT')
            }
            setVerified(false)
            return
        }
        if (step === 'UPLOAD_SEM') {
            setLastMainStep('SEM_INPUT')
            setFile(null)
            return setStep('SEM_INPUT')
        }
        if (step === 'SEM_INPUT') {
            setLastMainStep('UPLOAD_12')
            return setStep('UPLOAD_12')
        }
        if (step === 'UPLOAD_12') {
            setLastMainStep('UPLOAD_10')
            setFile(null)
            return setStep('UPLOAD_10')
        }
        if (step === 'UPLOAD_10') {
            setLastMainStep('COURSE')
            setFile(null)
            return setStep('COURSE')
        }
    }

    if (!authed) {
        return <Login onSuccess={(email) => {
            localStorage.setItem('token', 'mock_token')
            localStorage.setItem('user', JSON.stringify({ email: email, username: email.split('@')[0] }))
            setAuthed(true)
            setUserEmail(email)
        }} />
    }

    return (
        <div className="marksheet-page">
            {step === 'HISTORY' ? (
                <MarksheetHistory
                    email={userEmail}
                    onBack={() => setStep('COURSE')}
                    onUploadNew={(existing) => {
                        setExistingDocs(existing || []);
                        setStep('UPLOAD_SELECTION')
                    }}
                />
            ) : step !== 'SUCCESS' && (
                <>
                    <TopNav showBack={step !== 'COURSE'} onBack={goBack} />
                    <div className="container">
                        <Hero />
                        <StepIndicator current={step} lastMainStep={lastMainStep} />

                        <div className="bento">
                            <section className={"card " + ((step === 'COURSE' || step === 'SEM_INPUT') ? 'bento-a' : 'bento-full')}>
                                {step === 'COURSE' && (
                                    <div style={{ display: 'grid', gap: 20 }}>
                                        <h3 style={{ margin: 0 }}>Select Course</h3>
                                        <div className="pill-toggle" style={{ marginTop: 4 }}>
                                            <button className={"pill-btn " + (course === 'UG' ? 'active' : '')} onClick={() => setCourse('UG')}>Undergraduate</button>
                                            <button className={"pill-btn " + (course === 'PG' ? 'active' : '')} onClick={() => setCourse('PG')}>Postgraduate</button>
                                        </div>
                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                            <button className="ocr-btn-secondary" style={{ width: '100%' }} onClick={() => setStep('HISTORY')}>
                                                📂 View My Marksheets
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {step === 'UPLOAD_10' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>Upload 10th Marksheet</h3>
                                        <Dropzone onFile={(f) => setFile(f)} currentFile={file} />
                                        {error && <div className="error-box">Error: {error}</div>}
                                    </div>
                                )}

                                {step === 'UPLOAD_SELECTION' && (
                                    <div style={{ display: 'grid', gap: 24, textAlign: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Select Document Type</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <button
                                                className="pill-btn primary-hover"
                                                style={{ height: '80px', fontSize: '1.1rem', opacity: existingDocs.includes('10') ? 0.5 : 1, cursor: existingDocs.includes('10') ? 'not-allowed' : 'pointer' }}
                                                disabled={existingDocs.includes('10')}
                                                onClick={() => { setCurrentResultType('10'); setStep('UPLOAD_SINGLE'); }}
                                            >
                                                10th Marksheet
                                                {existingDocs.includes('10') && <div style={{ fontSize: '0.7rem' }}>(Already Uploaded)</div>}
                                            </button>
                                            <button
                                                className="pill-btn primary-hover"
                                                style={{ height: '80px', fontSize: '1.1rem', opacity: existingDocs.includes('12') ? 0.5 : 1, cursor: existingDocs.includes('12') ? 'not-allowed' : 'pointer' }}
                                                disabled={existingDocs.includes('12')}
                                                onClick={() => { setCurrentResultType('12'); setStep('UPLOAD_SINGLE'); }}
                                            >
                                                12th Marksheet
                                                {existingDocs.includes('12') && <div style={{ fontSize: '0.7rem' }}>(Already Uploaded)</div>}
                                            </button>
                                            <button className="pill-btn primary-hover" style={{ gridColumn: '1/-1', height: '60px', marginTop: 8 }} onClick={() => { setCurrentResultType('sem'); setStep('SEM_INPUT_SINGLE'); }}>
                                                Semester Marksheet
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 'SEM_INPUT_SINGLE' && (
                                    <div style={{ display: 'grid', gap: 24, textAlign: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Select Semester</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                                const isExists = existingDocs.includes(`sem-${sem}`);
                                                return (
                                                    <button
                                                        key={sem}
                                                        className="pill-btn primary-hover"
                                                        style={{ height: '60px', fontSize: '1.1rem', opacity: isExists ? 0.5 : 1, cursor: isExists ? 'not-allowed' : 'pointer' }}
                                                        disabled={isExists}
                                                        onClick={() => {
                                                            setSemCursor(sem);
                                                            setCurrentResultType('sem');
                                                            setStep('UPLOAD_SINGLE');
                                                        }}
                                                    >
                                                        {sem}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {step === 'UPLOAD_SINGLE' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>
                                            Upload {currentResultType === 'sem' ? `Semester ${semCursor}` : currentResultType + 'th'} Marksheet
                                        </h3>
                                        <Dropzone onFile={(f) => setFile(f)} currentFile={file} />
                                        {error && <div className="error-box">Error: {error}</div>}
                                    </div>
                                )}
                                {step === 'SEM_INPUT' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>Current Semester</h3>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <label className="input-label">Enter your current semester (number)</label>
                                            <input
                                                className="edit-input"
                                                type="number"
                                                min={1}
                                                value={semCount}
                                                onChange={e => {
                                                    const val = e.target.value
                                                    setSemCount(val)
                                                    setError(null)
                                                }}
                                                placeholder="e.g., 3, 4, 5..."
                                            />
                                            {semCount.trim() && !isNaN(parseInt(semCount.trim(), 10)) && (
                                                <div className="info-box">
                                                    You will upload semester marksheets from 1 to {Math.max(1, parseInt(semCount.trim(), 10) - 1)}.
                                                </div>
                                            )}
                                        </div>
                                        {error && <div className="error-box">Error: {error}</div>}
                                    </div>
                                )}
                                {step === 'UPLOAD_SEM' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>Upload Semester {semCursor} Marksheet</h3>
                                        <Dropzone onFile={(f) => setFile(f)} currentFile={file} />
                                        {error && <div className="error-box">Error: {error}</div>}
                                    </div>
                                )}
                                {step === 'PROCESS' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>Processing</h3>
                                        <div className="process-box" style={{ display: 'grid', gap: 16, padding: '20px 0' }}>
                                            <ProgressBar percent={progress} />
                                            <p className="muted-text" style={{ margin: 0, textAlign: 'center' }}>Extracting text from your document…</p>
                                        </div>
                                    </div>
                                )}
                                {step === 'PREVIEW' && (
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <h3 style={{ margin: 0 }}>Preview</h3>
                                        {!currentResult && (
                                            <div className="muted-text" style={{ padding: '24px', textAlign: 'center' }}>No data available.</div>
                                        )}
                                        {currentResult && (
                                            <>
                                                {currentResultType === '10' && <Preview data={currentResult} />}
                                                {currentResultType === '12' && <Preview data={currentResult} />}
                                                {currentResultType === 'sem' && (
                                                    <CollegePreview data={currentResult} semester={semCursor} />
                                                )}
                                                <div className="verify-box">
                                                    <label className="verify-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={verified}
                                                            onChange={e => setVerified(e.target.checked)}
                                                        />
                                                        <span>I verify that the above information is correct.</span>
                                                    </label>
                                                </div>
                                                {error && <div className="error-box">Error: {error}</div>}
                                            </>
                                        )}
                                    </div>
                                )}
                                {step === 'REVIEW_ALL' && (
                                    <div style={{ display: 'grid', gap: 24 }}>
                                        <h3 style={{ margin: 0 }}>Review All Marksheets</h3>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            {data10 && (
                                                <CollapsibleMarksheet
                                                    title="10th Marksheet"
                                                    preview={<Preview data={data10} compact />}
                                                    full={<Preview data={data10} />}
                                                />
                                            )}
                                            {data12 && (
                                                <CollapsibleMarksheet
                                                    title="12th Marksheet"
                                                    preview={<Preview data={data12} compact />}
                                                    full={<Preview data={data12} />}
                                                />
                                            )}
                                            {Object.entries(semesterResults).map(([sem, data]) => (
                                                <CollapsibleMarksheet
                                                    key={sem}
                                                    title={`Semester ${sem} Marksheet`}
                                                    preview={<CollegePreview data={data} semester={parseInt(sem)} compact />}
                                                    full={<CollegePreview data={data} semester={parseInt(sem)} />}
                                                />
                                            ))}
                                        </div>
                                        <div className="verify-box">
                                            <label className="verify-label">
                                                <input
                                                    type="checkbox"
                                                    checked={verified}
                                                    onChange={e => setVerified(e.target.checked)}
                                                />
                                                <span>I verify that all information is correct and ready to submit.</span>
                                            </label>
                                        </div>
                                        {error && <div className="error-box">Error: {error}</div>}
                                    </div>
                                )}
                                {step !== 'SUCCESS' && step !== 'UPLOAD_SELECTION' && step !== 'SEM_INPUT_SINGLE' && (
                                    <div className="center">
                                        <button className="primary" onClick={onContinue} disabled={loading}>
                                            {step === 'COURSE' && 'Continue'}
                                            {step === 'UPLOAD_10' && (loading ? 'Processing…' : 'Process')}
                                            {step === 'UPLOAD_12' && (loading ? 'Processing…' : 'Process')}
                                            {step === 'SEM_INPUT' && 'Continue'}
                                            {step === 'UPLOAD_SEM' && (loading ? 'Processing…' : 'Process')}
                                            {step === 'PROCESS' && 'Processing…'}
                                            {step === 'PREVIEW' && 'Continue'}
                                            {step === 'REVIEW_ALL' && 'Submit'}
                                            {step === 'UPLOAD_SINGLE' && (loading ? 'Processing…' : 'Process')}
                                        </button>
                                    </div>
                                )}
                            </section>
                            {(step === 'COURSE' || step === 'SEM_INPUT') && (
                                <section className="card bento-b">
                                    <h3>Guidance</h3>
                                    <ul className="guidance-list">
                                        <li>Use high-quality scans for best results.</li>
                                        <li>Supported: images or PDFs under 10MB.</li>
                                        <li>Preview supports inline editing before you submit.</li>
                                    </ul>
                                </section>
                            )}
                        </div>
                    </div>
                </>
            )}
            {step === 'SUCCESS' && (
                <SuccessAnimation onFinish={() => setStep('HISTORY')} />
            )}
        </div>
    )
}

function SuccessAnimation({ onFinish }) {
    return (
        <div className="modal-backdrop">
            <div className="modal success-modal">
                <div className="success-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h2>Submission Successful!</h2>
                <p>All marksheets have been processed and saved successfully.</p>
                <div style={{ marginTop: 24 }}>
                    <button className="primary" onClick={onFinish}>Go to Dashboard</button>
                </div>
                <div className="powered-by">
                    Powered by 404 Founders
                </div>
            </div>
        </div>
    )
}

function StepIndicator({ current, lastMainStep }) {
    const stepNames = {
        'COURSE': 'Course',
        'UPLOAD_10': '10th',
        'UPLOAD_12': '12th',
        'SEM_INPUT': 'Semester',
        'UPLOAD_SEM': 'Upload',
        'PROCESS': 'Process',
        'PREVIEW': 'Preview',
        'REVIEW_ALL': 'Review',
        'SUCCESS': 'Success'
    }
    const mainSteps = ['COURSE', 'UPLOAD_10', 'UPLOAD_12', 'SEM_INPUT', 'UPLOAD_SEM']
    const activeMainStep = (current === 'PROCESS' || current === 'PREVIEW' || current === 'REVIEW_ALL' || current === 'SUCCESS')
        ? lastMainStep
        : (mainSteps.includes(current) ? current : lastMainStep)

    return (
        <div className="steps">
            {mainSteps.map((s, i) => (
                <React.Fragment key={s}>
                    <div className={"step " + (activeMainStep === s ? 'active' : '')}>
                        <div className="dot" /> <span>{stepNames[s] || s}</span>
                    </div>
                    {i < mainSteps.length - 1 && <div className="step-line" />}
                </React.Fragment>
            ))}
        </div>
    )
}

function lerpColor(a, b, t) {
    const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]
    const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]
    const pc = pa.map((av, i) => Math.round(av + (pb[i] - av) * t))
    const toHex = (n) => n.toString(16).padStart(2, '0')
    return `#${toHex(pc[0])}${toHex(pc[1])}${toHex(pc[2])}`
}

function ProgressBar({ percent }) {
    const p = Math.max(0, Math.min(100, percent))
    const color = lerpColor('#3A6FF8', '#22C55E', p / 100)
    return (
        <div className="progress-container">
            <div className="progress-track">
                <div className="progress-fill" style={{ width: `${p}%`, background: color }} />
            </div>
            <div className="progress-text">{p}%</div>
        </div>
    )
}

function TopNav({ showBack, onBack }) {
    return (
        <div className="nav">
            <div style={{ flex: showBack ? 0 : 1, display: 'flex', alignItems: 'center' }}>
                {showBack && (
                    <button className="icon-btn" onClick={onBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                    </button>
                )}
            </div>
            <div className="logo">Marksheet</div>
            <div style={{ flex: showBack ? 0 : 1, minWidth: showBack ? 'auto' : 0 }} />
        </div>
    )
}

function Hero() {
    return (
        <div className="hero">
            <svg className="illus" width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="140" height="90" rx="12" fill="#3A6FF8" opacity="0.2" />
                <rect x="25" y="25" width="110" height="12" rx="6" fill="#3A6FF8" opacity="0.35" />
                <rect x="25" y="45" width="90" height="12" rx="6" fill="#3A6FF8" opacity="0.25" />
                <rect x="25" y="65" width="70" height="12" rx="6" fill="#3A6FF8" opacity="0.25" />
            </svg>
            <h1>Marksheet Data Extraction</h1>
            <p>Digitize academic documents securely & accurately.</p>
        </div>
    )
}

function Dropzone({ onFile, currentFile }) {
    const onChange = (e) => {
        const f = e.target.files?.[0]
        if (f) onFile(f)
    }
    return (
        <label className="dropzone">
            <input type="file" accept="image/*,application/pdf" onChange={onChange} />
            <div className="dz-label">
                {currentFile ? currentFile.name : 'Drop a file here or click to upload'}
            </div>
        </label>
    )
}

function Preview({ data, compact }) {
    const board = (data.board || data?.data?.board || '').toUpperCase()
    const payload = data.data || {}

    const [editable, setEditable] = useState(false)
    const [local, setLocal] = useState(payload)

    const subjects = Array.isArray(local?.subjects) ? local.subjects : []
    const cols = useMemo(() => inferColumns(subjects, board), [subjects, board])

    const onCellChange = (idx, key, value) => {
        const next = [...subjects]
        const row = { ...(next[idx] || {}) }
        row[key] = value
        next[idx] = row
        setLocal({ ...local, subjects: next })
    }

    if (compact) {
        return (
            <div>
                <div className="muted-text" style={{ marginBottom: 8 }}>Board: {board || 'Unknown'}</div>
                <div className="muted-text" style={{ fontSize: 14 }}>{subjects.length} subjects found</div>
            </div>
        )
    }

    return (
        <div>
            <div className="info-card">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Board: {board || 'Unknown'}</div>
                <InfoTable data={payload} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button className="icon-btn" onClick={() => setEditable(e => !e)}>{editable ? 'View' : 'Edit All Fields'}</button>
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            {cols.map(c => <th key={c.key}>{c.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((row, i) => (
                            <tr key={i}>
                                {cols.map(c => (
                                    <td key={c.key}>
                                        {editable ? (
                                            <input className="edit-input" value={(row?.[c.key] ?? '')} onChange={(e) => onCellChange(i, c.key, e.target.value)} />
                                        ) : (
                                            <span>{fmt(row?.[c.key])}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function inferColumns(rows, board) {
    const preferredByBoard = {
        'CBSE': ['code', 'name', 'theory_marks', 'practical_marks', 'total_marks', 'grade'],
        'ICSE': ['code', 'name', 'theory_marks', 'practical_marks', 'total_marks', 'grade', 'marks', 'max', 'percentage'],
        'UK': ['code', 'name', 'theory_marks', 'practical_marks', 'total_marks', 'grade', 'marks_obtained']
    }
    const set = new Set()
    rows.forEach(r => Object.keys(r || {}).forEach(k => set.add(k)))
    const pref = preferredByBoard[board] || []
    const ordered = []
    for (const k of pref) if (set.has(k)) ordered.push(k)
    for (const k of set) if (!ordered.includes(k)) ordered.push(k)
    return ordered.map(k => ({ key: k, label: toTitle(k) }))
}

function toTitle(s) { return s.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase()) }
function fmt(v) { if (v === null || v === undefined) return ''; if (typeof v === 'object') return JSON.stringify(v); return String(v) }

function InfoTable({ data }) {
    const keys = ['student_name', 'roll_number', 'school_name', 'school_code', 'mother_name', 'father_name']
    const rows = keys.filter(k => data && data[k] !== undefined && data[k] !== null && data[k] !== '')
    if (!rows.length) return null
    return (
        <div className="table-wrap">
            <table>
                <tbody>
                    {rows.map(k => (
                        <tr key={k}>
                            <td className="muted-text" style={{ width: 220 }}>{toTitle(k)}</td>
                            <td>{String(data[k])}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function CollegePreview({ data, semester, compact }) {
    const payload = data.data || {}
    const [editable, setEditable] = useState(false)
    const [local, setLocal] = useState(payload)

    const college = local?.college || {}
    const student = local?.student || {}
    const subjects = Array.isArray(local?.subjects) ? local.subjects : []
    const result = local?.result || {}

    const onCellChange = (idx, key, value) => {
        const next = [...subjects]
        const row = { ...(next[idx] || {}) }
        row[key] = value
        next[idx] = row
        setLocal({ ...local, subjects: next })
    }

    const cols = useMemo(() => {
        const set = new Set()
        subjects.forEach(r => Object.keys(r || {}).forEach(k => set.add(k)))
        return Array.from(set).map(k => ({ key: k, label: toTitle(k) }))
    }, [subjects])

    if (compact) {
        return (
            <div>
                <div className="muted-text" style={{ marginBottom: 4 }}>Semester: {college.semester || semester}</div>
                <div className="muted-text" style={{ marginBottom: 8 }}>{subjects.length} subjects | SGPA: {result.sgpa || 'N/A'}</div>
            </div>
        )
    }

    return (
        <div>
            <div className="info-card">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Semester {semester}</div>
                {college.course && <div className="muted-text" style={{ marginBottom: 4 }}>Course: {college.course}</div>}
                {college.semester && <div className="muted-text" style={{ marginBottom: 4 }}>Semester: {college.semester}</div>}
                {college.session && <div className="muted-text" style={{ marginBottom: 4 }}>Session: {college.session}</div>}
            </div>
            <div className="info-card">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Student Information</div>
                {student.name && <div className="muted-text" style={{ marginBottom: 4 }}>Name: {student.name}</div>}
                {student.roll_no && <div className="muted-text" style={{ marginBottom: 4 }}>Roll No: {student.roll_no}</div>}
                {student.enrollment_no && <div className="muted-text" style={{ marginBottom: 4 }}>Enrollment No: {student.enrollment_no}</div>}
                {student.father_name && <div className="muted-text" style={{ marginBottom: 4 }}>Father's Name: {student.father_name}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button className="icon-btn" onClick={() => setEditable(e => !e)}>{editable ? 'View' : 'Edit All Fields'}</button>
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            {cols.map(c => <th key={c.key}>{c.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((row, i) => (
                            <tr key={i}>
                                {cols.map(c => (
                                    <td key={c.key}>
                                        {editable ? (
                                            <input className="edit-input" value={(row?.[c.key] ?? '')} onChange={(e) => onCellChange(i, c.key, e.target.value)} />
                                        ) : (
                                            <span>{fmt(row?.[c.key])}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {result.sgpa && (
                <div className="result-box">
                    <div style={{ fontWeight: 600 }}>SGPA: {result.sgpa}</div>
                    {result.total_credits_registered && <div className="muted-text">Credits Registered: {result.total_credits_registered}</div>}
                    {result.total_credits_earned && <div className="muted-text">Credits Earned: {result.total_credits_earned}</div>}
                    {result.status && <div className="muted-text">Status: {result.status}</div>}
                </div>
            )}
        </div>
    )
}

function CollapsibleMarksheet({ title, preview, full }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div className="collapsible-card">
            <button className="collapsible-header" onClick={() => setExpanded(!expanded)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="collapsible-title">{title}</div>
                    {!expanded && (
                        <div className="collapsible-preview">
                            {preview}
                        </div>
                    )}
                </div>
                <div className="collapsible-icon">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </button>
            {expanded && (
                <div className="collapsible-content">
                    {full}
                </div>
            )}
        </div>
    )
}

function Login({ onSuccess }) {
    const [u, setU] = useState('')
    const [email, setEmail] = useState('')
    const [p, setP] = useState('')
    const [err, setErr] = useState(null)
    const [loading, setLoading] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        if (!u.trim() || !email.trim() || !p.trim()) {
            setErr('Please fill all fields')
            return
        }

        setLoading(true)
        setErr(null)

        try {
            let response = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`)

            if (response.status === 404) {
                response = await fetch(`${API_BASE}/create_user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, email: email })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.detail || 'Failed to create user')
                }
            } else if (!response.ok) {
                throw new Error('Failed to check user')
            }

            if (p === '123') {
                onSuccess(email)
            } else {
                setErr('Invalid password')
            }
        } catch (e) {
            setErr(e.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="marksheet-page">
            <div className="login-page">
                <div className="card login-card">
                    <div className="login-header">
                        <div className="login-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h2>Welcome Back</h2>
                        <p className="muted-text">Sign in to continue to Marksheet Extraction</p>
                    </div>
                    <form onSubmit={submit} className="login-form">
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                className="edit-input"
                                placeholder="Enter your username"
                                value={u}
                                onChange={e => { setU(e.target.value); setErr(null) }}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                className="edit-input"
                                placeholder="Enter your email"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setErr(null) }}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                className="edit-input"
                                placeholder="Enter your password"
                                type="password"
                                value={p}
                                onChange={e => { setP(e.target.value); setErr(null) }}
                                disabled={loading}
                            />
                        </div>
                        {err && (
                            <div className="error-box">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {err}
                            </div>
                        )}
                        <button className="primary login-btn" type="submit" disabled={loading}>
                            {loading ? 'Please wait...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

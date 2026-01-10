import React, { useEffect, useState } from 'react';
import '../pages/MarksheetPage.css';

// Use same hostname as current page but port 8000 for OCR backend
const API_BASE = `http://${window.location.hostname}:8000`;

export default function MarksheetHistory({ email, onBack, onUploadNew }) {
    const [marksheets, setMarksheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarksheet, setSelectedMarksheet] = useState(null);
    const [requestMenu, setRequestMenu] = useState(null); // { id: upload_id, anchor: ... }
    const [correctionData, setCorrectionData] = useState(null); // For Correction Modal

    useEffect(() => {
        if (!email) return;
        fetch(`${API_BASE}/user_marksheets/${email}`)
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : (data.marksheets || []);
                setMarksheets(list);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [email]);

    const handleReqAction = async (action, m) => {
        if (action === 'reupload') {
            const reason = window.prompt("Please provide a reason for re-upload request:\n\n(e.g., 'Uploaded wrong file', 'Image was unclear')");
            if (reason !== null) {
                try {
                    const res = await fetch(`${API_BASE}/api/student/request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            upload_id: m.upload_id,
                            user_email: email,
                            request_type: 'REUPLOAD',
                            message: reason || 'No reason provided'
                        })
                    });
                    if (res.ok) {
                        alert("✅ Re-upload request submitted!\n\nThe admin will review and respond.");
                        // Update local state to show pending
                        setMarksheets(prev => prev.map(ms =>
                            ms.upload_id === m.upload_id
                                ? { ...ms, status: 'VERIFICATION_PENDING', admin_comment: `[STUDENT REQUEST: REUPLOAD] ${reason}` }
                                : ms
                        ));
                    } else {
                        alert("❌ Failed to submit request. Please try again.");
                    }
                } catch (error) {
                    console.error('Error submitting request:', error);
                    alert("❌ Error submitting request. Please try again.");
                }
            }
        } else if (action === 'correction') {
            setCorrectionData(JSON.parse(JSON.stringify(m))); // Deep copy
        }
        setRequestMenu(null);
    };

    const handleUploadNewClick = () => {
        // Collect existing types
        const existing = marksheets.map(m => {
            if (m.marksheet_type === 'SEMESTER') return `sem-${m.semester}`;
            return m.marksheet_type.replace('TH', '');
        });
        if (onUploadNew) onUploadNew(existing);
    };

    return (
        <div className="container history-view">
            <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: 0, background: 'linear-gradient(135deg, var(--ms-accent) 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        My Marksheets
                    </h2>
                    <p className="muted-text" style={{ margin: 0 }}>{email}</p>
                </div>
                <button onClick={handleUploadNewClick} className="primary">
                    + Upload New
                </button>
            </div>

            {loading ? (
                <div className="center"><div className="muted-text">Loading history...</div></div>
            ) : (
                <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {marksheets.map(m => (
                        <div key={m.upload_id} className="card history-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div className="history-thumb-wrapper" style={{ height: '180px', position: 'relative', background: '#f3f4f6' }}>
                                <img
                                    src={`${API_BASE}/uploads/${m.image_url}`}
                                    alt={m.marksheet_type}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=No+Preview'; }}
                                />
                                {/* Color-coded status badge */}
                                <div className="history-status" style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    ...(m.status === 'APPROVED' ? { background: '#10b981', color: 'white' } :
                                        m.status === 'REJECTED' ? { background: '#ef4444', color: 'white' } :
                                            m.status === 'VERIFICATION_PENDING' ? { background: '#f59e0b', color: 'white' } :
                                                { background: 'rgba(255,255,255,0.95)', color: '#6b7280' })
                                }}>
                                    {m.status === 'VERIFICATION_PENDING' ? 'Pending' :
                                        m.status === 'APPROVED' ? '✓ Approved' :
                                            m.status === 'REJECTED' ? '✗ Rejected' :
                                                m.status.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="history-info" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: 'auto' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{m.marksheet_type} ({m.board_type})</h3>
                                    <p className="muted-text" style={{ fontSize: '0.9rem' }}>{m.student_name_extracted || 'Processing...'}</p>
                                    <p className="muted-text" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                        {new Date(m.uploaded_at).toLocaleDateString()}
                                    </p>
                                    {/* Admin comment for rejected marksheets */}
                                    {m.status === 'REJECTED' && m.admin_comment && (
                                        <div style={{
                                            marginTop: '0.75rem', padding: '10px 12px',
                                            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                            borderRadius: '8px', borderLeft: '3px solid #ef4444',
                                            fontSize: '0.85rem'
                                        }}>
                                            <strong style={{ color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                                                ⚠️ Admin Feedback:
                                            </strong>
                                            <span style={{ color: '#7f1d1d' }}>{m.admin_comment}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button className="icon-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelectedMarksheet(m)}>
                                        Details
                                    </button>
                                    <button className="icon-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                        onClick={(e) => setRequestMenu({ id: m.upload_id, target: e.currentTarget, data: m })}>
                                        Request
                                    </button>
                                </div>
                                {requestMenu && requestMenu.id === m.upload_id && (
                                    <div className="popover-menu" style={{
                                        position: 'absolute', bottom: '60px', right: '16px', background: 'white',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', borderRadius: '8px', zIndex: 10, overflow: 'hidden', border: '1px solid var(--ms-border)'
                                    }}>
                                        <button style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ms-text)' }}
                                            onClick={() => handleReqAction('reupload', m)}>
                                            Re-upload (Admin Verify)
                                        </button>
                                        <button style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ms-text)', borderTop: '1px solid #eee' }}
                                            onClick={() => handleReqAction('correction', m)}>
                                            Correction Request
                                        </button>
                                        <button style={{ display: 'block', width: '100%', padding: '4px 16px', textAlign: 'center', border: 'none', background: '#f9fafb', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #eee' }}
                                            onClick={() => setRequestMenu(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {marksheets.length === 0 && (
                        <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '3rem' }} className="card">
                            <h3 style={{ marginBottom: '0.5rem' }}>No marksheets found</h3>
                            <p className="muted-text">Upload your first marksheet to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {selectedMarksheet && (
                <div className="modal-backdrop" onClick={() => setSelectedMarksheet(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>{selectedMarksheet.marksheet_type} Details</h2>
                                <p className="muted-text" style={{ margin: 0 }}>{selectedMarksheet.student_name_extracted} | {selectedMarksheet.roll_number}</p>
                            </div>
                            <button className="icon-btn" onClick={() => setSelectedMarksheet(null)}>Close</button>
                        </div>

                        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Code</th>
                                        <th>Marks</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedMarksheet.marks || []).map((mk, i) => (
                                        <tr key={i}>
                                            <td>{mk.subject_name_raw}</td>
                                            <td>{mk.subject_code || '-'}</td>
                                            <td>{mk.marks_obtained !== null ? mk.marks_obtained : '-'} / {mk.marks_total}</td>
                                            <td>{mk.grade || '-'}</td>
                                        </tr>
                                    ))}
                                    {(selectedMarksheet.marks || []).length === 0 && (
                                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No marks extracted details available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>Original Image</h4>
                            <img
                                src={`${API_BASE}/uploads/${selectedMarksheet.image_url}`}
                                alt="Marksheet Full"
                                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--ms-border)' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {correctionData && (
                <div className="modal-backdrop">
                    <div className="modal" style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Correction Request</h2>
                            <button className="icon-btn" onClick={() => setCorrectionData(null)}>Close</button>
                        </div>
                        <CorrectionForm
                            original={marksheets.find(m => m.upload_id === correctionData.upload_id)}
                            data={correctionData}
                            onChange={setCorrectionData}
                            onSubmit={async () => {
                                try {
                                    const res = await fetch(`${API_BASE}/api/student/request`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            upload_id: correctionData.upload_id,
                                            user_email: email,
                                            request_type: 'CORRECTION',
                                            message: 'Correction request - see attached changes',
                                            correction_data: correctionData
                                        })
                                    });
                                    if (res.ok) {
                                        alert("✅ Correction Request Submitted!\n\nThe admin will review your changes.");
                                        // Update local state
                                        setMarksheets(prev => prev.map(ms =>
                                            ms.upload_id === correctionData.upload_id
                                                ? { ...ms, status: 'VERIFICATION_PENDING', admin_comment: '[STUDENT REQUEST: CORRECTION] See correction data' }
                                                : ms
                                        ));
                                        setCorrectionData(null);
                                    } else {
                                        alert("❌ Failed to submit correction. Please try again.");
                                    }
                                } catch (error) {
                                    console.error('Error submitting correction:', error);
                                    alert("❌ Error submitting correction. Please try again.");
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function CorrectionForm({ original, data, onChange, onSubmit }) {
    const handleMarkChange = (index, field, value) => {
        const newMarks = [...data.marks];
        newMarks[index] = { ...newMarks[index], [field]: value };
        onChange({ ...data, marks: newMarks });
    };

    return (
        <div>
            <div className="info-box" style={{ marginBottom: '1.5rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                <p><strong>Instructions:</strong> Edit values. <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Green</span> = New. <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>Red</span> = Old.</p>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Code</th>
                            <th>Marks Obtained</th>
                            <th>Total</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.marks.map((row, i) => {
                            const origRow = original.marks[i] || {};
                            const isSubjChanged = row.subject_name_raw !== origRow.subject_name_raw;
                            const isCodeChanged = row.subject_code !== origRow.subject_code;
                            const isMarksChanged = String(row.marks_obtained) !== String(origRow.marks_obtained);
                            const isTotalChanged = String(row.marks_total) !== String(origRow.marks_total);
                            const isGradeChanged = row.grade !== origRow.grade;

                            return (
                                <tr key={i}>
                                    <td>
                                        <input
                                            className={"edit-input " + (isSubjChanged ? 'edited-field' : '')}
                                            value={row.subject_name_raw}
                                            onChange={e => handleMarkChange(i, 'subject_name_raw', e.target.value)}
                                        />
                                        {isSubjChanged && <div className="old-val">Was: {origRow.subject_name_raw}</div>}
                                    </td>
                                    <td>
                                        <input
                                            className={"edit-input " + (isCodeChanged ? 'edited-field' : '')}
                                            value={row.subject_code || ''} style={{ width: '80px' }}
                                            onChange={e => handleMarkChange(i, 'subject_code', e.target.value)}
                                        />
                                        {isCodeChanged && <div className="old-val">Was: {origRow.subject_code}</div>}
                                    </td>
                                    <td>
                                        <input
                                            className={"edit-input " + (isMarksChanged ? 'edited-field' : '')}
                                            type="number" value={row.marks_obtained || ''} style={{ width: '60px' }}
                                            onChange={e => handleMarkChange(i, 'marks_obtained', e.target.value)}
                                        />
                                        {isMarksChanged && <div className="old-val">{origRow.marks_obtained}</div>}
                                    </td>
                                    <td>
                                        <input
                                            className={"edit-input " + (isTotalChanged ? 'edited-field' : '')}
                                            type="number" value={row.marks_total || ''} style={{ width: '60px' }}
                                            onChange={e => handleMarkChange(i, 'marks_total', e.target.value)}
                                        />
                                        {isTotalChanged && <div className="old-val">{origRow.marks_total}</div>}
                                    </td>
                                    <td>
                                        <input
                                            className={"edit-input " + (isGradeChanged ? 'edited-field' : '')}
                                            value={row.grade || ''} style={{ width: '40px' }}
                                            onChange={e => handleMarkChange(i, 'grade', e.target.value)}
                                        />
                                        {isGradeChanged && <div className="old-val">{origRow.grade}</div>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                <button className="primary" onClick={onSubmit}>Submit for Review</button>
            </div>
            <style>{`
                .edited-field {
                    color: #16a34a !important; /* Green 600 */
                    font-weight: 600;
                    border-color: #86efac !important;
                    background-color: #f0fdf4 !important;
                }
                .old-val {
                    color: #dc2626; /* Red 600 */
                    font-size: 0.75rem;
                    text-decoration: line-through;
                    margin-top: 4px;
                }
            `}</style>
        </div>
    )
}

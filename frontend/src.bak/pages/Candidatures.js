import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Trash2, Edit3, Check, X, Calendar, ExternalLink } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const STATUTS = [
  { id:'postule', label:'Postulé', color:'#3b82f6' },
  { id:'entretien', label:'Entretien', color:'#f59e0b' },
  { id:'offre', label:'Offre reçue', color:'#10b981' },
  { id:'refus', label:'Refus', color:'#ef4444' },
];

export default function Candidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => { fetchCandidatures(); }, []);

  const fetchCandidatures = async () => {
    try {
      const r = await axios.get(`${API}/candidatures`);
      setCandidatures(r.data);
    } catch(e) { console.error(e); }
  };

  const updateStatut = async (id, statut) => {
    try {
      await axios.patch(`${API}/candidatures/${id}`, { ...editData, statut });
      fetchCandidatures();
      setEditing(null);
    } catch(e) { console.error(e); }
  };

  const deleteCandidat = async (id) => {
    if (!window.confirm('Supprimer cette candidature ?')) return;
    await axios.delete(`${API}/candidatures/${id}`);
    fetchCandidatures();
  };

  const saveEdit = async (id) => {
    await axios.patch(`${API}/candidatures/${id}`, editData);
    fetchCandidatures();
    setEditing(null);
  };

  const card = { background:'rgba(15,23,42,0.85)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, padding:16 };
  const inp = { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:8, padding:'6px 10px', color:'#e2e8f0', fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' };

  const counts = STATUTS.map(s => ({ ...s, count: candidatures.filter(c => c.statut === s.id).length }));

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {counts.map(s => (
          <div key={s.id} style={{ ...card, padding:12, textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.count}</div>
            <div style={{ fontSize:11, color:'#94a3b8' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      {candidatures.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:40 }}>
          <Send size={40} color="#334155" style={{ marginBottom:12 }}/>
          <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>Aucune candidature</div>
          <div style={{ fontSize:12, color:'#475569' }}>Postule sur une offre pour commencer le suivi</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {candidatures.map(c => {
            const statut = STATUTS.find(s => s.id === c.statut) || STATUTS[0];
            const isEditing = editing === c.id;
            return (
              <div key={c.id} style={{ ...card, padding:14 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#1e293b,#0f172a)', border:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#8b5cf6', flexShrink:0 }}>
                    {(c.company||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginBottom:8 }}>{c.company} · {new Date(c.date_postulation).toLocaleDateString('fr-FR')}</div>
                    
                    {/* Statut buttons */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom: isEditing ? 10 : 0 }}>
                      {STATUTS.map(s => (
                        <button key={s.id} onClick={() => updateStatut(c.id, s.id)}
                          style={{ background: c.statut===s.id ? `${s.color}25` : 'transparent', color: c.statut===s.id ? s.color : '#64748b', border: `1px solid ${c.statut===s.id ? s.color+'60' : '#334155'}`, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                      <div style={{ marginTop:8 }}>
                        <textarea placeholder="Notes..." value={editData.notes||c.notes||''} onChange={e=>setEditData({...editData,notes:e.target.value})}
                          style={{ ...inp, minHeight:60, resize:'vertical', marginBottom:6 }}/>
                        <input type="datetime-local" value={editData.date_entretien||''} onChange={e=>setEditData({...editData,date_entretien:e.target.value})}
                          style={{ ...inp, marginBottom:6 }} placeholder="Date entretien"/>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => saveEdit(c.id)} style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}><Check size={12}/> Sauver</button>
                          <button onClick={() => setEditing(null)} style={{ background:'#334155', color:'#94a3b8', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}><X size={12}/> Annuler</button>
                        </div>
                      </div>
                    )}

                    {c.notes && !isEditing && <div style={{ fontSize:11, color:'#64748b', marginTop:6, fontStyle:'italic' }}>📝 {c.notes}</div>}
                    {c.date_entretien && <div style={{ fontSize:11, color:'#f59e0b', marginTop:4 }}>📅 Entretien : {new Date(c.date_entretien).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                    {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color:'#8b5cf6', display:'flex' }}><ExternalLink size={14}/></a>}
                    <button onClick={() => { setEditing(c.id); setEditData({ notes: c.notes, date_entretien: c.date_entretien }); }} style={{ background:'transparent', border:'none', color:'#64748b', cursor:'pointer' }}><Edit3 size={14}/></button>
                    <button onClick={() => deleteCandidat(c.id)} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

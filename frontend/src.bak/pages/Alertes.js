import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Plus, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

export default function Alertes() {
  const [alertes, setAlertes] = useState([]);
  const [form, setForm] = useState({ keywords:'', location:'Ile-de-France', email:'' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchAlertes(); }, []);

  const fetchAlertes = async () => {
    try { const r = await axios.get(`${API}/alertes`); setAlertes(r.data); }
    catch(e) { console.error(e); }
  };

  const createAlerte = async () => {
    if (!form.keywords || !form.email) return alert('Remplis les mots-clés et email');
    const keywords = form.keywords.split(',').map(k=>k.trim()).filter(Boolean);
    await axios.post(`${API}/alertes`, { keywords, location: form.location, email: form.email });
    setForm({ keywords:'', location:'Ile-de-France', email:'' });
    setShowForm(false);
    fetchAlertes();
  };

  const deleteAlerte = async (id) => {
    await axios.delete(`${API}/alertes/${id}`);
    fetchAlertes();
  };

  const card = { background:'rgba(15,23,42,0.85)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, padding:16 };
  const inp = { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'10px 14px', color:'#e2e8f0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', marginBottom:10 };
  const tag = { background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)', borderRadius:6, padding:'2px 7px', fontSize:11 };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Bell size={18} color="#8b5cf6"/>
          <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{alertes.length} alerte{alertes.length>1?'s':''}</span>
        </div>
        <button onClick={()=>setShowForm(!showForm)} style={{ background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Plus size={14}/> Nouvelle alerte
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom:16, border:'1px solid rgba(139,92,246,0.4)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:12 }}>Créer une alerte</div>
          <input style={inp} placeholder="Mots-clés (séparés par virgule)" value={form.keywords} onChange={e=>setForm({...form,keywords:e.target.value})}/>
          <input style={inp} placeholder="Lieu (ex: Ile-de-France)" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
          <input style={inp} placeholder="Email de notification" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={createAlerte} style={{ background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer', flex:1 }}>Créer</button>
            <button onClick={()=>setShowForm(false)} style={{ background:'#334155', color:'#94a3b8', border:'none', borderRadius:10, padding:'10px 16px', fontSize:13, cursor:'pointer' }}>Annuler</button>
          </div>
        </div>
      )}

      {alertes.length === 0 && !showForm ? (
        <div style={{ ...card, textAlign:'center', padding:40 }}>
          <Bell size={40} color="#334155" style={{ marginBottom:12 }}/>
          <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>Aucune alerte configurée</div>
          <div style={{ fontSize:12, color:'#475569' }}>Crée une alerte pour recevoir les nouvelles offres par email</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {alertes.map(a => (
            <div key={a.id} style={{ ...card, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(139,92,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Bell size={16} color="#8b5cf6"/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 }}>
                  {(a.keywords||[]).map(k=><span key={k} style={tag}>{k}</span>)}
                </div>
                <div style={{ fontSize:11, color:'#64748b' }}>📍 {a.location} · 📧 {a.email}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: a.actif ? '#10b981' : '#64748b' }}/>
                <button onClick={()=>deleteAlerte(a.id)} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

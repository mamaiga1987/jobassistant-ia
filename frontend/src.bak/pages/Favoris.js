import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Trash2, ExternalLink, MapPin } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

export default function Favoris({ onPostuler }) {
  const [favoris, setFavoris] = useState([]);

  useEffect(() => { fetchFavoris(); }, []);

  const fetchFavoris = async () => {
    try {
      const r = await axios.get(`${API}/favoris`);
      setFavoris(r.data);
    } catch(e) { console.error(e); }
  };

  const removeFavori = async (job_id) => {
    await axios.delete(`${API}/favoris/${job_id}`);
    fetchFavoris();
  };

  const postuler = async (f) => {
    try {
      await axios.post(`${API}/candidatures`, { job_id: f.job_id, title: f.title, company: f.company, url: f.job_url });
      alert('Candidature ajoutée !');
    } catch(e) { console.error(e); }
  };

  const card = { background:'rgba(15,23,42,0.85)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, padding:14 };
  const tag = { background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)', borderRadius:6, padding:'2px 7px', fontSize:11 };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <Star size={18} color="#f59e0b"/>
        <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{favoris.length} offre{favoris.length>1?'s':''} sauvegardée{favoris.length>1?'s':''}</span>
      </div>

      {favoris.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:40 }}>
          <Star size={40} color="#334155" style={{ marginBottom:12 }}/>
          <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>Aucun favori</div>
          <div style={{ fontSize:12, color:'#475569' }}>Clique sur ⭐ sur une offre pour la sauvegarder</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {favoris.map(f => (
            <div key={f.id} style={card}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#1e293b,#0f172a)', border:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#8b5cf6', flexShrink:0 }}>
                  {(f.company||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>{f.company} · <MapPin size={10} style={{display:'inline'}}/> {f.location}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
                    {(f.tags||[]).slice(0,3).map(t=><span key={t} style={tag}>{t}</span>)}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => postuler(f)} style={{ background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      Postuler
                    </button>
                    {f.job_url && <a href={f.job_url} target="_blank" rel="noopener noreferrer" style={{ background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.3)', borderRadius:8, padding:'6px 10px', fontSize:11, display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}><ExternalLink size={11}/> Voir</a>}
                  </div>
                </div>
                <button onClick={() => removeFavori(f.job_id)} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', flexShrink:0 }}><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

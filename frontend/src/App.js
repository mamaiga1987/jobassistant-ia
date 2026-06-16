import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Upload, Search, Send, Star, Bell, Settings, FileText, Menu, X, ExternalLink, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
const API = '/api';
const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b'];
const G = {
  bg: '#060b18',
  card: { background:'rgba(15,23,42,0.85)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, padding:16 },
  inp: { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'10px 14px', color:'#e2e8f0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' },
  btn: { background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  tag: { background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)', borderRadius:6, padding:'2px 8px', fontSize:11 },
};

const ScoreCircle = ({ score, size=48 }) => {
  const color = score>=85?'#10b981':score>=70?'#f59e0b':'#ef4444';
  const r=size/2-5, circ=2*Math.PI*r, dash=(score/100)*circ;
  return (
    <div style={{position:'relative',width:size,height:size,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width={size} height={size} style={{position:'absolute',transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <span style={{fontSize:size<60?11:16,fontWeight:800,color}}>{score}%</span>
    </div>
  );
};

const navItems = [
  {id:'dashboard',icon:<Briefcase size={18}/>,label:'Tableau de bord'},
  {id:'offres',icon:<Search size={18}/>,label:'Offres matchées'},
  {id:'candidatures',icon:<Send size={18}/>,label:'Candidatures'},
  {id:'favoris',icon:<Star size={18}/>,label:'Favoris'},
  {id:'cv',icon:<FileText size={18}/>,label:'Mon CV & Profil'},
  {id:'alertes',icon:<Bell size={18}/>,label:'Alertes'},
  {id:'parametres',icon:<Settings size={18}/>,label:'Paramètres'},
];

const Sidebar = ({ active, setActive, isMobile, open, setOpen, profil }) => (
  <div style={{width:isMobile?'80%':220,maxWidth:280,background:'rgba(8,12,25,0.98)',borderRight:isMobile?'none':'1px solid rgba(139,92,246,0.15)',display:'flex',flexDirection:'column',position:isMobile?'fixed':'relative',height:'100%',top:0,left:0,zIndex:1000,transform:isMobile?(open?'translateX(0)':'translateX(-100%)'):'none',transition:'transform .3s'}}>
    {isMobile&&<button onClick={()=>setOpen(false)} style={{position:'absolute',top:16,right:16,background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer'}}><X size={20}/></button>}
    <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(139,92,246,0.1)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center'}}><Briefcase size={16} color="#fff"/></div>
        <div><p style={{margin:0,fontSize:13,fontWeight:800,color:'#fff'}}>JobAssistant IA</p><p style={{margin:0,fontSize:10,color:'#8b5cf6'}}>Matching intelligent</p></div>
      </div>
    </div>
    {profil&&(
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(139,92,246,0.1)'}}>
        <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Profil analysé</div>
        <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>{profil.nom}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
          {(profil.competences||[]).slice(0,3).map(c=><span key={c} style={G.tag}>{c}</span>)}
        </div>
      </div>
    )}
    <nav style={{flex:1,padding:'8px 0',overflowY:'auto'}}>
      {navItems.map(n=>(
        <button key={n.id} onClick={()=>setActive(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:active===n.id?'rgba(139,92,246,0.15)':'transparent',border:'none',borderLeft:active===n.id?'3px solid #8b5cf6':'3px solid transparent',color:active===n.id?'#a78bfa':'#64748b',cursor:'pointer',fontSize:13,fontWeight:active===n.id?600:400}}>
          {n.icon}{n.label}
        </button>
      ))}
    </nav>
  </div>
);

const LettreMotivationIA = ({ offre }) => {
  const [lettre, setLettre] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const genererLettre = async () => {
    setLoading(true); setLettre('');
    try { const r = await axios.post(API+'/generer-lettre',{offre_id:offre.id}); setLettre(r.data.lettre||''); }
    catch(e) { setLettre('Erreur lors de la generation.'); }
    setLoading(false);
  };
  const copier = () => { navigator.clipboard.writeText(lettre); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{marginTop:8}}>
      <button onClick={genererLettre} disabled={loading} style={{...G.btn,width:'100%',padding:'12px',fontSize:13,background:'linear-gradient(135deg,#7c3aed,#2563eb)'}}>
        {loading ? 'Generation en cours...' : 'Generer lettre de motivation IA'}
      </button>
      {lettre&&(
        <div style={{marginTop:12,...G.card,background:'rgba(30,58,95,0.3)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>Lettre de motivation</span>
            <button onClick={copier} style={{...G.btn,padding:'4px 12px',fontSize:11,background:copied?'rgba(34,197,94,0.2)':'rgba(139,92,246,0.2)',color:copied?'#22c55e':'#a78bfa'}}>{copied?'Copie !':'Copier'}</button>
          </div>
          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{lettre}</div>
        </div>
      )}
    </div>
  );
};

const OffresPage = ({ profil, favoris, setFavoris, onPostuler }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date');
  const [minScore, setMinScore] = useState(50);
  const [sourceFilter, setSourceFilter] = useState('tous');
  const [detail, setDetail] = useState(null);
  const suggestions = ['Product Owner','MOA Data','Data Analyst','Chef de Projet','Business Analyst','Data Engineer','Scrum Master'];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let url = search ? API+'/search?q='+encodeURIComponent(search)+'&sort='+sort : API+'/jobs?limit=200&sort='+sort+'&minScore='+minScore;
        if (sourceFilter && sourceFilter !== 'tous') url += '&source='+encodeURIComponent(sourceFilter);
        const r = await axios.get(url);
        setJobs(Array.isArray(r.data)?r.data:[]);
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [search, sort, sourceFilter, minScore]);

  const fetchJobs = () => {};
  const filtered = jobs;

  const toggleFavori = async (job) => {
    const isFav = favoris.includes(job.id);
    if (isFav) { await axios.delete(API+'/favoris/'+job.id); setFavoris(f=>f.filter(x=>x!==job.id)); }
    else { await axios.post(API+'/favoris',{job_id:job.id}); setFavoris(f=>[...f,job.id]); }
  };

  if (detail) return (
    <div>
      <button onClick={()=>setDetail(null)} style={{background:'transparent',border:'none',color:'#8b5cf6',cursor:'pointer',fontSize:13,marginBottom:16}}>← Retour</button>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:13,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(detail.company||'?')[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <h2 style={{margin:'0 0 4px',fontSize:16,fontWeight:800,color:'#fff'}}>{detail.title}</h2>
            <div style={{fontSize:13,color:'#94a3b8'}}>{detail.company} · {detail.location}</div>
          </div>
          <ScoreCircle score={detail.ia_score||0} size={64}/>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>{(detail.tags||[]).map(t=><span key={t} style={G.tag}>{t}</span>)}</div>
        <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.7,margin:'0 0 16px'}}>{detail.description||'Description non disponible.'}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <button onClick={()=>onPostuler(detail)} style={{...G.btn,padding:'12px'}}><Send size={14}/> Postuler</button>
          {detail.url&&<a href={detail.url} target="_blank" rel="noopener noreferrer" onClick={()=>onPostuler(detail)} style={{...G.btn,padding:'12px',background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',textDecoration:'none'}}><ExternalLink size={14}/> Voir offre</a>}
        </div>
        <LettreMotivationIA offre={detail}/>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{...G.card,marginBottom:14,padding:12}}>
        <div style={{position:'relative',marginBottom:10}}>
          <Search size={14} color="#64748b" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
          <input style={{...G.inp,paddingLeft:34}} placeholder="Chercher un metier, competence..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#94a3b8'}}>
            <span>Score min:</span>
            <select value={minScore} onChange={e=>setMinScore(parseInt(e.target.value))} style={{...G.inp,width:'auto',padding:'3px 8px',fontSize:12}}>
              <option value={0}>Tous</option>
              <option value={50}>50%+</option>
              <option value={60}>60%+</option>
              <option value={70}>70%+</option>
              <option value={80}>80%+</option>
              <option value={90}>90%+</option>
            </select>
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{...G.inp,width:'auto',padding:'3px 8px',fontSize:12}}>
            <option value="date">Plus recent</option>
            <option value="score">Meilleur score</option>
          </select>
          <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} style={{...G.inp,width:'auto',padding:'3px 8px',fontSize:12}}>
            <option value="tous">Toutes sources</option>
            <option value="France Travail">France Travail</option>
            <option value="Indeed">Indeed</option>
          </select>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
          {suggestions.map(s=><button key={s} onClick={()=>setSearch(s)} style={{background:'rgba(139,92,246,0.08)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.15)',borderRadius:20,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>{s}</button>)}
        </div>
      </div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:12}}>{filtered.length} offres {minScore>0?'>= '+minScore+'%':''}</div>
      {loading&&<div style={{textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>}
      {filtered.map(job=>(
        <div key={job.id} style={{...G.card,marginBottom:12,cursor:'pointer'}} onClick={()=>setDetail(job)}>
          <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(job.company||'?')[0].toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.title}</div>
              <div style={{fontSize:12,color:'#64748b'}}>{job.company} · {job.location} · {job.contract_type||'CDI'}</div>
            </div>
            <ScoreCircle score={job.ia_score||0} size={52}/>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>{(job.tags||[]).map(t=><span key={t} style={G.tag}>{t}</span>)}</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:11,color:'#475569'}}>{job.published_at?new Date(job.published_at).toLocaleDateString('fr-FR'):''} · via {job.source}</div>
            <div style={{display:'flex',gap:8}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleFavori(job)} style={{background:'transparent',border:'none',cursor:'pointer',color:favoris.includes(job.id)?'#f59e0b':'#334155'}}>★</button>
              <button onClick={()=>onPostuler(job)} style={{...G.btn,padding:'6px 14px',fontSize:12}}><Send size={12}/> Postuler</button>
              {job.url&&<a href={job.url} target="_blank" rel="noopener noreferrer" onClick={()=>onPostuler(job)} style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',textDecoration:'none'}}><ExternalLink size={12}/> Voir</a>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const CandidaturesPage = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [editNote, setEditNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const STATUTS = [
    {id:'postule',label:'Postule',color:'#3b82f6',emoji:'📤'},
    {id:'relance',label:'Relance',color:'#8b5cf6',emoji:'🔔'},
    {id:'entretien',label:'Entretien',color:'#f59e0b',emoji:'🎯'},
    {id:'offre',label:'Offre',color:'#10b981',emoji:'✅'},
    {id:'refus',label:'Refus',color:'#ef4444',emoji:'❌'},
  ];
  useEffect(()=>{axios.get(API+'/candidatures').then(r=>setCandidatures(r.data)).catch(console.error);},[]);
  const updateStatut = async (id,statut) => { await axios.patch(API+'/candidatures/'+id,{statut}); setCandidatures(c=>c.map(x=>x.id===id?{...x,statut}:x)); };
  const saveNote = async (id) => { await axios.patch(API+'/candidatures/'+id,{notes:noteText}); setCandidatures(c=>c.map(x=>x.id===id?{...x,notes:noteText}:x)); setEditNote(null); };
  const deleteCandidat = async (id) => { if(!window.confirm('Supprimer ?'))return; await axios.delete(API+'/candidatures/'+id); setCandidatures(c=>c.filter(x=>x.id!==id)); };
  const joursDepuis = (date) => { const j=Math.floor((Date.now()-new Date(date))/86400000); return j===0?"Aujourd'hui":j===1?'Hier':'Il y a '+j+'j'; };
  const aRelancer = (c) => c.statut==='postule'&&Math.floor((Date.now()-new Date(c.date_postulation))/86400000)>=7;
  const nbRelance = candidatures.filter(aRelancer).length;
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
        {STATUTS.map(s=><div key={s.id} style={{...G.card,padding:10,textAlign:'center',borderTop:'3px solid '+s.color}}><div style={{fontSize:20,fontWeight:800,color:s.color}}>{candidatures.filter(c=>c.statut===s.id).length}</div><div style={{fontSize:11,color:'#94a3b8'}}>{s.emoji}</div></div>)}
      </div>
      {nbRelance>0&&<div style={{...G.card,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',marginBottom:12,fontSize:12,color:'#f59e0b',fontWeight:600}}>🔔 {nbRelance} candidature(s) a relancer</div>}
      {candidatures.length===0?<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune candidature — Postule sur une offre pour demarrer</div>:candidatures.map(c=>{
        const s=STATUTS.find(x=>x.id===c.statut)||STATUTS[0];
        return (
          <div key={c.id} style={{...G.card,marginBottom:10,borderLeft:'3px solid '+s.color}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <div style={{width:40,height:40,borderRadius:10,background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(c.company||'?')[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>{c.company} · {joursDepuis(c.date_postulation)}</div>
                {aRelancer(c)&&<div style={{fontSize:11,color:'#f59e0b',marginBottom:4}}>🔔 A relancer !</div>}
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
                  {STATUTS.map(st=><button key={st.id} onClick={()=>updateStatut(c.id,st.id)} style={{background:c.statut===st.id?st.color+'25':'transparent',color:c.statut===st.id?st.color:'#475569',border:'1px solid '+(c.statut===st.id?st.color+'80':'#334155'),borderRadius:6,padding:'2px 8px',fontSize:10,cursor:'pointer'}}>{c.statut===st.id&&'✓ '}{st.label}</button>)}
                </div>
                {editNote===c.id?<div><textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Notes..." style={{...G.inp,height:60,fontSize:11,resize:'none'}}/><div style={{display:'flex',gap:6,marginTop:4}}><button onClick={()=>saveNote(c.id)} style={{...G.btn,padding:'3px 10px',fontSize:11}}>Sauver</button><button onClick={()=>setEditNote(null)} style={{...G.btn,padding:'3px 10px',fontSize:11,background:'rgba(100,116,139,0.2)'}}>Annuler</button></div></div>:<div onClick={()=>{setEditNote(c.id);setNoteText(c.notes||'');}} style={{fontSize:11,color:c.notes?'#94a3b8':'#475569',cursor:'pointer',fontStyle:c.notes?'normal':'italic'}}>{c.notes||'+ Ajouter une note...'}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>{c.url&&<a href={c.url} target="_blank" rel="noopener noreferrer" style={{color:'#8b5cf6'}}><ExternalLink size={14}/></a>}<button onClick={()=>deleteCandidat(c.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FavorisPage = ({ onPostuler }) => {
  const [favoris, setFavoris] = useState([]);
  useEffect(()=>{axios.get(API+'/favoris').then(r=>setFavoris(r.data)).catch(console.error);},[]);
  const removeFavori = async (id) => { await axios.delete(API+'/favoris/'+id); setFavoris(f=>f.filter(x=>x.id!==id)); };
  return (
    <div>
      {favoris.length===0?<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucun favori</div>:favoris.map(f=>(
        <div key={f.id} style={{...G.card,marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:4}}>{f.title}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:8}}>{f.company} · {f.location}</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>onPostuler(f)} style={{...G.btn,padding:'6px 14px',fontSize:12}}><Send size={12}/> Postuler</button>
            {f.job_url&&<a href={f.job_url} target="_blank" rel="noopener noreferrer" style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',textDecoration:'none'}}><ExternalLink size={12}/> Voir</a>}
            <button onClick={()=>removeFavori(f.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
          </div>
        </div>
      ))}
    </div>
  );
};

const CVPage = ({ profil, setProfil }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newComp, setNewComp] = useState('');
  useEffect(()=>{if(profil)setForm(profil);},[profil]);
  const save = async () => { const r=await axios.put(API+'/profil',form); setProfil(r.data); setEditing(false); };
  const addComp = async () => { if(!newComp.trim())return; const r=await axios.post(API+'/profil/competence',{competence:newComp.trim()}); setProfil(p=>({...p,competences:r.data.competences})); setNewComp(''); };
  const removeComp = async (c) => { const r=await axios.delete(API+'/profil/competence',{data:{competence:c}}); setProfil(p=>({...p,competences:r.data.competences})); };
  if(!profil) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Profil non disponible</div>;
  return (
    <div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{profil.nom}</div>
          <button onClick={()=>setEditing(!editing)} style={{...G.btn,padding:'6px 14px',fontSize:12}}>{editing?'Annuler':'Modifier'}</button>
        </div>
        {editing?<div>
          <input value={form.titre||''} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre" style={{...G.inp,marginBottom:8}}/>
          <button onClick={save} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Sauvegarder</button>
        </div>:<div style={{fontSize:13,color:'#94a3b8'}}>{profil.titre}</div>}
      </div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:10}}>Competences ({(profil.competences||[]).length})</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {(profil.competences||[]).map(c=><span key={c} style={{...G.tag,display:'flex',alignItems:'center',gap:4}}>{c}<button onClick={()=>removeComp(c)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer',padding:0,fontSize:10}}>×</button></span>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <input value={newComp} onChange={e=>setNewComp(e.target.value)} placeholder="Ajouter une competence..." style={{...G.inp,flex:1}} onKeyDown={e=>e.key==='Enter'&&addComp()}/>
          <button onClick={addComp} style={{...G.btn,padding:'8px 14px',fontSize:12}}>+</button>
        </div>
      </div>
      <div style={{...G.card}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:8}}>Metiers cibles ({(profil.metiers||[]).length})</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {(profil.metiers||[]).map(m=><span key={m} style={G.tag}>{m}</span>)}
        </div>
      </div>
    </div>
  );
};

const AlertesPage = () => {
  const [alertes, setAlertes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({keywords:'',location:'IDF',email:''});
  useEffect(()=>{axios.get(API+'/alertes').then(r=>setAlertes(r.data)).catch(console.error);},[]);
  const add = async () => { const r=await axios.post(API+'/alertes',form); setAlertes(a=>[...a,r.data]); setShowForm(false); };
  const del = async (id) => { await axios.delete(API+'/alertes/'+id); setAlertes(a=>a.filter(x=>x.id!==id)); };
  return (
    <div>
      <button onClick={()=>setShowForm(!showForm)} style={{...G.btn,width:'100%',marginBottom:12}}>+ Nouvelle alerte</button>
      {showForm&&<div style={{...G.card,marginBottom:12}}>
        <input value={form.keywords} onChange={e=>setForm({...form,keywords:e.target.value})} placeholder="Mots-cles (ex: Product Owner Data)" style={{...G.inp,marginBottom:8}}/>
        <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" style={{...G.inp,marginBottom:8}}/>
        <button onClick={add} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Creer alerte</button>
      </div>}
      {alertes.map(a=><div key={a.id} style={{...G.card,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{a.keywords}</div><div style={{fontSize:11,color:'#64748b'}}>{a.location} · {a.email}</div></div>
        <button onClick={()=>del(a.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
      </div>)}
      {alertes.length===0&&!showForm&&<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune alerte</div>}
    </div>
  );
};

const ParametresPage = () => {
  const [config, setConfig] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newCritere, setNewCritere] = useState({critere:'',label:'',poids:5,description:''});
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState('');
  React.useEffect(()=>{axios.get(API+'/scoring-config').then(r=>setConfig(r.data));},[]);
  const saveEdit = async (c) => { await axios.put(API+'/scoring-config/'+c.critere,c); setConfig(config.map(x=>x.critere===c.critere?c:x)); setEditing(null); setMsg('Critere mis a jour'); setTimeout(()=>setMsg(''),3000); };
  const toggleActif = async (c) => { const u={...c,actif:!c.actif}; await axios.put(API+'/scoring-config/'+c.critere,u); setConfig(config.map(x=>x.critere===c.critere?u:x)); };
  const deleteCritere = async (critere) => { if(!window.confirm('Supprimer ?'))return; await axios.delete(API+'/scoring-config/'+critere); setConfig(config.filter(x=>x.critere!==critere)); };
  const addCritere = async () => { if(!newCritere.critere||!newCritere.label)return; const r=await axios.post(API+'/scoring-config',newCritere); setConfig([...config,r.data]); setNewCritere({critere:'',label:'',poids:5,description:''}); setShowAdd(false); };
  const totalPoids = config.filter(c=>c.actif).reduce((s,c)=>s+c.poids,0);
  return (
    <div style={{padding:16}}>
      <div style={{...G.card,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e2e8f0',marginBottom:4}}>Configuration du Scoring IA</div>
        <div style={{fontSize:12,color:'#64748b'}}>Total poids actifs: <span style={{color:totalPoids===100?'#22c55e':'#f59e0b',fontWeight:700}}>{totalPoids}/100 pts</span></div>
      </div>
      {msg&&<div style={{...G.card,background:'rgba(34,197,94,0.1)',border:'1px solid #22c55e',color:'#22c55e',marginBottom:12,textAlign:'center'}}>{msg}</div>}
      {config.map(c=>(
        <div key={c.critere} style={{...G.card,marginBottom:10,opacity:c.actif?1:0.5}}>
          {editing===c.critere?(
            <div>
              <input value={c.label} onChange={e=>setConfig(config.map(x=>x.critere===c.critere?{...x,label:e.target.value}:x))} style={{...G.inp,marginBottom:8,fontSize:13}}/>
              <input value={c.description} onChange={e=>setConfig(config.map(x=>x.critere===c.critere?{...x,description:e.target.value}:x))} style={{...G.inp,marginBottom:8,fontSize:12}}/>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:12,color:'#94a3b8'}}>Poids:</span>
                <input type="number" min="0" max="100" value={c.poids} onChange={e=>setConfig(config.map(x=>x.critere===c.critere?{...x,poids:parseInt(e.target.value)}:x))} style={{...G.inp,width:60,fontSize:13}}/>
                <button onClick={()=>saveEdit(c)} style={{...G.btn,padding:'4px 12px',fontSize:12}}>Sauver</button>
                <button onClick={()=>setEditing(null)} style={{...G.btn,padding:'4px 12px',fontSize:12,background:'rgba(100,116,139,0.2)'}}>Annuler</button>
              </div>
            </div>
          ):(
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0'}}>{c.label}</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{background:'rgba(139,92,246,0.2)',color:'#a78bfa',padding:'2px 10px',borderRadius:12,fontSize:12,fontWeight:700}}>{c.poids} pts</div>
                  <div onClick={()=>toggleActif(c)} style={{width:32,height:18,borderRadius:9,background:c.actif?'#22c55e':'#475569',cursor:'pointer',position:'relative'}}>
                    <div style={{position:'absolute',top:2,left:c.actif?14:2,width:14,height:14,borderRadius:7,background:'white'}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>{c.description}</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setEditing(c.critere)} style={{...G.btn,padding:'3px 10px',fontSize:11,background:'rgba(59,130,246,0.15)',color:'#60a5fa'}}>Modifier</button>
                <button onClick={()=>deleteCritere(c.critere)} style={{...G.btn,padding:'3px 10px',fontSize:11,background:'rgba(239,68,68,0.15)',color:'#f87171'}}>Supprimer</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {showAdd?(
        <div style={{...G.card,border:'1px solid rgba(139,92,246,0.3)'}}>
          <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0',marginBottom:12}}>Nouveau critere</div>
          <input value={newCritere.critere} onChange={e=>setNewCritere({...newCritere,critere:e.target.value.toLowerCase().replace(/ /g,'_')})} style={{...G.inp,marginBottom:8,fontSize:13}} placeholder="Identifiant"/>
          <input value={newCritere.label} onChange={e=>setNewCritere({...newCritere,label:e.target.value})} style={{...G.inp,marginBottom:8,fontSize:13}} placeholder="Label"/>
          <input value={newCritere.description} onChange={e=>setNewCritere({...newCritere,description:e.target.value})} style={{...G.inp,marginBottom:8,fontSize:12}} placeholder="Description"/>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>Poids:</span>
            <input type="number" min="0" max="100" value={newCritere.poids} onChange={e=>setNewCritere({...newCritere,poids:parseInt(e.target.value)})} style={{...G.inp,width:60,fontSize:13}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={addCritere} style={{...G.btn,padding:'6px 16px',fontSize:13}}>Ajouter</button>
            <button onClick={()=>setShowAdd(false)} style={{...G.btn,padding:'6px 16px',fontSize:13,background:'rgba(100,116,139,0.2)'}}>Annuler</button>
          </div>
        </div>
      ):<button onClick={()=>setShowAdd(true)} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,marginTop:8}}>+ Ajouter un critere</button>}
      <div style={{...G.card,marginTop:16,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)'}}>
        <div style={{fontSize:12,color:'#f59e0b',fontWeight:600,marginBottom:4}}>Conseil</div>
        <div style={{fontSize:11,color:'#94a3b8'}}>La somme des poids devrait etre egale a 100 pts. Actuellement: {totalPoids} pts</div>
      </div>
      <button onClick={async()=>{setMsg('Recalcul...');try{const r=await axios.post(API+'/recalcul-scores');setMsg(r.data.message);}catch(e){setMsg('Erreur');}setTimeout(()=>setMsg(''),4000);}} style={{...G.btn,width:'100%',padding:'12px',fontSize:14,marginTop:12,background:'linear-gradient(135deg,#1e3a5f,#2d6a9f)'}}>
        Recalculer les scores maintenant
      </button>
    </div>
  );
};

const Dashboard = ({ stats, profil, setActive }) => {
  const evolution = (stats?.evolution||[]).map(e=>({day:{'Mon':'Lun','Tue':'Mar','Wed':'Mer','Thu':'Jeu','Fri':'Ven','Sat':'Sam','Sun':'Dim'}[e.day]||e.day,offres:parseInt(e.offres)}));
  const repartition = (stats?.repartition||[]).map(r=>({name:r.zone,value:parseInt(r.count)}));
  const [sending, setSending] = React.useState(false);
  const sendRapport = async () => { setSending(true); try { await axios.post(API+'/veille/run-et-email'); alert('Rapport envoye !'); } catch(e){alert('Erreur');} setSending(false); };
  const metiers = [
    {label:'Product Owner / MOA',score:76,color:'#8b5cf6'},
    {label:'Data Engineer',score:63,color:'#3b82f6'},
    {label:'Data Analyst',score:51,color:'#10b981'},
    {label:'Business Analyst',score:48,color:'#f59e0b'},
    {label:'Data Scientist',score:42,color:'#ec4899'},
  ];
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[{label:'Offres trouvees',value:stats?.total||0,color:'#8b5cf6',icon:'💼'},{label:'Candidatures',value:stats?.candidaturesCount||0,color:'#10b981',icon:'📨'},{label:'Entretiens',value:stats?.entretiensCount||0,color:'#f59e0b',icon:'🎯'}].map((s,i)=>(
          <div key={i} style={{...G.card,padding:12,textAlign:'center'}}>
            <div style={{fontSize:20}}>{s.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'#64748b'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div style={G.card}>
          <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Evolution 7j</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={evolution}><XAxis dataKey="day" tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:10}}/><Line type="monotone" dataKey="offres" stroke="#8b5cf6" strokeWidth={2} dot={false}/></LineChart>
          </ResponsiveContainer>
        </div>
        <div style={G.card}>
          <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Repartition</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart><Pie data={repartition} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value">{repartition.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:10}}/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Score moyen par metier</div>
        {metiers.map((m,i)=>(
          <div key={i} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:11,color:'#94a3b8'}}>{m.label}</span>
              <span style={{fontSize:11,color:m.color,fontWeight:700}}>{m.score}%</span>
            </div>
            <div style={{height:6,background:'rgba(30,41,59,0.8)',borderRadius:3}}>
              <div style={{height:6,width:m.score+'%',background:m.color,borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Suggestions IA</div>
        {[(stats?.total||0)+' offres disponibles dans votre domaine',(stats?.todayCount||0)+' nouvelles offres ajoutees aujourd\'hui',profil?'Profil '+profil.titre+' analyse — matching actif':'Uploadez votre CV pour activer le matching IA'].map((s,i)=>(
          <div key={i} style={{display:'flex',gap:8,marginBottom:8,padding:'8px 10px',background:'rgba(30,41,59,0.5)',borderRadius:8}}>
            <span>💡</span><span style={{fontSize:12,color:'#94a3b8',lineHeight:1.4}}>{s}</span>
          </div>
        ))}
      </div>
      <button onClick={sendRapport} disabled={sending} style={{...G.btn,width:'100%',padding:'12px',fontSize:13,background:'linear-gradient(135deg,#1e3a5f,#2d6a9f)',marginBottom:10}}>
        {sending?'Envoi en cours...':'Envoyer le rapport maintenant'}
      </button>
      <button onClick={async()=>{
        try {
          const r = await axios.get(API+'/veille/statut');
          const rap = r.data[0];
          if(!rap){alert('Aucun rapport disponible');return;}
          const date = new Date(rap.created_at).toLocaleDateString('fr-FR');
          const comps = (rap.top_competences||[]).map(c=>'<li>'+c+'</li>').join('');
          const ents = (rap.top_entreprises||[]).map(e=>'<li>'+e+'</li>').join('');
          const body = (rap.rapport_ia||'').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^## (.+)$/gm,'<h3 style="color:#1e3a5f">$1</h3>').replace(/^### (.+)$/gm,'<h4 style="color:#2d6a9f">$1</h4>').replace(/^- (.+)$/gm,'<li>$1</li>').split('\n').join('<br>');
          const html = '<!DOCTYPE html><html><head><meta charset=UTF-8><title>Rapport '+date+'</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px;margin:0 auto;color:#333}h1{color:#1e3a5f;border-bottom:3px solid #2d6a9f;padding-bottom:10px}h2{color:#1e3a5f}li{margin:4px 0}.stat{display:inline-block;margin:8px;padding:12px 20px;background:#f0f6ff;border-radius:8px;text-align:center}.num{font-size:28px;font-weight:800;color:#2d6a9f}@media print{button{display:none}}</style></head><body><h1>Rapport Veille Marche — '+date+'</h1><div><div class=stat><div class=num>'+rap.total_offres+'</div><div>Offres analysees</div></div><div class=stat><div class=num>'+rap.nouvelles_offres+'</div><div>Nouvelles 24h</div></div></div><h2>Top Competences</h2><ul>'+comps+'</ul><h2>Entreprises</h2><ul>'+ents+'</ul><h2>Analyse IA</h2>'+body+'<br><hr><small>JobAssistant IA — jobassistant.monairbyte.eu</small></body></html>';
          const win = window.open('','_blank');
          win.document.write(html);
          win.document.close();
          setTimeout(()=>win.print(),500);
        } catch(e){alert('Erreur: '+e.message);}
      }} style={{...G.btn,width:'100%',padding:'12px',fontSize:13,background:'rgba(139,92,246,0.2)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)'}}>
        Exporter rapport en PDF
      </button>
    </div>
  );
};

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profil, setProfil] = useState(null);
  const [stats, setStats] = useState(null);
  const [favoris, setFavoris] = useState([]);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
  useEffect(()=>{
    axios.get(API+'/profil').then(r=>setProfil(r.data)).catch(()=>setProfil(null));
    axios.get(API+'/stats').then(r=>setStats(r.data)).catch(()=>{});
    axios.get(API+'/favoris').then(r=>setFavoris((r.data||[]).map(f=>f.job_id))).catch(()=>{});
  },[]);
  const onPostuler = async (job) => { try { await axios.post(API+'/candidatures',{job_id:job.id,title:job.title,company:job.company,url:job.url}); } catch(e){} };
  const pageTitle = {dashboard:'Tableau de bord',offres:'Offres matchees',candidatures:'Candidatures',favoris:'Favoris',cv:'Mon CV & Profil',alertes:'Alertes',parametres:'Parametres'};
  const renderPage = () => {
    switch(active) {
      case 'dashboard': return <Dashboard stats={stats} profil={profil} setActive={setActive}/>;
      case 'offres': return <OffresPage profil={profil} favoris={favoris} setFavoris={setFavoris} onPostuler={onPostuler}/>;
      case 'candidatures': return <CandidaturesPage/>;
      case 'favoris': return <FavorisPage onPostuler={onPostuler}/>;
      case 'cv': return <CVPage profil={profil} setProfil={setProfil}/>;
      case 'alertes': return <AlertesPage/>;
      case 'parametres': return <ParametresPage/>;
      default: return null;
    }
  };
  return (
    <div style={{display:'flex',height:'100vh',background:G.bg,overflow:'hidden'}}>
      {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999}}/>}
      <Sidebar active={active} setActive={(p)=>{setActive(p);setSidebarOpen(false);}} isMobile={isMobile} open={sidebarOpen} setOpen={setSidebarOpen} profil={profil}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',background:'rgba(8,12,25,0.95)',borderBottom:'1px solid rgba(139,92,246,0.1)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer'}}><Menu size={22}/></button>}
          <h1 style={{margin:0,fontSize:16,fontWeight:800,color:'#fff'}}>{pageTitle[active]||active}</h1>
          <div style={{marginLeft:'auto',width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>
            {profil?.nom?.split(' ').map(w=>w[0]).join('').slice(0,2)||'MA'}
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

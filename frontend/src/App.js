import './index.css';
import './theme.css';
import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Upload, Search, Send, Star, Bell, Settings, FileText, Menu, X, ExternalLink, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
const API = '/api';
const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b'];
const G = {
  bg: '#060b18',
  card: { background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:16, padding:16 },
  inp: { background:'var(--inp-bg)', border:'1px solid var(--inp-border)', borderRadius:10, padding:'10px 14px', color:'var(--inp-color)', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' },
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
  {id:'historique',icon:<FileText size={18}/>,label:'Historique rapports'},
  {id:'tendances',icon:<Briefcase size={18}/>,label:'Tendances marche'},
  {id:'portfolio',icon:<Star size={18}/>,label:'Portfolio projets'},
  {id:'agenda',icon:<Bell size={18}/>,label:'Agenda recherche'},
  {id:'blacklist',icon:<X size={18}/>,label:'Blacklist entreprises'},
  {id:'metiers',icon:<Briefcase size={18}/>,label:'Mes metiers cibles'},
  {id:'stats',icon:<Briefcase size={18}/>,label:'Statistiques avancees'},
  {id:'offre-libre',icon:<FileText size={18}/>,label:'Coller une offre'},
  {id:'questions',icon:<FileText size={18}/>,label:'Banque de questions'},
  {id:'formations',icon:<Star size={18}/>,label:'Formations recommandees'},
  {id:'veille-comp',icon:<Search size={18}/>,label:'Veille competences'},
];

const Sidebar = ({ active, setActive, isMobile, open, setOpen, profil }) => (
  <div className='sidebar' style={{width:isMobile?'80%':220,maxWidth:280,borderRight:isMobile?'none':'1px solid rgba(139,92,246,0.15)',display:'flex',flexDirection:'column',position:isMobile?'fixed':'relative',height:'100%',top:0,left:0,zIndex:1000,transform:isMobile?(open?'translateX(0)':'translateX(-100%)'):'none',transition:'transform .3s'}}>
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


const ScoreDetail = ({ offre }) => {
  const [data, setData] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const load = async () => {
    if(data){setOpen(!open);return;}
    const r = await axios.get(API+'/jobs/'+offre.id+'/score-detail');
    setData(r.data); setOpen(true);
  };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={load} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>
        🔍 Voir le détail du score
      </button>
      {open && data && (
        <div style={{...G.card,marginTop:8,background:'rgba(15,23,42,0.9)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:10}}>Score: {data.total}% — Détail</div>
          {data.details.map((d,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:12,color:'#94a3b8'}}>{d.critere}</span>
                <span style={{fontSize:12,fontWeight:700,color:d.points>0?'#22c55e':'#ef4444'}}>{d.points}/{d.max} pts</span>
              </div>
              <div style={{height:5,background:'rgba(30,41,59,0.8)',borderRadius:3,marginBottom:3}}>
                <div style={{height:5,width:(d.points/d.max*100)+'%',background:d.points>0?'#22c55e':'#ef4444',borderRadius:3}}/>
              </div>
              <div style={{fontSize:10,color:'#475569'}}>{d.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PitchIA = ({ offre }) => {
  const [pitch, setPitch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const generer = async () => {
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/pitch');
    setPitch(r.data.pitch||'');
    setLoading(false);
  };
  const copier = () => { navigator.clipboard.writeText(pitch); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(245,158,11,0.2)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)'}}>
        {loading?'Génération...':'⚡ Générer mon pitch (3 lignes)'}
      </button>
      {pitch && (
        <div style={{...G.card,marginTop:8,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:'#f59e0b'}}>⚡ Mon pitch</span>
            <button onClick={copier} style={{...G.btn,padding:'3px 10px',fontSize:11,background:copied?'rgba(34,197,94,0.2)':'rgba(245,158,11,0.2)',color:copied?'#22c55e':'#f59e0b'}}>{copied?'Copié!':'Copier'}</button>
          </div>
          <div style={{fontSize:12,color:'#e2e8f0',lineHeight:1.7}}>{pitch}</div>
        </div>
      )}
    </div>
  );
};

const FicheEntreprise = ({ offre }) => {
  const [fiche, setFiche] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const charger = async () => {
    if(fiche){setOpen(!open);return;}
    if(!offre.company){alert('Entreprise non renseignee');return;}
    setLoading(true);
    const r = await axios.get(API+'/entreprise/'+encodeURIComponent(offre.company));
    setFiche(r.data); setOpen(true); setLoading(false);
  };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={charger} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(6,182,212,0.2)',color:'#06b6d4',border:'1px solid rgba(6,182,212,0.3)'}}>
        {loading?'Chargement...':'🏢 Fiche entreprise IA'}
      </button>
      {open && fiche && (
        <div style={{...G.card,marginTop:8,background:'rgba(6,182,212,0.05)',border:'1px solid rgba(6,182,212,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#06b6d4',marginBottom:8}}>🏢 {fiche.nom}</div>
          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:8}}>{fiche.fiche}</div>
          {fiche.offres?.length>0&&<div style={{fontSize:11,color:'#64748b'}}>{fiche.offres.length} offre(s) active(s) chez cet employeur</div>}
        </div>
      )}
    </div>
  );
};

const ReponsesSTAR = ({ offre }) => {
  const [data, setData] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const generer = async () => {
    if(data){setOpen(!open);return;}
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/reponses-star');
    setData(r.data.reponses||''); setOpen(true); setLoading(false);
  };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.3)'}}>
        {loading?'Generation...':'⭐ Reponses STAR pour cet entretien'}
      </button>
      {open && data && (
        <div style={{...G.card,marginTop:8,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#fbbf24',marginBottom:8}}>⭐ Methode STAR</div>
          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{data}</div>
        </div>
      )}
    </div>
  );
};

const SimulateurEntretien = ({ offre }) => {
  const [open, setOpen] = React.useState(false);
  const [historique, setHistorique] = React.useState([]);
  const [reponse, setReponse] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const envoyer = async (rep) => {
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/simuler-entretien', {reponse:rep||'', historique});
    setHistorique(r.data.historique);
    setReponse('');
    setLoading(false);
  };

  const demarrer = () => { setOpen(true); setHistorique([]); envoyer(''); };

  return (
    <div style={{marginBottom:8}}>
      <button onClick={open?()=>setOpen(false):demarrer} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(236,72,153,0.2)',color:'#ec4899',border:'1px solid rgba(236,72,153,0.3)'}}>
        🎭 {open?'Fermer le simulateur':'Simuler un entretien IA'}
      </button>
      {open && (
        <div style={{...G.card,marginTop:8,background:'rgba(236,72,153,0.05)',border:'1px solid rgba(236,72,153,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#ec4899',marginBottom:10}}>🎭 Simulateur entretien — {offre.company||offre.title}</div>
          <div style={{maxHeight:300,overflowY:'auto',marginBottom:10}}>
            {historique.map((m,i)=>(
              <div key={i} style={{marginBottom:8,padding:'8px 10px',borderRadius:8,background:m.role==='user'?'rgba(139,92,246,0.1)':'rgba(236,72,153,0.08)',border:'1px solid '+(m.role==='user'?'rgba(139,92,246,0.2)':'rgba(236,72,153,0.2)')}}>
                <div style={{fontSize:10,color:'#64748b',marginBottom:4}}>{m.role==='user'?'Vous':'Recruteur IA'}</div>
                <div style={{fontSize:12,color:'#e2e8f0',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{m.content}</div>
              </div>
            ))}
            {loading&&<div style={{textAlign:'center',color:'#64748b',fontSize:12}}>Le recruteur reflechit...</div>}
          </div>
          <div style={{display:'flex',gap:8}}>
            <textarea value={reponse} onChange={e=>setReponse(e.target.value)} placeholder="Votre reponse..." style={{...G.inp,flex:1,height:60,resize:'none',fontSize:12}} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),envoyer(reponse))}/>
            <button onClick={()=>envoyer(reponse)} disabled={loading||!reponse.trim()} style={{...G.btn,padding:'8px 14px',fontSize:12,background:'rgba(236,72,153,0.3)',color:'#ec4899'}}>Envoyer</button>
          </div>
        </div>
      )}
    </div>
  );
};

const CVOptimise = ({ offre }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [progressMsg, setProgressMsg] = React.useState('');
  const [showApercu, setShowApercu] = React.useState(false);
  const [lettre, setLettre] = React.useState('');
  const [lettreLoading, setLettreLoading] = React.useState(false);

  const generer = async () => {
    setLoading(true);
    setError('');
    setProgressMsg('Demarrage de la generation...');
    try {
      const start = await axios.post(API+'/jobs/'+offre.id+'/cv-optimise', {}, {timeout: 15000});
      if(start.data.error) {
        setError(start.data.error);
        setLoading(false);
        return;
      }
      const cvId = start.data.cv_optimise_id;
      setProgressMsg('Analyse du CV et reformulation en cours (30-60s)...');

      let attempts = 0;
      const maxAttempts = 24; // jusqu'a 2 minutes (24 x 5s)
      const poll = async () => {
        attempts++;
        try {
          const r = await axios.get(API+'/cv-optimise/'+cvId+'/status', {timeout: 10000});
          if(r.data.status === 'done') {
            setData(r.data);
            setLoading(false);
          } else if(r.data.status === 'error') {
            setError('La generation a echoue, veuillez reessayer.');
            setLoading(false);
          } else if(attempts >= maxAttempts) {
            setError('La generation prend trop de temps, veuillez reessayer.');
            setLoading(false);
          } else {
            setProgressMsg('Reformulation en cours... ('+attempts*5+'s)');
            setTimeout(poll, 5000);
          }
        } catch(e) {
          if(attempts >= maxAttempts) {
            setError('Erreur lors de la verification du statut.');
            setLoading(false);
          } else {
            setTimeout(poll, 5000);
          }
        }
      };
      setTimeout(poll, 5000);
    } catch(e) {
      setError(e.response?.data?.error || 'Erreur lors du demarrage de la generation');
      setLoading(false);
    }
  };

  const telechargerPDF = () => window.open(API+'/cv-optimise/'+data.cv_optimise_id+'/pdf', '_blank');
  const telechargerDOCX = () => window.open(API+'/cv-optimise/'+data.cv_optimise_id+'/docx', '_blank');
  const genererLettre = async () => {
    if(!data) return;
    setLettreLoading(true);
    try {
      const r = await axios.post(API+'/cv-optimise/'+data.cv_optimise_id+'/lettre', {
        texte_offre: offre.description || '', titre_offre: offre.title || ''
      }, {timeout: 30000});
      setLettre(r.data.lettre || '');
    } catch(e) {
      setLettre('Erreur lors de la generation de la lettre.');
    }
    setLettreLoading(false);
  };

  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(168,85,247,0.18)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.35)'}}>
        {loading?(progressMsg||'Generation en cours...'):'📄 Générer CV optimisé pour cette offre'}
      </button>
      {error && (
        <div style={{...G.card,marginTop:8,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontSize:12}}>
          {error}
        </div>
      )}
      {data && (
        <div style={{...G.card,marginTop:8,background:'rgba(168,85,247,0.05)',border:'1px solid rgba(168,85,247,0.2)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#c084fc',marginBottom:8}}>📄 CV optimisé généré</div>
          <div style={{fontSize:12,color:'#e2e8f0',marginBottom:6}}><strong>Titre adapté:</strong> {data.titre_accroche}</div>
          <div style={{fontSize:11,color:'#94a3b8',marginBottom:10,lineHeight:1.6}}>{data.resume}</div>
          {data.points_cles_mis_en_avant && (
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'#c084fc',fontWeight:600,marginBottom:4}}>Points mis en avant pour cette offre:</div>
              {data.points_cles_mis_en_avant.map((p,i)=>(
                <div key={i} style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>✨ {p}</div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button onClick={telechargerPDF} style={{...G.btn,flex:1,padding:'10px',fontSize:12,background:'rgba(168,85,247,0.3)',color:'#c084fc'}}>
              📥 PDF
            </button>
            <button onClick={telechargerDOCX} style={{...G.btn,flex:1,padding:'10px',fontSize:12,background:'rgba(59,130,246,0.3)',color:'#60a5fa'}}>
              📥 Word
            </button>
          </div>

          <button onClick={()=>setShowApercu(!showApercu)} style={{...G.btn,width:'100%',padding:'8px',fontSize:11,background:'transparent',color:'#94a3b8',border:'1px solid #334155',marginBottom:8}}>
            {showApercu?'Masquer':'👁 Voir'} le detail des experiences reformulees
          </button>

          {showApercu && (
            <div style={{marginBottom:10}}>
              {(data.competences_ordonnees||[]).length>0 && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#c084fc',marginBottom:4}}>Competences (ordre adapte a l'offre):</div>
                  <div style={{fontSize:10,color:'#94a3b8',lineHeight:1.6}}>{(data.competences_ordonnees||[]).join(', ')}</div>
                </div>
              )}
              {(data.experiences||[]).map((e,i)=>(
                <div key={i} style={{marginBottom:10,padding:8,background:'rgba(15,23,42,0.4)',borderRadius:6}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#e2e8f0'}}>{e.titre}{e.entreprise?' — '+e.entreprise:''}</div>
                  <div style={{fontSize:9,color:'#64748b',marginBottom:4}}>{e.periode}</div>
                  <div style={{fontSize:10,color:'#94a3b8',whiteSpace:'pre-wrap',lineHeight:1.6}}>{e.description}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={genererLettre} disabled={lettreLoading} style={{...G.btn,width:'100%',padding:'10px',fontSize:12,background:'rgba(34,197,94,0.18)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)'}}>
            {lettreLoading?'Generation de la lettre...':'✉️ Generer la lettre de motivation assortie'}
          </button>

          {lettre && (
            <div style={{...G.card,marginTop:10,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#4ade80'}}>✉️ Lettre de motivation</div>
                <button onClick={()=>navigator.clipboard.writeText(lettre)} style={{...G.btn,padding:'4px 10px',fontSize:10,background:'rgba(34,197,94,0.2)',color:'#4ade80'}}>Copier</button>
              </div>
              <div style={{fontSize:11,color:'#e2e8f0',whiteSpace:'pre-wrap',lineHeight:1.7}}>{lettre}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
const MatchCV = ({ offre }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const generer = async () => {
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/match-cv');
    setData(r.data);
    setLoading(false);
  };
  const verdictColor = {'POSTULER MAINTENANT':'#22c55e','POSTULER':'#10b981','A SURVEILLER':'#f59e0b','PASSER':'#ef4444'};
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>
        {loading?'Analyse...':'🎯 Analyser mon match CV/Offre'}
      </button>
      {data && (
        <div style={{...G.card,marginTop:8,background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700,color:'#10b981'}}>Match: {data.score_match}%</span>
            <span style={{background:(verdictColor[data.verdict]||'#64748b')+'20',color:verdictColor[data.verdict]||'#64748b',padding:'3px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>{data.verdict}</span>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,color:'#22c55e',fontWeight:600,marginBottom:4}}>Points forts:</div>
            {(data.points_forts||[]).map((p,i)=><div key={i} style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>✅ {p}</div>)}
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,color:'#f59e0b',fontWeight:600,marginBottom:4}}>A ameliorer:</div>
            {(data.points_faibles||[]).map((p,i)=><div key={i} style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>⚠️ {p}</div>)}
          </div>
          <div style={{fontSize:11,color:'#60a5fa',fontStyle:'italic'}}>{data.conseil}</div>
        </div>
      )}
    </div>
  );
};

const FranceTravailMessage = ({ offre }) => {
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const generer = async () => {
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/ft-message');
    setMsg(r.data.message||'');
    setLoading(false);
  };
  const copier = () => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  if(offre.source !== 'France Travail') return null;
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(239,68,68,0.15)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)'}}>
        {loading?'Generation...':'🇫🇷 Message candidature France Travail'}
      </button>
      {msg && (
        <div style={{...G.card,marginTop:8,background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:'#f87171'}}>🇫🇷 Message France Travail</span>
            <button onClick={copier} style={{...G.btn,padding:'3px 10px',fontSize:11,background:copied?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)',color:copied?'#22c55e':'#f87171'}}>{copied?'Copie!':'Copier'}</button>
          </div>
          <div style={{fontSize:12,color:'#e2e8f0',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{msg}</div>
          {offre.url && <a href={offre.url} target="_blank" rel="noopener noreferrer" style={{...G.btn,marginTop:8,padding:'6px 14px',fontSize:12,background:'rgba(239,68,68,0.2)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)',textDecoration:'none',display:'inline-flex'}}>Postuler sur France Travail</a>}
        </div>
      )}
    </div>
  );
};

const LinkedInMessage = ({ offre }) => {
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const generer = async () => {
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/linkedin-message');
    setMsg(r.data.message||'');
    setLoading(false);
  };
  const copier = () => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>
        {loading?'Generation...':'💼 Message LinkedIn recruteur'}
      </button>
      {msg && (
        <div style={{...G.card,marginTop:8,background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:'#60a5fa'}}>💼 Message LinkedIn</span>
            <button onClick={copier} style={{...G.btn,padding:'3px 10px',fontSize:11,background:copied?'rgba(34,197,94,0.2)':'rgba(59,130,246,0.2)',color:copied?'#22c55e':'#60a5fa'}}>{copied?'Copie!':'Copier'}</button>
          </div>
          <div style={{fontSize:12,color:'#e2e8f0',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{msg}</div>
        </div>
      )}
    </div>
  );
};

const EntretienIA = ({ offre }) => {
  const [questions, setQuestions] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const generer = async () => {
    if(questions){setOpen(!open);return;}
    setLoading(true);
    const r = await axios.post(API+'/jobs/'+offre.id+'/entretien');
    setQuestions(r.data.questions||'');
    setOpen(true);
    setLoading(false);
  };
  return (
    <div style={{marginBottom:8}}>
      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13,background:'rgba(16,185,129,0.2)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>
        {loading?'Génération...':'🎯 Préparer mon entretien (5 questions)'}
      </button>
      {open && questions && (
        <div style={{...G.card,marginTop:8,background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#10b981',marginBottom:8}}>🎯 Préparation entretien</div>
          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{questions}</div>
        </div>
      )}
    </div>
  );
};

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

const OffresPage = ({ profil, favoris, setFavoris, onPostuler, postules=[] }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score');
  const [minScore, setMinScore] = useState(60);
  const [sourceFilter, setSourceFilter] = useState('tous');
  const [detail, setDetail] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const suggestions = ['Product Owner','MOA Data','Data Analyst','Chef de Projet','Business Analyst','Data Engineer','Scrum Master'];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let url = search ? API+'/search?q='+encodeURIComponent(search)+'&sort='+sort : API+'/jobs?limit=500&sort='+sort+'&minScore='+minScore;
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
  const lancerComparaison = async () => {
    if(compareIds.length < 2) return alert('Selectionnez 2 offres avec ⚖');
    const r = await axios.post(API+'/jobs/comparer', {ids: compareIds});
    setCompareData(r.data);
  };

  const toggleFavori = async (job) => {
    const isFav = favoris.includes(job.id);
    if (isFav) { await axios.delete(API+'/favoris/'+job.id); setFavoris(f=>f.filter(x=>x!==job.id)); }
    else { await axios.post(API+'/favoris',{job_id:job.id}); setFavoris(f=>[...f,job.id]); }
  };

  if (compareData) return (
    <div>
      <button onClick={()=>setCompareData(null)} style={{background:'transparent',border:'none',color:'#8b5cf6',cursor:'pointer',fontSize:13,marginBottom:16}}>← Retour</button>
      <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:12}}>Comparaison de {compareData.length} offres</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat('+compareData.length+',1fr)',gap:10}}>
        {compareData.map((job,i)=>(
          <div key={i} style={{...G.card,borderTop:'3px solid '+['#8b5cf6','#3b82f6','#10b981'][i]}}>
            <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:4}}>{job.title}</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>{job.company}</div>
            <ScoreCircle score={job.ia_score||0} size={52}/>
            <div style={{marginTop:8}}>
              <div style={{fontSize:10,color:'#22c55e',marginBottom:4}}>Competences rares: {job.raresMatch?.length||0}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>{(job.raresMatch||[]).map(c=><span key={c} style={{...G.tag,fontSize:9}}>{c}</span>)}</div>
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontSize:10,color:'#60a5fa',marginBottom:4}}>Standard: {job.stdMatch?.length||0}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>{(job.stdMatch||[]).map(c=><span key={c} style={{...G.tag,fontSize:9,color:'#60a5fa',background:'rgba(59,130,246,0.1)'}}>{c}</span>)}</div>
            </div>
            <div style={{marginTop:8,fontSize:10,color:job.idf?'#22c55e':'#ef4444'}}>{job.idf?'✅ IDF':'❌ Hors IDF'}</div>
            <button onClick={()=>onPostuler(job)} style={{...G.btn,width:'100%',padding:'8px',fontSize:11,marginTop:8}}><Send size={11}/> Postuler</button>
          </div>
        ))}
      </div>
    </div>
  );

  if (detail) return (
    <div>
      <button onClick={()=>setDetail(null)} style={{background:'transparent',border:'none',color:'#8b5cf6',cursor:'pointer',fontSize:13,marginBottom:16}}>← Retour</button>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:16}}>
          <div className='job-avatar' style={{width:52,height:52,borderRadius:13,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(detail.company||'?')[0].toUpperCase()}</div>
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
        <FicheEntreprise offre={detail}/>
        <ReponsesSTAR offre={detail}/>
        <CVOptimise offre={detail}/>
        <MatchCV offre={detail}/>
        <ScoreDetail offre={detail}/>
        <PitchIA offre={detail}/>
        <EntretienIA offre={detail}/>
        <SimulateurEntretien offre={detail}/>
        <FranceTravailMessage offre={detail}/>
        <LinkedInMessage offre={detail}/>
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:12,color:'#64748b'}}>{filtered.length} offres {minScore>0?'>= '+minScore+'%':''} · 21 derniers jours</div>
        {compareIds.length>0&&<button onClick={lancerComparaison} style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(16,185,129,0.2)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>⚖ Comparer ({compareIds.length})</button>}
      </div>
      {loading&&<div style={{textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>}
      {filtered.map(job=>(
        <div key={job.id} style={{...G.card,marginBottom:12,cursor:'pointer'}} onClick={()=>setDetail(job)}>
          <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:10}}>
            <div className='job-avatar' style={{width:44,height:44,borderRadius:11,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(job.company||'?')[0].toUpperCase()}</div>
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
              <button onClick={()=>setCompareIds(prev=>prev.includes(job.id)?prev.filter(x=>x!==job.id):[...prev.slice(-1),job.id])} style={{background:'transparent',border:'none',cursor:'pointer',color:compareIds.includes(job.id)?'#10b981':'#334155',fontSize:16}}>⚖</button>
              <button onClick={()=>onPostuler(job)} style={{...G.btn,padding:'6px 14px',fontSize:12,background:postules.includes(job.id)?'rgba(34,197,94,0.3)':'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:postules.includes(job.id)?'#22c55e':'#fff'}}><Send size={12}/> {postules.includes(job.id)?'Postule !':'Postuler'}</button>
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
  const [searchCand, setSearchCand] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const nbRelance = candidatures.filter(aRelancer).length;
  const candFiltered = candidatures.filter(c => {
    const matchSearch = !searchCand || (c.title||'').toLowerCase().includes(searchCand.toLowerCase()) || (c.company||'').toLowerCase().includes(searchCand.toLowerCase());
    const matchStatut = filterStatut==='tous' || c.statut===filterStatut;
    return matchSearch && matchStatut;
  });
  const exportCSV = () => window.open(API+'/candidatures/export','_blank');
  const [showManuel, setShowManuel] = React.useState(false);
  const [formManuel, setFormManuel] = React.useState({title:'',company:'',url:'',contact_rh:'',contact_linkedin:'',contact_email:'',notes:'',source_candidature:'LinkedIn',motivation_score:3});
  const addManuel = async () => {
    if(!formManuel.title||!formManuel.company) return alert('Titre et entreprise requis');
    const r = await axios.post(API+'/candidatures/manuelle', formManuel);
    setCandidatures(c=>[r.data,...c]);
    setFormManuel({title:'',company:'',url:'',contact_rh:'',contact_linkedin:'',contact_email:'',notes:'',source_candidature:'LinkedIn',motivation_score:3});
    setShowManuel(false);
  };
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
        {STATUTS.map(s=><div key={s.id} style={{...G.card,padding:10,textAlign:'center',borderTop:'3px solid '+s.color}}><div style={{fontSize:20,fontWeight:800,color:s.color}}>{candidatures.filter(c=>c.statut===s.id).length}</div><div style={{fontSize:11,color:'#94a3b8'}}>{s.emoji}</div></div>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <button onClick={()=>setShowManuel(!showManuel)} style={{...G.btn,padding:'6px 14px',fontSize:11}}>+ Ajouter manuellement</button>
        <button onClick={exportCSV} style={{...G.btn,padding:'6px 14px',fontSize:11,background:'rgba(34,197,94,0.2)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.3)'}}>📊 Export CSV</button>
      </div>
      {showManuel && (
        <div style={{...G.card,marginBottom:12,border:'1px solid rgba(139,92,246,0.3)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0',marginBottom:10}}>Ajouter une candidature</div>
          <input value={formManuel.title} onChange={e=>setFormManuel({...formManuel,title:e.target.value})} placeholder="Titre du poste *" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <input value={formManuel.company} onChange={e=>setFormManuel({...formManuel,company:e.target.value})} placeholder="Entreprise *" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <input value={formManuel.url} onChange={e=>setFormManuel({...formManuel,url:e.target.value})} placeholder="URL offre" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <input value={formManuel.contact_rh} onChange={e=>setFormManuel({...formManuel,contact_rh:e.target.value})} placeholder="Nom du RH/recruteur" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <input value={formManuel.contact_linkedin} onChange={e=>setFormManuel({...formManuel,contact_linkedin:e.target.value})} placeholder="LinkedIn du recruteur" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <input value={formManuel.contact_email} onChange={e=>setFormManuel({...formManuel,contact_email:e.target.value})} placeholder="Email recruteur" style={{...G.inp,marginBottom:6,fontSize:12}}/>
          <select value={formManuel.source_candidature} onChange={e=>setFormManuel({...formManuel,source_candidature:e.target.value})} style={{...G.inp,marginBottom:6,fontSize:12}}>
            <option>LinkedIn</option>
            <option>Site entreprise</option>
            <option>JobAssistant</option>
            <option>Cooptation</option>
            <option>Cabinet recrutement</option>
            <option>Autre</option>
          </select>
          <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Motivation: {formManuel.motivation_score}/5</div>
          <input type="range" min="1" max="5" value={formManuel.motivation_score} onChange={e=>setFormManuel({...formManuel,motivation_score:parseInt(e.target.value)})} style={{width:'100%',marginBottom:8}}/>
          <textarea value={formManuel.notes} onChange={e=>setFormManuel({...formManuel,notes:e.target.value})} placeholder="Notes..." style={{...G.inp,height:50,fontSize:11,resize:'none',marginBottom:8}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={addManuel} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Ajouter</button>
            <button onClick={()=>setShowManuel(false)} style={{...G.btn,padding:'8px 16px',fontSize:12,background:'rgba(100,116,139,0.2)'}}>Annuler</button>
          </div>
        </div>
      )}
      <div style={{...G.card,marginBottom:10,padding:10}}>
        <input value={searchCand} onChange={e=>setSearchCand(e.target.value)} placeholder="Rechercher par titre ou entreprise..." style={{...G.inp,marginBottom:8,fontSize:12}}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {['tous','postule','relance','entretien','offre','refus'].map(s=>(
            <button key={s} onClick={()=>setFilterStatut(s)} style={{...G.btn,padding:'3px 10px',fontSize:10,background:filterStatut===s?'rgba(139,92,246,0.3)':'transparent',color:filterStatut===s?'#a78bfa':'#64748b',border:'1px solid '+(filterStatut===s?'rgba(139,92,246,0.5)':'#334155')}}>{s}</button>
          ))}
        </div>
      </div>
      {nbRelance>0&&<div style={{...G.card,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',marginBottom:12,fontSize:12,color:'#f59e0b',fontWeight:600}}>🔔 {nbRelance} candidature(s) a relancer</div>}
      {candFiltered.length===0?<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune candidature trouvee</div>:candFiltered.map(c=>{
        const s=STATUTS.find(x=>x.id===c.statut)||STATUTS[0];
        return (
          <div key={c.id} style={{...G.card,marginBottom:10,borderLeft:'3px solid '+s.color}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <div className='job-avatar' style={{width:40,height:40,borderRadius:10,background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(c.company||'?')[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>{c.company} · {joursDepuis(c.date_postulation)} · <span style={{color:'#64748b'}}>{c.source_candidature||'JobAssistant'}</span></div>
                {c.contact_rh&&<div style={{fontSize:10,color:'#60a5fa',marginBottom:2}}>👤 {c.contact_rh} {c.contact_email&&'· '+c.contact_email}</div>}
                {c.contact_linkedin&&<a href={c.contact_linkedin} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'#a78bfa'}}>LinkedIn recruteur</a>}
                {c.motivation_score>0&&<div style={{fontSize:10,color:'#ec4899',marginBottom:2}}>{'♥'.repeat(c.motivation_score)} Motivation: {c.motivation_score}/5</div>}
                {aRelancer(c)&&<div style={{fontSize:11,color:'#f59e0b',marginBottom:4}}>🔔 A relancer !</div>}
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
                  {STATUTS.map(st=><button key={st.id} onClick={()=>updateStatut(c.id,st.id)} style={{background:c.statut===st.id?st.color+'25':'transparent',color:c.statut===st.id?st.color:'#475569',border:'1px solid '+(c.statut===st.id?st.color+'80':'#334155'),borderRadius:6,padding:'2px 8px',fontSize:10,cursor:'pointer'}}>{c.statut===st.id&&'✓ '}{st.label}</button>)}
                </div>
                {c.statut==='entretien'&&(
                  <div style={{padding:8,marginBottom:6,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:600,color:'#f59e0b'}}>Preparation: {c.score_preparation||0}%</span>
                      <span style={{fontSize:10,color:'#64748b'}}>{c.score_preparation===100?'✅ Pret':'En cours...'}</span>
                    </div>
                    <div style={{height:4,background:'rgba(30,41,59,0.8)',borderRadius:2,marginBottom:6}}>
                      <div style={{height:4,width:(c.score_preparation||0)+'%',background:c.score_preparation===100?'#22c55e':'#f59e0b',borderRadius:2}}/>
                    </div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {[{key:'prep_lettre',label:'✉️ Lettre'},{key:'prep_pitch',label:'⚡ Pitch'},{key:'prep_star',label:'⭐ STAR'},{key:'prep_entretien',label:'🎯 Questions'},{key:'prep_entreprise',label:'🏢 Entreprise'}].map(p=>(
                        <button key={p.key} onClick={async()=>{
                          const updated={...c,[p.key]:!c[p.key]};
                          const r=await axios.patch(API+'/candidatures/'+c.id+'/preparation',{prep_lettre:updated.prep_lettre||false,prep_pitch:updated.prep_pitch||false,prep_star:updated.prep_star||false,prep_entretien:updated.prep_entretien||false,prep_entreprise:updated.prep_entreprise||false});
                          setCandidatures(cs=>cs.map(x=>x.id===c.id?{...x,[p.key]:!c[p.key],score_preparation:r.data.score}:x));
                        }} style={{background:c[p.key]?'rgba(34,197,94,0.2)':'transparent',color:c[p.key]?'#22c55e':'#64748b',border:'1px solid '+(c[p.key]?'rgba(34,197,94,0.3)':'#334155'),borderRadius:6,padding:'2px 8px',fontSize:10,cursor:'pointer'}}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
  const [uploading, setUploading] = useState(false);
  const uploadCV = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('cv', file);
    try {
      const r = await axios.post(API+'/profil/upload-cv', form, {headers:{'Content-Type':'multipart/form-data'}});
      alert('CV analyse ! ' + (r.data.data.competences||[]).length + ' competences extraites.');
      window.location.reload();
    } catch(e) { alert('Erreur: '+e.message); }
    setUploading(false);
  };
  const [form, setForm] = useState({});
  const [newComp, setNewComp] = useState('');
  useEffect(()=>{if(profil)setForm(profil);},[profil]);
  const save = async () => { const r=await axios.put(API+'/profil',form); setProfil(r.data); setEditing(false); };
  const addComp = async () => { if(!newComp.trim())return; const r=await axios.post(API+'/profil/competence',{competence:newComp.trim()}); setProfil(p=>({...p,competences:r.data.competences})); setNewComp(''); };
  const removeComp = async (c) => { const r=await axios.delete(API+'/profil/competence',{data:{competence:c}}); setProfil(p=>({...p,competences:r.data.competences})); };
  const [ats, setAts] = React.useState(null);
  const [atsLoading, setAtsLoading] = React.useState(false);
  const analyserATS = async () => {
    setAtsLoading(true);
    const r = await axios.post(API+'/analyse-ats');
    setAts(r.data);
    setAtsLoading(false);
  };
  if(!profil) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Profil non disponible</div>;
  return (
    <div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{profil.nom}</div>
          <div style={{display:'flex',gap:8}}>
            <label style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)',cursor:'pointer'}}>
              {uploading?'Analyse...':'📤 Upload CV'}
              <input type="file" accept=".pdf" onChange={uploadCV} style={{display:'none'}}/>
            </label>

            <button onClick={async()=>{
              try {
                const resp = await fetch(API+'/profil/cv-original');
                if(resp.ok){
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mon_cv.pdf';
                  a.click();
                  URL.revokeObjectURL(url);
                } else {
                  alert('Aucun CV uploade. Uploadez votre CV dabord.');
                }
              } catch(e){alert('Erreur: '+e.message);}
            }} style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(16,185,129,0.2)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>📎 Mon CV original</button>
            <button onClick={analyserATS} disabled={atsLoading} style={{...G.btn,padding:'6px 14px',fontSize:12,background:'rgba(245,158,11,0.2)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)'}}>🎯 {atsLoading?'Analyse...':'Score ATS'}</button>
            <button onClick={()=>setEditing(!editing)} style={{...G.btn,padding:'6px 14px',fontSize:12}}>{editing?'Annuler':'Modifier'}</button>
          </div>
        </div>
        {editing?<div>
          <input value={form.titre||''} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre" style={{...G.inp,marginBottom:8}}/>
          <button onClick={save} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Sauvegarder</button>
        </div>:<div style={{fontSize:13,color:'#94a3b8'}}>{profil.titre}</div>}
        {ats && (
          <div style={{marginTop:12,padding:12,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>Score ATS: {ats.score}%</span>
              <span style={{fontSize:11,color:ats.cv_utilise==='PDF uploadé'?'#22c55e':'#64748b'}}>{ats.cv_utilise==='PDF uploadé'?'📄 Basé sur votre CV PDF':'💾 Basé sur profil DB'}</span>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:'#ef4444',fontWeight:600,marginBottom:4}}>Manquantes:</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{(ats.manquantes||[]).map(c=><span key={c} style={{background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',borderRadius:4,padding:'2px 6px',fontSize:10}}>{c}</span>)}</div>
            </div>
            <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7,whiteSpace:'pre-wrap',marginTop:8}}>{ats.analyse}</div>
          </div>
        )}
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

const PortfolioPage = () => {
  const projets = [
    {
      nom:'JobAssistant IA', url:'https://jobassistant.monairbyte.eu',
      desc:'Plateforme de matching emploi avec IA — collecte automatique France Travail/Indeed, scoring IA, lettre de motivation, veille marche quotidienne.',
      stack:['React','Node.js','PostgreSQL','Claude IA','France Travail API','Docker'],
      impact:'581+ offres analysees · Rapport IA quotidien · Score matching personnalise',
      color:'#8b5cf6', emoji:'🎯'
    },
    {
      nom:'DocTracker', url:'https://doctracker.monairbyte.eu',
      desc:'SaaS de tracking documentaire forensique — OTP/PIN, watermark dynamique, tracking sessions temps reel, rapport PDF forensique.',
      stack:['React','Node.js','PostgreSQL','OpenAI API','Docker'],
      impact:'Tracking comportemental · Score risque · Export forensique PDF',
      color:'#3b82f6', emoji:'🔍'
    },
    {
      nom:'BI Stack Association', url:'https://app.monairbyte.eu',
      desc:'Plateforme digitale 5 modules pour 150+ residents — Analytics, RAG/IA documentaire, CivicTech, Gestion collaborative.',
      stack:['React','Apache Superset','pgvector','OpenAI API','n8n','LangChain'],
      impact:'150+ residents · Architecture RAG operationnelle · Headless BI',
      color:'#10b981', emoji:'🏢'
    },
    {
      nom:'AdminIA', url:'https://adminia.monairbyte.eu',
      desc:'SaaS multi-tenant avec analyse PDF par IA, JWT auth, GPT-4o-mini integration.',
      stack:['React','Node.js','OpenAI GPT-4o','JWT','Docker'],
      impact:'Multi-tenant · Analyse PDF IA · Auth securisee',
      color:'#f59e0b', emoji:'🤖'
    },
  ];
  return (
    <div>
      <div style={{...G.card,marginBottom:16,background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.08))',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:15,fontWeight:800,color:'#fff',marginBottom:4}}>Mohamed Assalia Maiga</div>
        <div style={{fontSize:12,color:'#a78bfa',marginBottom:8}}>Product Owner Data & IA · Full Stack Builder · 9 ans exp</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['PSPO I','PSM I','RAG/pgvector','Apache Superset','Docker','n8n'].map(t=><span key={t} style={G.tag}>{t}</span>)}
        </div>
      </div>
      {projets.map((p,i)=>(
        <div key={i} style={{...G.card,marginBottom:12,borderLeft:'3px solid '+p.color}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>{p.emoji} {p.nom}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{p.impact}</div>
            </div>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{...G.btn,padding:'4px 10px',fontSize:11,background:p.color+'20',color:p.color,border:'1px solid '+p.color+'50',textDecoration:'none'}}>Voir</a>
          </div>
          <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,marginBottom:8}}>{p.desc}</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {p.stack.map(t=><span key={t} style={{...G.tag,fontSize:10}}>{t}</span>)}
          </div>
        </div>
      ))}
      <div style={{...G.card,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#a78bfa',marginBottom:6}}>GitHub</div>
        <a href="https://github.com/mamaiga1987" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#60a5fa'}}>github.com/mamaiga1987</a>
      </div>
    </div>
  );
};

const BanqueQuestionsPage = () => {
  const [questions, setQuestions] = React.useState([]);
  const [form, setForm] = React.useState({question:'',reponse:'',categorie:'Motivation',note:3});
  const [showForm, setShowForm] = React.useState(false);
  const categories = ['Motivation','Competences techniques','Experience','STAR','Comportemental','Salaire'];
  React.useEffect(()=>{ axios.get(API+'/questions').then(r=>setQuestions(r.data)); },[]);
  const add = async () => {
    if(!form.question) return;
    const r = await axios.post(API+'/questions', form);
    setQuestions(q=>[r.data,...q]);
    setForm({question:'',reponse:'',categorie:'Motivation',note:3});
    setShowForm(false);
  };
  const remove = async (id) => { await axios.delete(API+'/questions/'+id); setQuestions(q=>q.filter(x=>x.id!==id)); };
  return (
    <div>
      <button onClick={()=>setShowForm(!showForm)} style={{...G.btn,width:'100%',marginBottom:12}}>+ Ajouter une question</button>
      {showForm&&(
        <div style={{...G.card,marginBottom:12}}>
          <textarea value={form.question} onChange={e=>setForm({...form,question:e.target.value})} placeholder="Question d'entretien..." style={{...G.inp,height:60,resize:'none',marginBottom:8,fontSize:12}}/>
          <textarea value={form.reponse} onChange={e=>setForm({...form,reponse:e.target.value})} placeholder="Votre meilleure réponse..." style={{...G.inp,height:80,resize:'none',marginBottom:8,fontSize:12}}/>
          <select value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})} style={{...G.inp,marginBottom:8,fontSize:12}}>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
          <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Note: {form.note}/5</div>
          <input type="range" min="1" max="5" value={form.note} onChange={e=>setForm({...form,note:parseInt(e.target.value)})} style={{width:'100%',marginBottom:8}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={add} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Sauvegarder</button>
            <button onClick={()=>setShowForm(false)} style={{...G.btn,padding:'8px 16px',fontSize:12,background:'rgba(100,116,139,0.2)'}}>Annuler</button>
          </div>
        </div>
      )}
      {questions.length===0&&!showForm&&<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune question — Ajoutez vos questions d'entretien</div>}
      {categories.map(cat=>{
        const qs = questions.filter(q=>q.categorie===cat);
        if(qs.length===0) return null;
        return (
          <div key={cat} style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#a78bfa',marginBottom:8}}>📂 {cat} ({qs.length})</div>
            {qs.map(q=>(
              <div key={q.id} style={{...G.card,marginBottom:8,borderLeft:'3px solid #8b5cf6'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0',flex:1}}>{q.question}</div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{fontSize:10,color:'#f59e0b'}}>{'★'.repeat(q.note)}</span>
                    <button onClick={()=>remove(q.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={12}/></button>
                  </div>
                </div>
                {q.reponse&&<div style={{fontSize:11,color:'#64748b',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{q.reponse}</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const FormationsPage = () => {
  const [data, setData] = React.useState(null);
  React.useEffect(()=>{ axios.get(API+'/formations/recommandations').then(r=>setData(r.data)).catch(()=>setData({recommandations:[],manquantes:[]})); },[]);
  if(!data) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>;
  return (
    <div>
      <div style={{...G.card,marginBottom:12,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#a78bfa',marginBottom:6}}>Compétences manquantes vs marché</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {(data.manquantes||[]).map(c=><span key={c} style={{background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'2px 8px',fontSize:11}}>{c}</span>)}
        </div>
      </div>
      {(data.recommandations||[]).length===0&&<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune recommandation — votre profil est complet !</div>}
      {(data.recommandations||[]).map((f,i)=>(
        <div key={i} style={{...G.card,marginBottom:10,borderLeft:'3px solid #8b5cf6'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{f.competence}</div>
              <div style={{fontSize:11,color:'#64748b'}}>{f.plateforme} · {f.duree} · {f.niveau}</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {f.gratuit&&<span style={{background:'rgba(34,197,94,0.1)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)',borderRadius:6,padding:'2px 8px',fontSize:10}}>Gratuit</span>}
              <a href={f.url} target="_blank" rel="noopener noreferrer" style={{...G.btn,padding:'4px 10px',fontSize:11,textDecoration:'none'}}>Voir</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VeilleCompetencesPage = () => {
  const [data, setData] = React.useState(null);
  React.useEffect(()=>{ axios.get(API+'/veille/competences-tendance').then(r=>setData(r.data)).catch(()=>setData({manquantes:[],presentes:[]})); },[]);
  if(!data) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>;
  return (
    <div>
      <div style={{...G.card,marginBottom:12,background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#f87171',marginBottom:10}}>⚠️ Compétences demandées que vous n'avez pas</div>
        {(data.manquantes||[]).map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(239,68,68,0.1)'}}>
            <span style={{fontSize:12,color:'#e2e8f0'}}>{c.comp}</span>
            <div style={{textAlign:'right'}}>
              <span style={{fontSize:11,color:'#f87171',fontWeight:700}}>{c.nb} offres</span>
              {parseInt(c.nb_recent)>0&&<span style={{fontSize:10,color:'#64748b',marginLeft:6}}>+{c.nb_recent} cette semaine</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{...G.card,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#22c55e',marginBottom:10}}>✅ Vos compétences les plus demandées</div>
        {(data.presentes||[]).map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(34,197,94,0.1)'}}>
            <span style={{fontSize:12,color:'#e2e8f0'}}>{c.comp}</span>
            <span style={{fontSize:11,color:'#22c55e',fontWeight:700}}>{c.nb} offres</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatsAvanceesPage = () => {
  const [data, setData] = React.useState(null);
  React.useEffect(()=>{ axios.get(API+'/stats/avancees').then(r=>setData(r.data)).catch(()=>setData({})); },[]);
  if(!data) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>;
  const d = data.duree||{};
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
        {[
          {label:'Total candidatures',value:parseInt(d.total||0),color:'#8b5cf6'},
          {label:'Entretiens',value:parseInt(d.entretiens||0),color:'#f59e0b'},
          {label:'Offres recues',value:parseInt(d.offres||0),color:'#10b981'},
          {label:'Refus',value:parseInt(d.refus||0),color:'#ef4444'},
        ].map((s,i)=>(
          <div key={i} style={{...G.card,textAlign:'center',padding:12,borderTop:'3px solid '+s.color}}>
            <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'#64748b'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:10}}>Taux de reponse par source</div>
        {(data.parSource||[]).map((s,i)=>{
          const taux = s.total>0?Math.round(parseInt(s.reponses)/parseInt(s.total)*100):0;
          return (
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:11,color:'#94a3b8'}}>{s.source_candidature||'?'} ({s.total})</span>
                <span style={{fontSize:11,color:taux>30?'#22c55e':taux>10?'#f59e0b':'#ef4444',fontWeight:700}}>{taux}%</span>
              </div>
              <div style={{height:5,background:'rgba(30,41,59,0.8)',borderRadius:3}}>
                <div style={{height:5,width:taux+'%',background:taux>30?'#22c55e':taux>10?'#f59e0b':'#ef4444',borderRadius:3}}/>
              </div>
            </div>
          );
        })}
        {(data.parSource||[]).length===0&&<div style={{fontSize:12,color:'#64748b'}}>Pas encore de donnees</div>}
      </div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:10}}>Meilleur jour pour postuler</div>
        {(data.parJour||[]).map((j,i)=>{
          const taux = j.nb>0?Math.round(parseInt(j.reponses)/parseInt(j.nb)*100):0;
          return (
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(139,92,246,0.08)'}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{j.jour?.trim()}</span>
              <span style={{fontSize:11,color:'#64748b'}}>{j.nb} cand. · <span style={{color:taux>20?'#22c55e':'#f59e0b',fontWeight:700}}>{taux}% rep.</span></span>
            </div>
          );
        })}
        {(data.parJour||[]).length===0&&<div style={{fontSize:12,color:'#64748b'}}>Pas encore de donnees</div>}
      </div>
      <div style={{...G.card}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:8}}>Delai moyen</div>
        <div style={{fontSize:28,fontWeight:800,color:'#8b5cf6'}}>{Math.round(parseFloat(d.duree_moy||0))} jours</div>
        <div style={{fontSize:11,color:'#64748b'}}>depuis la date de postulation</div>
      </div>
    </div>
  );
};

const MetiersCiblesPage = () => {
  const [metiers, setMetiers] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({metier:'', requetes:''});
  const [editing, setEditing] = React.useState(null);
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(()=>{ axios.get(API+'/metiers').then(r=>setMetiers(r.data)); },[]);

  const add = async () => {
    if(!form.metier) return;
    const requetes = form.requetes ? form.requetes.split(',').map(r=>r.trim()).filter(Boolean) : [form.metier];
    const r = await axios.post(API+'/metiers', {metier:form.metier, requetes});
    setMetiers(m=>[...m, r.data]);
    setForm({metier:'', requetes:''});
    setShowForm(false);
  };

  const toggle = async (m) => {
    const r = await axios.patch(API+'/metiers/'+m.id, {actif:!m.actif});
    setMetiers(ms=>ms.map(x=>x.id===m.id?r.data:x));
  };

  const remove = async (id) => {
    await axios.delete(API+'/metiers/'+id);
    setMetiers(ms=>ms.filter(x=>x.id!==id));
  };

  const relancerCollecte = async () => {
    setLoading(true);
    setMsg('Collecte en cours...');
    const r = await axios.post(API+'/metiers/relancer-collecte');
    setMsg('✅ '+r.data.message);
    setLoading(false);
    setTimeout(()=>setMsg(''),5000);
  };

  const actifs = metiers.filter(m=>m.actif);
  const inactifs = metiers.filter(m=>!m.actif);

  return (
    <div>
      <div style={{...G.card,marginBottom:12,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#a78bfa',marginBottom:4}}>{actifs.length} métiers actifs</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:10}}>La collecte cherche ces métiers sur France Travail et Indeed</div>
        <button onClick={relancerCollecte} disabled={loading} style={{...G.btn,width:'100%',padding:'10px',fontSize:13}}>
          {loading?'Collecte en cours...':'🚀 Relancer la collecte maintenant'}
        </button>
        {msg&&<div style={{fontSize:12,color:'#22c55e',marginTop:8,textAlign:'center'}}>{msg}</div>}
      </div>

      <button onClick={()=>setShowForm(!showForm)} style={{...G.btn,width:'100%',marginBottom:12}}>
        + Ajouter un métier ciblé
      </button>

      {showForm&&(
        <div style={{...G.card,marginBottom:12}}>
          <input value={form.metier} onChange={e=>setForm({...form,metier:e.target.value})} 
            placeholder="Ex: Business Analyst" style={{...G.inp,marginBottom:8,fontSize:12}}/>
          <input value={form.requetes} onChange={e=>setForm({...form,requetes:e.target.value})} 
            placeholder="Requetes séparées par virgule: business analyst, analyste metier, BA" 
            style={{...G.inp,marginBottom:8,fontSize:12}}/>
          <div style={{fontSize:10,color:'#64748b',marginBottom:8}}>Les requêtes sont utilisées pour chercher les offres sur France Travail</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={add} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Ajouter</button>
            <button onClick={()=>setShowForm(false)} style={{...G.btn,padding:'8px 16px',fontSize:12,background:'rgba(100,116,139,0.2)'}}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{fontSize:12,fontWeight:700,color:'#22c55e',marginBottom:8}}>✅ Actifs ({actifs.length})</div>
      {actifs.map(m=>(
        <div key={m.id} style={{...G.card,marginBottom:8,borderLeft:'3px solid #22c55e'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{m.metier}</div>
              <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
                Requêtes: {(m.requetes||[]).join(', ')}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>toggle(m)} style={{...G.btn,padding:'3px 8px',fontSize:10,background:'rgba(245,158,11,0.2)',color:'#f59e0b'}}>Désactiver</button>
              <button onClick={()=>remove(m.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
            </div>
          </div>
        </div>
      ))}

      {inactifs.length>0&&(
        <>
          <div style={{fontSize:12,fontWeight:700,color:'#ef4444',marginBottom:8,marginTop:12}}>⏸ Inactifs ({inactifs.length})</div>
          {inactifs.map(m=>(
            <div key={m.id} style={{...G.card,marginBottom:8,borderLeft:'3px solid #ef4444',opacity:0.6}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,color:'#94a3b8'}}>{m.metier}</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>toggle(m)} style={{...G.btn,padding:'3px 8px',fontSize:10,background:'rgba(34,197,94,0.2)',color:'#22c55e'}}>Activer</button>
                  <button onClick={()=>remove(m.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

const OffreLibrePage = () => {
  const [titreOffre, setTitreOffre] = React.useState(() => localStorage.getItem('offre_libre_titre_draft') || '');
  const [texteOffre, setTexteOffre] = React.useState(() => localStorage.getItem('offre_libre_texte_draft') || '');
  const [loading, setLoading] = React.useState(false);
  const [progressMsg, setProgressMsg] = React.useState('');
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState(null);
  const [showApercu, setShowApercu] = React.useState(false);
  const [historique, setHistorique] = React.useState([]);
  const [showHistorique, setShowHistorique] = React.useState(false);
  const [lettre, setLettre] = React.useState('');
  const [lettreLoading, setLettreLoading] = React.useState(false);
  const [detectingTitre, setDetectingTitre] = React.useState(false);

  // Sauvegarde brouillon automatique
  React.useEffect(() => {
    localStorage.setItem('offre_libre_titre_draft', titreOffre);
  }, [titreOffre]);
  React.useEffect(() => {
    localStorage.setItem('offre_libre_texte_draft', texteOffre);
  }, [texteOffre]);

  const chargerHistorique = () => {
    axios.get(API+'/cv-optimise/historique').then(r => {
      setHistorique(r.data);
      setShowHistorique(true);
    }).catch(()=>{});
  };

  const detecterTitre = async () => {
    if(texteOffre.trim().length < 30 || titreOffre.trim()) return;
    setDetectingTitre(true);
    try {
      const r = await axios.post(API+'/cv-offre-libre/detecter-titre', { texte_offre: texteOffre }, {timeout: 15000});
      if(r.data.titre) setTitreOffre(r.data.titre);
    } catch(e) {}
    setDetectingTitre(false);
  };

  const genererLettre = async () => {
    if(!data) return;
    setLettreLoading(true);
    try {
      const r = await axios.post(API+'/cv-optimise/'+data.cv_optimise_id+'/lettre', {
        texte_offre: texteOffre, titre_offre: titreOffre
      }, {timeout: 30000});
      setLettre(r.data.lettre || '');
    } catch(e) {
      setLettre('Erreur lors de la generation de la lettre.');
    }
    setLettreLoading(false);
  };

  const generer = async () => {
    if(texteOffre.trim().length < 30) {
      setError('Collez le texte complet de l\'offre (au moins quelques lignes).');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    setProgressMsg('Demarrage de la generation...');
    try {
      const start = await axios.post(API+'/cv-offre-libre/generer', {
        titre_offre: titreOffre, texte_offre: texteOffre
      }, {timeout: 15000});
      if(start.data.error) {
        setError(start.data.error);
        setLoading(false);
        return;
      }
      const cvId = start.data.cv_optimise_id;
      setProgressMsg('Analyse de l\'offre et adaptation du CV (30-70s)...');

      let attempts = 0;
      const maxAttempts = 24;
      const poll = async () => {
        attempts++;
        try {
          const r = await axios.get(API+'/cv-optimise/'+cvId+'/status', {timeout: 10000});
          if(r.data.status === 'done') {
            setData(r.data);
            setLoading(false);
          } else if(r.data.status === 'error') {
            setError('La generation a echoue, veuillez reessayer.');
            setLoading(false);
          } else if(attempts >= maxAttempts) {
            setError('La generation prend trop de temps, veuillez reessayer.');
            setLoading(false);
          } else {
            setProgressMsg('Reformulation en cours... ('+attempts*5+'s)');
            setTimeout(poll, 5000);
          }
        } catch(e) {
          if(attempts >= maxAttempts) {
            setError('Erreur lors de la verification du statut.');
            setLoading(false);
          } else {
            setTimeout(poll, 5000);
          }
        }
      };
      setTimeout(poll, 5000);
    } catch(e) {
      setError(e.response?.data?.error || 'Erreur lors du demarrage de la generation');
      setLoading(false);
    }
  };

  const telechargerPDF = () => window.open(API+'/cv-optimise/'+data.cv_optimise_id+'/pdf', '_blank');
  const telechargerDOCX = () => window.open(API+'/cv-optimise/'+data.cv_optimise_id+'/docx', '_blank');

  return (
    <div>
      <div style={{...G.card,marginBottom:12,background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div style={{fontSize:13,fontWeight:700,color:'#c084fc'}}>📋 Coller une offre trouvee ailleurs</div>
          <button onClick={chargerHistorique} style={{...G.btn,padding:'4px 10px',fontSize:10,background:'rgba(168,85,247,0.15)',color:'#c084fc'}}>🕒 Historique</button>
        </div>
        <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.6}}>Trouve une offre sur LinkedIn, Welcome to the Jungle, le site d'une entreprise, etc. ? Colle son contenu ici pour generer un CV optimise specifiquement pour cette offre, base sur votre CV reel.</div>
      </div>

      {showHistorique && (
        <div style={{...G.card,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>CV optimises generes recemment</div>
            <button onClick={()=>setShowHistorique(false)} style={{background:'transparent',border:'none',color:'#64748b',cursor:'pointer',fontSize:11}}>Fermer</button>
          </div>
          {historique.length===0 && <div style={{fontSize:11,color:'#64748b'}}>Aucun CV genere pour le moment.</div>}
          {historique.map(h=>(
            <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(139,92,246,0.08)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'#e2e8f0'}}>{h.titre_affiche||'Offre sans titre'}{h.company?' — '+h.company:''}</div>
                <div style={{fontSize:9,color:'#64748b'}}>{new Date(h.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>window.open(API+'/cv-optimise/'+h.id+'/pdf','_blank')} style={{...G.btn,padding:'3px 8px',fontSize:10}}>PDF</button>
                <button onClick={()=>window.open(API+'/cv-optimise/'+h.id+'/docx','_blank')} style={{...G.btn,padding:'3px 8px',fontSize:10,background:'rgba(59,130,246,0.2)',color:'#60a5fa'}}>Word</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:6,marginBottom:8}}>
        <input value={titreOffre} onChange={e=>setTitreOffre(e.target.value)} placeholder="Titre du poste (ex: Data Product Manager - Fintech Paris)" style={{...G.inp,fontSize:13,flex:1}}/>
        {detectingTitre && <div style={{fontSize:10,color:'#c084fc',alignSelf:'center',whiteSpace:'nowrap'}}>Detection...</div>}
      </div>
      <textarea value={texteOffre} onChange={e=>setTexteOffre(e.target.value)} onBlur={detecterTitre} placeholder="Collez ici le texte complet de l'offre (description, missions, profil recherche...)" style={{...G.inp,height:220,resize:'vertical',fontSize:12,marginBottom:4,fontFamily:'inherit'}}/>
      <div style={{fontSize:10,color:'#64748b',marginBottom:8}}>Le titre se detecte automatiquement si vous le laissez vide. Le brouillon est sauvegarde automatiquement.</div>

      <button onClick={generer} disabled={loading} style={{...G.btn,width:'100%',padding:'12px',fontSize:13,background:'rgba(168,85,247,0.18)',color:'#c084fc',border:'1px solid rgba(168,85,247,0.35)',marginBottom:12}}>
        {loading?(progressMsg||'Generation en cours...'):'📄 Générer mon CV optimisé pour cette offre'}
      </button>

      {error && (
        <div style={{...G.card,marginBottom:12,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontSize:12}}>
          {error}
        </div>
      )}

      {data && (
        <div style={{...G.card,background:'rgba(168,85,247,0.05)',border:'1px solid rgba(168,85,247,0.2)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#c084fc',marginBottom:8}}>📄 CV optimisé généré</div>
          <div style={{fontSize:12,color:'#e2e8f0',marginBottom:6}}><strong>Titre adapté:</strong> {data.titre_accroche}</div>
          <div style={{fontSize:11,color:'#94a3b8',marginBottom:10,lineHeight:1.6}}>{data.resume}</div>
          {data.points_cles_mis_en_avant && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:'#c084fc',fontWeight:600,marginBottom:4}}>Points mis en avant pour cette offre:</div>
              {data.points_cles_mis_en_avant.map((p,i)=>(
                <div key={i} style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>✨ {p}</div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button onClick={telechargerPDF} style={{...G.btn,flex:1,padding:'10px',fontSize:12,background:'rgba(168,85,247,0.3)',color:'#c084fc'}}>
              📥 PDF
            </button>
            <button onClick={telechargerDOCX} style={{...G.btn,flex:1,padding:'10px',fontSize:12,background:'rgba(59,130,246,0.3)',color:'#60a5fa'}}>
              📥 Word
            </button>
          </div>

          <button onClick={()=>setShowApercu(!showApercu)} style={{...G.btn,width:'100%',padding:'8px',fontSize:11,background:'transparent',color:'#94a3b8',border:'1px solid #334155',marginBottom:8}}>
            {showApercu?'Masquer':'👁 Voir'} le detail des experiences reformulees
          </button>

          {showApercu && (
            <div style={{marginBottom:10}}>
              {(data.competences_ordonnees||[]).length>0 && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#c084fc',marginBottom:4}}>Competences (ordre adapte a l'offre):</div>
                  <div style={{fontSize:10,color:'#94a3b8',lineHeight:1.6}}>{(data.competences_ordonnees||[]).join(', ')}</div>
                </div>
              )}
              {(data.experiences||[]).map((e,i)=>(
                <div key={i} style={{marginBottom:10,padding:8,background:'rgba(15,23,42,0.4)',borderRadius:6}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#e2e8f0'}}>{e.titre}{e.entreprise?' — '+e.entreprise:''}</div>
                  <div style={{fontSize:9,color:'#64748b',marginBottom:4}}>{e.periode}</div>
                  <div style={{fontSize:10,color:'#94a3b8',whiteSpace:'pre-wrap',lineHeight:1.6}}>{e.description}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={genererLettre} disabled={lettreLoading} style={{...G.btn,width:'100%',padding:'10px',fontSize:12,background:'rgba(34,197,94,0.18)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)'}}>
            {lettreLoading?'Generation de la lettre...':'✉️ Generer la lettre de motivation assortie'}
          </button>

          {lettre && (
            <div style={{...G.card,marginTop:10,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#4ade80'}}>✉️ Lettre de motivation</div>
                <button onClick={()=>navigator.clipboard.writeText(lettre)} style={{...G.btn,padding:'4px 10px',fontSize:10,background:'rgba(34,197,94,0.2)',color:'#4ade80'}}>Copier</button>
              </div>
              <div style={{fontSize:11,color:'#e2e8f0',whiteSpace:'pre-wrap',lineHeight:1.7}}>{lettre}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BlacklistPage = () => {
  const [list, setList] = React.useState([]);
  const [form, setForm] = React.useState({company:'',raison:''});
  const [showForm, setShowForm] = React.useState(false);
  React.useEffect(()=>{axios.get(API+'/blacklist').then(r=>setList(r.data));},[]);
  const add = async () => {
    if(!form.company) return;
    const r = await axios.post(API+'/blacklist', form);
    setList(l=>[r.data,...l]); setForm({company:'',raison:''}); setShowForm(false);
  };
  const remove = async (id) => { await axios.delete(API+'/blacklist/'+id); setList(l=>l.filter(x=>x.id!==id)); };
  return (
    <div>
      <button onClick={()=>setShowForm(!showForm)} style={{...G.btn,width:'100%',marginBottom:12}}>+ Ajouter entreprise a blacklister</button>
      {showForm && (
        <div style={{...G.card,marginBottom:12}}>
          <input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Nom entreprise" style={{...G.inp,marginBottom:8}}/>
          <input value={form.raison} onChange={e=>setForm({...form,raison:e.target.value})} placeholder="Raison (refus, mauvaise culture...)" style={{...G.inp,marginBottom:8}}/>
          <button onClick={add} style={{...G.btn,padding:'8px 16px',fontSize:12}}>Blacklister</button>
        </div>
      )}
      {list.length===0&&!showForm&&<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucune entreprise blacklistee</div>}
      {list.map(e=>(
        <div key={e.id} style={{...G.card,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:'3px solid #ef4444'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{e.company}</div>
            {e.raison&&<div style={{fontSize:11,color:'#64748b'}}>{e.raison}</div>}
          </div>
          <button onClick={()=>remove(e.id)} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
        </div>
      ))}
    </div>
  );
};

const AgendaPage = () => {
  const [candidatures, setCandidatures] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  React.useEffect(()=>{
    axios.get(API+'/candidatures').then(r=>setCandidatures(r.data));
    axios.get(API+'/stats/candidatures').then(r=>setStats(r.data));
  },[]);

  const today = new Date();
  const jourSemaine = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][today.getDay()];
  
  const agenda = [
    {jour:'Lundi',action:'Postuler aux nouvelles offres 80%+',type:'offres',color:'#8b5cf6'},
    {jour:'Mardi',action:'Relancer candidatures sans reponse +7j',type:'relance',color:'#f59e0b'},
    {jour:'Mercredi',action:'Mettre a jour profil LinkedIn et CV',type:'profil',color:'#3b82f6'},
    {jour:'Jeudi',action:'Postuler offres 70%+ non encore traitees',type:'offres',color:'#8b5cf6'},
    {jour:'Vendredi',action:'Bilan semaine + preparer entretiens',type:'bilan',color:'#10b981'},
  ];

  const aRelancer = candidatures.filter(c=>c.statut==='postule'&&Math.floor((Date.now()-new Date(c.date_postulation))/86400000)>=7);

  return (
    <div>
      {stats && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
          <div style={{...G.card,textAlign:'center',padding:12}}>
            <div style={{fontSize:22,fontWeight:800,color:'#8b5cf6'}}>{stats.total}</div>
            <div style={{fontSize:10,color:'#64748b'}}>Candidatures</div>
          </div>
          <div style={{...G.card,textAlign:'center',padding:12}}>
            <div style={{fontSize:22,fontWeight:800,color:'#10b981'}}>{stats.tauxReponse}%</div>
            <div style={{fontSize:10,color:'#64748b'}}>Taux reponse</div>
          </div>
          <div style={{...G.card,textAlign:'center',padding:12}}>
            <div style={{fontSize:22,fontWeight:800,color:'#f59e0b'}}>{stats.aRelancer}</div>
            <div style={{fontSize:10,color:'#64748b'}}>A relancer</div>
          </div>
        </div>
      )}

      <div style={{...G.card,marginBottom:12,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#a78bfa',marginBottom:4}}>Aujourd'hui — {jourSemaine}</div>
        <div style={{fontSize:12,color:'#e2e8f0'}}>{agenda.find(a=>a.jour===jourSemaine)?.action||'Bon week-end ! Reposez-vous.'}</div>
      </div>

      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:10}}>Planning semaine</div>
        {agenda.map((a,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(139,92,246,0.08)'}}>
            <div style={{width:80,fontSize:11,fontWeight:700,color:a.jour===jourSemaine?a.color:'#64748b'}}>{a.jour}</div>
            <div style={{flex:1,fontSize:12,color:a.jour===jourSemaine?'#e2e8f0':'#64748b'}}>{a.action}</div>
            {a.jour===jourSemaine&&<div style={{width:8,height:8,borderRadius:'50%',background:a.color}}/>}
          </div>
        ))}
      </div>

      {aRelancer.length>0&&(
        <div style={{...G.card,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#f59e0b',marginBottom:8}}>A relancer maintenant ({aRelancer.length})</div>
          {aRelancer.map(c=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(245,158,11,0.1)'}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>{c.title}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>{c.company}</div>
              </div>
              <button onClick={async()=>{const r=await axios.post(API+'/candidatures/'+c.id+'/relance');alert(r.data.email);}} style={{...G.btn,padding:'4px 10px',fontSize:11,background:'rgba(245,158,11,0.2)',color:'#f59e0b'}}>Generer relance</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TendancesPage = () => {
  const [data, setData] = React.useState(null);
  const [entreprises, setEntreprises] = React.useState([]);
  React.useEffect(()=>{
    axios.get(API+'/stats/tendances').then(r=>setData(r.data));
    axios.get(API+'/stats/entreprises-map').then(r=>setEntreprises(r.data));
  },[]);
  if(!data) return <div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Chargement...</div>;
  return (
    <div>
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Repartition par metier</div>
        {(data.parMetier||[]).filter(m=>m.metier!=='Autre').map((m,i)=>{
          const colors=['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899','#06b6d4'];
          const max = Math.max(...data.parMetier.filter(x=>x.metier!=='Autre').map(x=>parseInt(x.nb)));
          return (
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:11,color:'#94a3b8'}}>{m.metier}</span>
                <span style={{fontSize:11,color:colors[i%colors.length],fontWeight:700}}>{m.nb} offres</span>
              </div>
              <div style={{height:6,background:'rgba(30,41,59,0.8)',borderRadius:3}}>
                <div style={{height:6,width:(parseInt(m.nb)/max*100)+'%',background:colors[i%colors.length],borderRadius:3}}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Sources des offres</div>
        {(data.parSource||[]).map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(139,92,246,0.1)'}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>{s.source}</span>
            <span style={{fontSize:12,color:'#a78bfa',fontWeight:700}}>{s.nb} offres</span>
          </div>
        ))}
      </div>

      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Top entreprises actives</div>
        {entreprises.slice(0,15).map((e,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(139,92,246,0.08)'}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>{e.company}</div>
              <div style={{fontSize:10,color:'#475569'}}>{e.location}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,color:'#a78bfa',fontWeight:700}}>{e.nb_offres} postes</div>
              <div style={{fontSize:10,color:'#64748b'}}>score moy: {e.score_moyen}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{...G.card}}>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Activite des 14 derniers jours</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={(data.parJour||[]).reverse()}>
            <XAxis dataKey="date" tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>{if(!v)return '';const d=new Date(v);return (d.getMonth()+1)+'/'+(d.getDate());}}/>
            <Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:10}}/>
            <Line type="monotone" dataKey="nb" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Offres"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HistoriquePage = () => {
  const [rapports, setRapports] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  React.useEffect(()=>{axios.get(API+'/veille/historique').then(r=>setRapports(r.data));},[]);
  return (
    <div>
      <div style={{fontSize:13,color:'#64748b',marginBottom:12}}>Derniers rapports de veille marche</div>
      {rapports.length===0&&<div style={{...G.card,textAlign:'center',padding:40,color:'#64748b'}}>Aucun rapport disponible</div>}
      {rapports.map((r,i)=>(
        <div key={r.id} style={{...G.card,marginBottom:10,cursor:'pointer',borderLeft:selected===i?'3px solid #8b5cf6':'3px solid transparent'}} onClick={()=>setSelected(selected===i?null:i)}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{new Date(r.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{r.total_offres} offres analysees · {r.nouvelles_offres} nouvelles</div>
            </div>
            <div style={{fontSize:20,color:'#8b5cf6'}}>{selected===i?'▲':'▼'}</div>
          </div>
          {selected===i&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'#a78bfa',marginBottom:6}}>Top Competences</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
                {(r.top_competences||[]).slice(0,5).map((c,j)=><span key={j} style={G.tag}>{c}</span>)}
              </div>
              <div style={{fontSize:12,fontWeight:600,color:'#a78bfa',marginBottom:6}}>Top Entreprises</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {(r.top_entreprises||[]).slice(0,5).map((e,j)=><span key={j} style={{...G.tag,color:'#10b981',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)'}}>{e}</span>)}
              </div>
            </div>
          )}
        </div>
      ))}
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
      <button onClick={async()=>{
        setMsg('Vectorisation du profil...');
        try {
          const r1 = await axios.post(API+'/profil/vectoriser');
          setMsg('Profil vectorisé ! Calcul scores sémantiques...');
          const r2 = await axios.post(API+'/recalcul-scores-combines');
          setMsg('✅ '+r2.data.message+' — Scoring sémantique actif !');
        } catch(e){setMsg('Erreur: '+e.message);}
        setTimeout(()=>setMsg(''),5000);
      }} style={{...G.btn,width:'100%',padding:'12px',fontSize:14,marginTop:8,background:'linear-gradient(135deg,#7c3aed,#0284c7)'}}>
        🧠 Activer le scoring sémantique (pgvector)
      </button>
    </div>
  );
};

const Dashboard = ({ stats, profil, setActive }) => {
  const evolution = (stats?.evolution||[]).map(e=>({day:{'Mon':'Lun','Tue':'Mar','Wed':'Mer','Thu':'Jeu','Fri':'Ven','Sat':'Sam','Sun':'Dim'}[e.day]||e.day,offres:parseInt(e.offres)}));
  const repartition = (stats?.repartition||[]).map(r=>({name:r.zone,value:parseInt(r.count)}));
  const [sending, setSending] = React.useState(false);
  const [metiers, setMetiers] = React.useState([
    {label:'Product Owner / MOA',score:61,color:'#8b5cf6'},
    {label:'Data Engineer',score:60,color:'#3b82f6'},
    {label:'Data Analyst',score:51,color:'#10b981'},
    {label:'Business Analyst',score:48,color:'#f59e0b'},
    {label:'Data Scientist',score:42,color:'#ec4899'},
  ]);
  React.useEffect(()=>{
    axios.get(API+'/stats/salaires').then(r=>{
      const colors = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899'];
      const updated = r.data.filter(m=>m.metier!=='Autre').map((m,i)=>({
        label: m.metier,
        score: parseInt(m.score_moyen||0),
        color: colors[i%colors.length]
      }));
      if(updated.length>0) setMetiers(updated);
    }).catch(()=>{});
  },[]);
  const sendRapport = async () => { setSending(true); try { await axios.post(API+'/veille/run-et-email'); alert('Rapport envoye !'); } catch(e){alert('Erreur');} setSending(false); };
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
      <div style={{...G.card,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Salaire marche IDF (estimation)</div>
        {[
          {metier:'Product Owner Data/IA',min:52,max:70,color:'#8b5cf6'},
          {metier:'MOA/AMOA Senior',min:48,max:65,color:'#3b82f6'},
          {metier:'Data Engineer',min:50,max:68,color:'#10b981'},
          {metier:'Analytics Engineer',min:48,max:65,color:'#f59e0b'},
          {metier:'Data Analyst Senior',min:42,max:58,color:'#ec4899'},
        ].map((s,i)=>(
          <div key={i} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
              <span style={{fontSize:11,color:'#94a3b8'}}>{s.metier}</span>
              <span style={{fontSize:11,color:s.color,fontWeight:700}}>{s.min}k - {s.max}k EUR</span>
            </div>
            <div style={{height:5,background:'rgba(30,41,59,0.8)',borderRadius:3}}>
              <div style={{height:5,width:((s.max-35)/(75-35)*100)+'%',background:s.color,borderRadius:3}}/>
            </div>
          </div>
        ))}
        <div style={{fontSize:10,color:'#475569',marginTop:6}}>Votre cible: 52-65k EUR — alignee marche</div>
      </div>
      <div style={{...G.card,marginBottom:12,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#a78bfa',marginBottom:6}}>Partager mon profil</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>Page publique a envoyer aux recruteurs</div>
        <div style={{display:'flex',gap:8}}>
          <input readOnly value="https://jobassistant.monairbyte.eu/profil" style={{...G.inp,flex:1,fontSize:11,color:'#a78bfa'}}/>
          <button onClick={()=>{navigator.clipboard.writeText('https://jobassistant.monairbyte.eu/profil');alert('Lien copie !');}} style={{...G.btn,padding:'6px 12px',fontSize:11}}>Copier</button>
          <button onClick={()=>window.open('https://jobassistant.monairbyte.eu/profil','_blank')} style={{...G.btn,padding:'6px 12px',fontSize:11,background:'rgba(139,92,246,0.2)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)'}}>Voir</button>
        </div>
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
  const [isDark, setIsDark] = useState(()=>localStorage.getItem('theme')!=='light');
  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem('theme', next?'dark':'light');
      document.body.classList.toggle('light-mode', !next);
      return next;
    });
  };
  const [active, setActive] = useState('dashboard');
  const [notifActive, setNotifActive] = useState(false);

  React.useEffect(()=>{
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
    if(Notification.permission === 'granted' && localStorage.getItem('notif_active')==='true') setNotifActive(true);
  },[]);

  const activerNotifications = async () => {
    try {
      if(!('Notification' in window)) {
        alert('Votre navigateur ne supporte pas les notifications.');
        return;
      }
      let permission = Notification.permission;
      if(permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if(permission === 'granted') {
        setNotifActive(true);
        // Test notification immédiate
        const notif = new Notification('JobAssistant IA ✅', {
          body: 'Notifications activées ! Vous serez alerté des offres 85%+',
          icon: '/logo192.png',
          tag: 'test-notif'
        });
        notif.onclick = () => window.focus();
        // Sauvegarder préférence
        localStorage.setItem('notif_active','true');
      } else if(permission === 'denied') {
        alert('Notifications bloquées.\nAllez dans Paramètres navigateur > Notifications > jobassistant.monairbyte.eu > Autoriser');
      }
    } catch(e) { alert('Erreur: '+e.message); }
  };

  // Vérifier offres 85%+ toutes les 30 min et notifier
  React.useEffect(()=>{
    if(!notifActive) return;
    const check = async () => {
      try {
        const r = await axios.get(API+'/jobs?minScore=85&limit=3&sort=score');
        if(r.data?.length > 0) {
          const job = r.data[0];
          new Notification('🔥 Offre ' + job.ia_score + '%+ disponible !', {
            body: job.title + ' — ' + (job.company||'?'),
            icon: '/logo192.png',
            tag: 'offre-'+job.id
          });
        }
      } catch(e) {}
    };
    const interval = setInterval(check, 30*60*1000); // 30 min
    return () => clearInterval(interval);
  },[notifActive]);
  const [theme, setTheme] = useState('dark');
  React.useEffect(()=>{
    document.body.className = theme === 'light' ? 'light' : '';
  },[theme]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profil, setProfil] = useState(null);
  const [stats, setStats] = useState(null);
  const [favoris, setFavoris] = useState([]);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
  useEffect(()=>{
    if(localStorage.getItem('theme')==='light') document.body.classList.add('light-mode');
  },[]);
  useEffect(()=>{
    axios.get(API+'/profil').then(r=>setProfil(r.data)).catch(()=>setProfil(null));
    axios.get(API+'/stats').then(r=>setStats(r.data)).catch(()=>{});
    axios.get(API+'/favoris').then(r=>setFavoris((r.data||[]).map(f=>f.job_id))).catch(()=>{});
  },[]);
  const [postules, setPostules] = useState([]);
  const onPostuler = async (job) => {
    try {
      await axios.post(API+'/candidatures',{job_id:job.id,title:job.title,company:job.company,url:job.url});
      setPostules(p=>[...p,job.id]);
      alert('Candidature enregistree pour: '+job.title);
    } catch(e){ alert('Erreur: '+e.message); }
  };
  const pageTitle = {dashboard:'Tableau de bord',offres:'Offres matchees',candidatures:'Candidatures',favoris:'Favoris',cv:'Mon CV & Profil',alertes:'Alertes',parametres:'Parametres',historique:'Historique rapports',tendances:'Tendances marche',portfolio:'Portfolio projets',agenda:'Agenda recherche',blacklist:'Blacklist entreprises',metiers:'Mes metiers cibles',stats:'Statistiques avancees','offre-libre':'Coller une offre',questions:'Banque de questions',formations:'Formations recommandees','veille-comp':'Veille competences'};
  const renderPage = () => {
    switch(active) {
      case 'dashboard': return <Dashboard stats={stats} profil={profil} setActive={setActive}/>;
      case 'offres': return <OffresPage profil={profil} favoris={favoris} setFavoris={setFavoris} onPostuler={onPostuler} postules={postules}/>;
      case 'candidatures': return <CandidaturesPage/>;
      case 'favoris': return <FavorisPage onPostuler={onPostuler}/>;
      case 'cv': return <CVPage profil={profil} setProfil={setProfil}/>;
      case 'alertes': return <AlertesPage/>;
      case 'parametres': return <ParametresPage/>;
      case 'historique': return <HistoriquePage key={Date.now()}/>;
      case 'tendances': return <TendancesPage key={Date.now()}/>;
      case 'portfolio': return <PortfolioPage key={Date.now()}/>;
      case 'agenda': return <AgendaPage key={Date.now()}/>;
      case 'blacklist': return <BlacklistPage key={Date.now()}/>;
      case 'metiers': return <MetiersCiblesPage key={Date.now()}/>;
      case 'stats': return <StatsAvanceesPage key={Date.now()}/>;
      case 'offre-libre': return <OffreLibrePage key={Date.now()}/>;
      case 'questions': return <BanqueQuestionsPage key={Date.now()}/>;
      case 'formations': return <FormationsPage key={Date.now()}/>;
      case 'veille-comp': return <VeilleCompetencesPage key={Date.now()}/>;
      default: return null;
    }
  };
  return (
    <div style={{display:'flex',height:'100vh',background:G.bg,overflow:'hidden'}}>
      {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999}}/>}
      <Sidebar active={active} setActive={(p)=>{setActive(p);setSidebarOpen(false);}} isMobile={isMobile} open={sidebarOpen} setOpen={setSidebarOpen} profil={profil}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div className='header-bar' style={{padding:'12px 16px',borderBottom:'1px solid rgba(139,92,246,0.1)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer'}}><Menu size={22}/></button>}
          <h1 style={{margin:0,fontSize:16,fontWeight:800}} className="text-main">{pageTitle[active]||active}</h1>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <button onClick={toggleTheme} style={{background:'transparent',border:'1px solid rgba(139,92,246,0.3)',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:16,lineHeight:1}} title={isDark?'Mode clair':'Mode sombre'}>
              {isDark?'☀️':'🌙'}
            </button>
            <button onClick={notifActive?()=>{
              setNotifActive(false);
              localStorage.removeItem('notif_active');
            }:activerNotifications} title={notifActive?'Désactiver notifications':'Activer notifications'} style={{background:notifActive?'rgba(34,197,94,0.2)':'transparent',border:'1px solid '+(notifActive?'rgba(34,197,94,0.3)':'rgba(139,92,246,0.3)'),borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:14}}>
              {notifActive?'🔔':'🔕'}
            </button>
            {notifActive&&<button onClick={()=>{
              new Notification('🔥 Test JobAssistant IA', {
                body: 'Les notifications fonctionnent correctement !',
                icon: '/logo192.png'
              });
            }} style={{background:'rgba(139,92,246,0.2)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:11,color:'#a78bfa'}}>
              Test
            </button>}
            <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>
              {profil?.nom?.split(' ').map(w=>w[0]).join('').slice(0,2)||'MA'}
            </div>
          </div>
        </div>
        <div key={isDark?'dk':'lt'} style={{flex:1,overflowY:'auto',padding:'16px',background:isDark?'#060b18':'#f8fafc',color:isDark?'#e2e8f0':'#1e293b'}}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

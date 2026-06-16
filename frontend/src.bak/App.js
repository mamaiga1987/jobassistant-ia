import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Briefcase, Eye, Send, Users, CheckCircle, Bell, Settings, Star, FileText, User, Search, Filter, Zap, Menu, X, ExternalLink, MapPin, Clock, Building, Tag, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import Candidatures from './pages/Candidatures';
import Favoris from './pages/Favoris';
import Alertes from './pages/Alertes';
import CVLettres from './pages/CVLettres';

const API = process.env.REACT_APP_API_URL || '/api';
const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4'];
const SOURCE_META = {
  'LinkedIn':  {color:'#0077b5',icon:'in'},
  'Indeed':    {color:'#003a9b',icon:'î'},
  'HelloWork': {color:'#ff6b35',icon:'Hw'},
  'APEC':      {color:'#e31837',icon:'A'},
  'Monster':   {color:'#6b21a8',icon:'M'},
  'Jooble':    {color:'#1e88e5',icon:'J'},
  'Adzuna':    {color:'#10b981',icon:'Az'},
};
const DAY_FR = {Mon:'Lun',Tue:'Mar',Wed:'Mer',Thu:'Jeu',Fri:'Ven',Sat:'Sam',Sun:'Dim'};

const ScoreCircle = ({score}) => {
  const color = score>=85?'#10b981':score>=75?'#f59e0b':'#ef4444';
  const r=18,circ=2*Math.PI*r,dash=(score/100)*circ;
  return (
    <div style={{position:'relative',width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width={48} height={48} style={{position:'absolute',transform:'rotate(-90deg)'}}>
        <circle cx={24} cy={24} r={r} fill="none" stroke="#1e293b" strokeWidth={4}/>
        <circle cx={24} cy={24} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <span style={{fontSize:11,fontWeight:700,color}}>{score}%</span>
    </div>
  );
};

const ScoreCircleLarge = ({score}) => {
  const color = score>=85?'#10b981':score>=75?'#f59e0b':'#ef4444';
  const r=40,circ=2*Math.PI*r,dash=(score/100)*circ;
  return (
    <div style={{position:'relative',width:100,height:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={100} height={100} style={{position:'absolute',transform:'rotate(-90deg)'}}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#1e293b" strokeWidth={6}/>
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:800,color}}>{score}%</div>
        <div style={{fontSize:9,color:'#94a3b8'}}>Match IA</div>
      </div>
    </div>
  );
};

const navItems = [
  {icon:<Briefcase size={18}/>,label:'Dashboard',id:'dashboard'},
  {icon:<Search size={18}/>,label:"Offres d'emploi",id:'offres'},
  {icon:<Send size={18}/>,label:'Candidatures',id:'candidatures'},
  {icon:<Star size={18}/>,label:'Favoris',id:'favoris'},
  {icon:<Bell size={18}/>,label:'Alertes',id:'alertes'},
  {icon:<FileText size={18}/>,label:'CV & Lettres IA',id:'cv'},
  {icon:<User size={18}/>,label:'Analyse de profil',id:'profil'},
  {icon:<Settings size={18}/>,label:'Paramètres',id:'parametres'},
];

// ─── Modal détail offre ───────────────────────────────────────────────────────
const JobModal = ({job, onClose, onViewFull}) => {
  if (!job) return null;
  const tag = {background:'rgba(139,92,246,0.12)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)',borderRadius:6,padding:'3px 9px',fontSize:12};
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:2000,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#0f172a',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'20px 20px 0 0',padding:24,width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{width:40,height:4,background:'#334155',borderRadius:2,margin:'0 auto 20px'}}/>
        {/* Header */}
        <div style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:12,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>
            {(job.company||'?')[0].toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <h2 style={{margin:'0 0 4px',fontSize:16,fontWeight:800,color:'#fff',lineHeight:1.3}}>{job.title}</h2>
            <div style={{fontSize:13,color:'#94a3b8'}}>{job.company}</div>
          </div>
          <ScoreCircleLarge score={job.ia_score||0}/>
        </div>
        {/* Infos */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {[
            {icon:<MapPin size={13}/>, label:'Lieu', value:job.location},
            {icon:<Briefcase size={13}/>, label:'Contrat', value:job.contract_type},
            {icon:<Building size={13}/>, label:'Source', value:job.source},
            {icon:<Clock size={13}/>, label:'Publié', value:job.published_at ? new Date(job.published_at).toLocaleDateString('fr-FR') : 'N/A'},
          ].map((info,i)=>(
            <div key={i} style={{background:'rgba(30,41,59,0.6)',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{color:'#8b5cf6'}}>{info.icon}</span>
              <div>
                <div style={{fontSize:10,color:'#64748b'}}>{info.label}</div>
                <div style={{fontSize:12,color:'#e2e8f0',fontWeight:600}}>{info.value||'N/A'}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Tags */}
        {job.tags?.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:8,fontWeight:600,display:'flex',alignItems:'center',gap:6}}><Tag size={12}/> Compétences</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {job.tags.map(t=><span key={t} style={tag}>{t}</span>)}
            </div>
          </div>
        )}
        {/* Description */}
        {job.description && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:8,fontWeight:600}}>Description</div>
            <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,margin:0}}>{job.description}</p>
          </div>
        )}
        {/* Actions */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <button onClick={onViewFull} style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',borderRadius:12,padding:'12px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <Eye size={16}/> Voir détail
          </button>
          {job.url ? (
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',border:'none',borderRadius:12,padding:'12px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,textDecoration:'none'}}>
              <ExternalLink size={16}/> Postuler
            </a>
          ) : (
            <button style={{background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',border:'none',borderRadius:12,padding:'12px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <ExternalLink size={16}/> Postuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Page détail offre ────────────────────────────────────────────────────────
const JobDetailPage = ({job, onBack}) => {
  const card = {background:'rgba(15,23,42,0.85)',border:'1px solid rgba(139,92,246,0.18)',borderRadius:16,padding:16};
  const tag = {background:'rgba(139,92,246,0.12)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)',borderRadius:6,padding:'3px 9px',fontSize:12};
  return (
    <div style={{minHeight:'100vh',background:'#060b18',color:'#e2e8f0',fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px',background:'rgba(15,23,42,0.9)',borderBottom:'1px solid rgba(139,92,246,0.1)',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)'}}>
        <button onClick={onBack} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:13}}>
          <ArrowLeft size={18}/> Retour
        </button>
        <span style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.title}</span>
      </div>
      <div style={{padding:16,maxWidth:800,margin:'0 auto'}}>
        {/* Hero */}
        <div style={{...card,marginBottom:16,background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.05))'}}>
          <div style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:16}}>
            <div style={{width:60,height:60,borderRadius:14,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>
              {(job.company||'?')[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <h1 style={{margin:'0 0 4px',fontSize:18,fontWeight:800,color:'#fff',lineHeight:1.3}}>{job.title}</h1>
              <div style={{fontSize:14,color:'#94a3b8',marginBottom:8}}>{job.company}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                <span style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>{job.contract_type}</span>
                <span style={{background:'rgba(59,130,246,0.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>📍 {job.location}</span>
                <span style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>{job.source}</span>
              </div>
            </div>
            <ScoreCircleLarge score={job.ia_score||0}/>
          </div>
          {/* Bouton postuler */}
          {job.url ? (
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',borderRadius:12,padding:'14px',fontSize:14,fontWeight:700,textDecoration:'none',width:'100%',boxSizing:'border-box'}}>
              <ExternalLink size={16}/> Postuler sur {job.source}
            </a>
          ) : (
            <button style={{width:'100%',background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',border:'none',borderRadius:12,padding:'14px',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Postuler
            </button>
          )}
        </div>

        {/* Infos détaillées */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[
            {icon:<MapPin size={14}/>,label:'Localisation',value:job.location},
            {icon:<Briefcase size={14}/>,label:'Type contrat',value:job.contract_type},
            {icon:<Building size={14}/>,label:'Source',value:job.source},
            {icon:<Clock size={14}/>,label:'Publié le',value:job.published_at?new Date(job.published_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'N/A'},
          ].map((info,i)=>(
            <div key={i} style={{...card,display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:'#8b5cf6'}}>{info.icon}</span>
              <div><div style={{fontSize:10,color:'#64748b'}}>{info.label}</div><div style={{fontSize:13,color:'#e2e8f0',fontWeight:600}}>{info.value||'N/A'}</div></div>
            </div>
          ))}
        </div>

        {/* Compétences */}
        {job.tags?.length > 0 && (
          <div style={{...card,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Tag size={14} color="#8b5cf6"/> Compétences requises</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {job.tags.map(t=><span key={t} style={tag}>{t}</span>)}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{...card,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Description du poste</div>
          <p style={{fontSize:13,color:'#94a3b8',lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>
            {job.description || 'Aucune description disponible. Consultez l\'offre complète sur la plateforme source.'}
          </p>
        </div>

        {/* Suggestion IA */}
        <div style={{...card,background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.05))'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><Zap size={14} color="#f59e0b"/><span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Analyse IA</span></div>
          <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,margin:'0 0 12px'}}>
            Ce poste correspond à <strong style={{color:'#8b5cf6'}}>{job.ia_score}%</strong> de votre profil. 
            {job.ia_score >= 85 ? ' Excellente correspondance — postulez rapidement !' : 
             job.ia_score >= 75 ? ' Bonne correspondance — quelques compétences à mettre en avant.' :
             ' Correspondance partielle — adaptez votre CV pour ce poste.'}
          </p>
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:600,textDecoration:'none'}}>
              <ExternalLink size={14}/> Voir l'offre complète
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [alertes, setAlertes] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortBy, setSortBy] = useState('date');
  const [filterOpen, setFilterOpen] = useState(false);
  const [contractFilter, setContractFilter] = useState('');

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const contract = contractFilter ? `&contract=${encodeURIComponent(contractFilter)}` : '';
      const jobsUrl = search ? `${API}/search?q=${encodeURIComponent(search)}&sort=${sortBy}${contract}` : `${API}/jobs?limit=20&sort=${sortBy}${contract}`;
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(jobsUrl),
        axios.get(`${API}/stats`)
      ]);
      if (jobsRes.data?.length >= 0) setJobs(jobsRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch(e) { console.log('API error:', e.message); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sources = stats?.bySource || [];
  const evolution = (stats?.evolution||[]).map(e=>({day:DAY_FR[e.day]||e.day,offres:parseInt(e.offres)}));
  const repartition = (stats?.repartition||[]).map(r=>({name:r.zone,value:parseInt(r.count)}));

  const card = {background:'rgba(15,23,42,0.85)',border:'1px solid rgba(139,92,246,0.18)',borderRadius:16,padding:16,backdropFilter:'blur(10px)'};
  const btn = {background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',border:'none',borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer'};
  const inp = {background:'rgba(30,41,59,0.8)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:10,padding:'8px 14px',color:'#e2e8f0',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'};
  const tagStyle = {background:'rgba(139,92,246,0.12)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)',borderRadius:6,padding:'2px 7px',fontSize:11};

  // Page détail
  if (detailJob) return <JobDetailPage job={detailJob} onBack={()=>setDetailJob(null)}/>;
  const Sidebar = () => (
    <div style={{width:isMobile?'80%':220,maxWidth:280,height:'100%',background:'rgba(10,15,30,0.98)',borderRight:isMobile?'none':'1px solid rgba(139,92,246,0.15)',display:'flex',flexDirection:'column',padding:'20px 0',position:isMobile?'fixed':'relative',top:0,left:0,zIndex:1000,backdropFilter:'blur(20px)',transform:isMobile?(sidebarOpen?'translateX(0)':'translateX(-100%)'):'none',transition:'transform .3s ease'}}>
      {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{position:'absolute',top:16,right:16,background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer'}}><X size={20}/></button>}
      <div style={{padding:'0 20px 20px',borderBottom:'1px solid rgba(139,92,246,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Briefcase size={16} color="#fff"/></div>
          <div><p style={{margin:0,fontSize:14,fontWeight:800,color:'#fff'}}>JobAssistant IA</p><p style={{margin:0,fontSize:10,color:'#8b5cf6'}}>Votre recherche, optimisée.</p></div>
        </div>
      </div>
      <nav style={{flex:1,padding:'12px 0'}}>
        {navItems.map(item=>(
          <div key={item.id} onClick={()=>{setActive(item.id);setSidebarOpen(false);}} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 20px',cursor:'pointer',fontSize:13,fontWeight:500,color:active===item.id?'#fff':'#94a3b8',background:active===item.id?'linear-gradient(90deg,rgba(139,92,246,0.2),transparent)':'transparent',borderLeft:active===item.id?'2px solid #8b5cf6':'2px solid transparent',transition:'all .2s'}}>
            {item.icon}<span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={{margin:'0 12px 12px',background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1))',border:'1px solid rgba(139,92,246,0.3)',borderRadius:14,padding:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><Zap size={15} color="#8b5cf6"/><span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Assistant IA</span></div>
        <p style={{fontSize:11,color:'#94a3b8',margin:'0 0 10px'}}>Besoin d'aide pour votre recherche ?</p>
        <button style={{...btn,width:'100%',fontSize:12,padding:'8px 12px'}}>Discuter avec l'IA</button>
      </div>
    </div>
  );

  const pageTitle = {
    candidatures:'📨 Candidatures', favoris:'⭐ Favoris',
    alertes:'🔔 Alertes', cv:'✉️ CV & Lettres IA',
    profil:'👤 Analyse de profil', parametres:'⚙️ Paramètres'
  };

  const subPages = ['candidatures','favoris','alertes','cv','profil','parametres'];
  if (subPages.includes(active)) return (
    <div style={{display:'flex',minHeight:'100vh',background:'#060b18',fontFamily:"'Inter',sans-serif",color:'#e2e8f0',position:'relative'}}>
      {isMobile && sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:999}}/>}
      <Sidebar/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'auto',minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'rgba(15,23,42,0.9)',borderBottom:'1px solid rgba(139,92,246,0.1)',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)'}}>
          {isMobile && <button onClick={()=>setSidebarOpen(true)} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4}}><Menu size={22}/></button>}
          <h1 style={{margin:0,fontSize:16,fontWeight:800,color:'#fff'}}>{pageTitle[active]}</h1>
        </div>
        <div style={{padding:16,flex:1}}>
          {active==='candidatures' && <Candidatures/>}
          {active==='favoris' && <Favoris/>}
          {active==='alertes' && <Alertes/>}
          {active==='cv' && <CVLettres/>}
          {active==='profil' && <div style={{textAlign:'center',padding:40,color:'#64748b'}}>Module en développement...</div>}
          {active==='parametres' && <div style={{textAlign:'center',padding:40,color:'#64748b'}}>Module en développement...</div>}
        </div>
      </div>
    </div>
  );
  const statItems = [
    {icon:<Briefcase size={18} color="#8b5cf6"/>,label:'Offres trouvées',value:stats?.total||0,delta:`+${stats?.todayCount||0} aujourd'hui`,color:'#8b5cf6'},
    {icon:<Eye size={18} color="#3b82f6"/>,label:'Consultées',value:stats?.recentCount||0,delta:'7 derniers jours',color:'#3b82f6'},
    {icon:<Send size={18} color="#10b981"/>,label:'Candidatures',value:0,delta:'À compléter',color:'#10b981'},
    {icon:<Users size={18} color="#f59e0b"/>,label:'Entretiens',value:0,delta:'À compléter',color:'#f59e0b'},
    {icon:<CheckCircle size={18} color="#ef4444"/>,label:'Offres reçues',value:0,delta:'À compléter',color:'#ef4444'},
  ];

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#060b18',fontFamily:"'Inter',sans-serif",color:'#e2e8f0',position:'relative'}}>
      {isMobile && sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:999}}/>}
      <Sidebar/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'auto',minWidth:0}}>
        {/* Topbar */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(139,92,246,0.1)',background:'rgba(15,23,42,0.9)',backdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {isMobile && <button onClick={()=>setSidebarOpen(true)} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4}}><Menu size={22}/></button>}
            <div>
              <h1 style={{margin:0,fontSize:isMobile?16:20,fontWeight:800,color:'#fff'}}>Tableau de bord</h1>
              {!isMobile && <p style={{margin:0,fontSize:11,color:'#64748b'}}>Vue d'ensemble de votre recherche d'emploi</p>}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:isMobile?10:16}}>
            {!isMobile && <span style={{fontSize:12,color:'#94a3b8'}}>Alertes</span>}
            <button onClick={()=>setAlertes(!alertes)} style={{width:40,height:22,borderRadius:11,background:alertes?'linear-gradient(135deg,#8b5cf6,#3b82f6)':'#334155',cursor:'pointer',position:'relative',border:'none',flexShrink:0}}>
              <div style={{position:'absolute',top:3,left:alertes?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .3s'}}/>
            </button>
            <div style={{position:'relative'}}><Bell size={18} color="#94a3b8"/><span style={{position:'absolute',top:-5,right:-5,background:'#8b5cf6',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>3</span></div>
            <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>MM</div>
              {!isMobile && <div><div style={{fontSize:12,fontWeight:600,color:'#fff'}}>Moncef M.</div><div style={{fontSize:10,color:'#8b5cf6'}}>Premium</div></div>}
            </div>
          </div>
        </div>

        {isMobile && (
          <div style={{display:'flex',gap:8,padding:'8px 12px',background:'rgba(15,23,42,0.95)',borderBottom:'1px solid rgba(139,92,246,0.1)',overflowX:'auto',flexShrink:0}}>
            <button onClick={()=>setFilterOpen(!filterOpen)} style={{background:filterOpen?'rgba(139,92,246,0.3)':'rgba(139,92,246,0.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',borderRadius:20,padding:'5px 12px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap',flexShrink:0}}><Filter size={12}/> Filtres</button>
            <select style={{background:'rgba(30,41,59,0.9)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:20,padding:'5px 12px',color:'#e2e8f0',fontSize:12,outline:'none',flexShrink:0}} onChange={e=>{setSortBy(e.target.value);setTimeout(fetchData,100);}}>
              <option value="date">📅 Plus récent</option>
              <option value="score">🎯 Score IA</option>
            </select>
            {['CDI','Mission','Freelance'].map(c=>(
              <button key={c} onClick={()=>{setContractFilter(contractFilter===c?'':c);setTimeout(fetchData,100);}} style={{background:contractFilter===c?'rgba(139,92,246,0.3)':'rgba(30,41,59,0.8)',color:contractFilter===c?'#a78bfa':'#94a3b8',border:`1px solid ${contractFilter===c?'rgba(139,92,246,0.5)':'#334155'}`,borderRadius:20,padding:'5px 12px',fontSize:12,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{c}</button>
            ))}
          </div>
        )}
        {isMobile && filterOpen && (
          <div style={{background:'rgba(10,15,30,0.98)',border:'1px solid rgba(139,92,246,0.2)',padding:14,flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Lieu</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {['Île-de-France','Paris (75)','Hauts-de-Seine (92)','Seine-Saint-Denis (93)'].map(l=>(
                <button key={l} style={{background:'rgba(59,130,246,0.1)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.2)',borderRadius:20,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>{l}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{padding:isMobile?12:24,flex:1}}>
          {/* Sources */}
          <div style={{...card,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Sources d'offres</span>
              <span style={{fontSize:10,color:'#64748b'}}>Mis à jour il y a 15 min 🔄</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?3:Math.min(sources.length+1,7)},1fr)`,gap:8}}>
              {sources.map(src=>{
                const meta=SOURCE_META[src.source]||{color:'#8b5cf6',icon:src.source[0]};
                return (
                  <div key={src.source} style={{background:'rgba(30,41,59,0.6)',border:`1px solid ${meta.color}30`,borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer'}}>
                    <div style={{width:28,height:28,borderRadius:6,background:`${meta.color}20`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 4px',fontSize:11,fontWeight:800,color:meta.color}}>{meta.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'#fff'}}>{src.source}</div>
                    <div style={{fontSize:10,color:'#10b981',fontWeight:600}}>{src.count}</div>
                  </div>
                );
              })}
              {!isMobile && <div style={{background:'rgba(30,41,59,0.4)',border:'1px dashed rgba(139,92,246,0.3)',borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:18,color:'#8b5cf6'}}>+</div><div style={{fontSize:10,color:'#64748b'}}>Ajouter</div></div>}
            </div>
          </div>

          {/* Stats — grille fixe 3+2 sur mobile */}
          {isMobile ? (
            <div style={{marginBottom:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                {statItems.slice(0,3).map((s,i)=>(
                  <div key={i} style={{...card,padding:10}}>
                    <div style={{width:28,height:28,borderRadius:7,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:6}}>{s.icon}</div>
                    <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>{s.value}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{s.label}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:600}}>{s.delta}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {statItems.slice(3).map((s,i)=>(
                  <div key={i} style={{...card,padding:10}}>
                    <div style={{width:28,height:28,borderRadius:7,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:6}}>{s.icon}</div>
                    <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>{s.value}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{s.label}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:600}}>{s.delta}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
              {statItems.map((s,i)=>(
                <div key={i} style={{...card,display:'flex',alignItems:'center',gap:10,padding:12}}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{s.icon}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{s.value}</div>
                    <div style={{fontSize:10,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</div>
                    <div style={{fontSize:10,color:s.color,fontWeight:600}}>{s.delta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main grid */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'200px 1fr 260px',gap:14}}>
            {!isMobile && (
              <div style={{...card,alignSelf:'start'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Filtres</span>
                  <span style={{fontSize:11,color:'#8b5cf6',cursor:'pointer'}}>Reset</span>
                </div>
                {[['Mots-clés',['Product Owner','MOA'],'#8b5cf6'],['Lieu',['Île-de-France'],'#3b82f6']].map(([label,items,color])=>(
                  <div key={label} style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:6,fontWeight:600}}>{label}</div>
                    {items.map(k=><span key={k} style={{display:'inline-flex',alignItems:'center',gap:3,background:`${color}20`,color,border:`1px solid ${color}40`,borderRadius:6,padding:'2px 7px',fontSize:11,fontWeight:600,margin:'0 3px 3px 0'}}>{k} ×</span>)}
                  </div>
                ))}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:'#64748b',marginBottom:6,fontWeight:600}}>Contrat</div>
                  {['CDI','Freelance','Mission'].map(t=><label key={t} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#94a3b8',marginBottom:5,cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:'#8b5cf6'}}/>{t}</label>)}
                </div>
                <button style={{...btn,width:'100%',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Filter size={13}/> Enregistrer</button>
              </div>
            )}

            {/* Offres */}
            <div style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Offres ({jobs.length})</span>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {isMobile && <button onClick={()=>setFilterOpen(!filterOpen)} style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',borderRadius:8,padding:'4px 10px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Filter size={12}/> Filtres</button>}
                  <select style={{...inp,width:'auto',padding:'4px 10px',fontSize:12}} onChange={e=>{setSortBy(e.target.value);setTimeout(fetchData,100);}}>
                    <option value="date">📅 Plus récent</option>
                    <option value="score">🎯 Score IA</option>
                    <option value="pertinence">✨ Pertinence</option>
                  </select>
                </div>
              </div>
              {isMobile && filterOpen && (
                <div style={{background:'rgba(15,23,42,0.95)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:14,padding:14,marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Filtres</div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Type de contrat</div>
                    {['CDI','Freelance','Mission'].map(t=>(
                      <label key={t} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#94a3b8',marginBottom:5,cursor:'pointer'}}>
                        <input type="checkbox" defaultChecked style={{accentColor:'#8b5cf6'}}/>{t}
                      </label>
                    ))}
                  </div>
                  <div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Lieu</div>
                    <select style={{...inp,marginBottom:0}} onChange={e=>fetchData()}>
                      <option>Île-de-France</option>
                      <option>Paris (75)</option>
                      <option>Hauts-de-Seine (92)</option>
                      <option>Toute la France</option>
                    </select>
                  </div>
                </div>
              )}
              <div style={{position:'relative',marginBottom:12}}>
                <Search size={13} color="#64748b" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
                <input style={{...inp,paddingLeft:30}} placeholder="Comptable, Data Analyst, MOA..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter' && fetchData()}/>
                {search && <button onClick={fetchData} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',color:'#fff',border:'none',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Chercher</button>}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                {['Product Owner','MOA Data','Data Analyst','Comptable','Chef de Projet','Business Analyst','Data Engineer','Scrum Master'].map(s=>(
                  <button key={s} onClick={()=>{setSearch(s);setTimeout(fetchData,100);}} style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)',borderRadius:20,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>{s}</button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {jobs.map(job=>(
                  <div key={job.id} onClick={()=>setSelectedJob(job)}
                    style={{background:'rgba(30,41,59,0.6)',border:'1px solid rgba(139,92,246,0.1)',borderRadius:12,padding:12,display:'flex',gap:10,cursor:'pointer',transition:'all .2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.4)';e.currentTarget.style.background='rgba(30,41,59,0.9)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.1)';e.currentTarget.style.background='rgba(30,41,59,0.6)';}}>
                    <div style={{width:40,height:40,borderRadius:9,background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>
                      {(job.company||'?')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.title}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.company} · 📍{job.location} · {job.contract_type}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                        {(job.tags||[]).slice(0,isMobile?2:4).map(t=><span key={t} style={tagStyle}>{t}</span>)}
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0}}>
                      <span style={{fontSize:9,color:'#64748b',fontWeight:600}}>Match IA</span>
                      <ScoreCircle score={job.ia_score||0}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:'center',marginTop:12}}>
                <button style={{background:'transparent',border:'none',color:'#8b5cf6',fontSize:12,fontWeight:600,cursor:'pointer'}}>Voir plus ↓</button>
              </div>
            </div>

            {/* Charts desktop */}
            {!isMobile && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={card}>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:12}}>Répartition</div>
                  {repartition.length>0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart><Pie data={repartition} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">{repartition.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:11}}/></PieChart>
                      </ResponsiveContainer>
                      {repartition.map((r,i)=><div key={r.name} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:COLORS[i]}}/><span style={{fontSize:11,color:'#94a3b8'}}>{r.name}</span></div><span style={{fontSize:11,fontWeight:700,color:'#fff'}}>{r.value}</span></div>)}
                    </>
                  ) : <div style={{color:'#64748b',fontSize:12,textAlign:'center',padding:20}}>Chargement...</div>}
                </div>
                <div style={card}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Évolution</span><span style={{fontSize:10,color:'#64748b'}}>7 jours</span></div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={evolution}><XAxis dataKey="day" tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:11}}/><Line type="monotone" dataKey="offres" stroke="#8b5cf6" strokeWidth={2} dot={{fill:'#8b5cf6',r:2}}/></LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={card}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><Zap size={13} color="#f59e0b"/><span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Suggestions IA</span></div>
                  {[`${stats?.total||0} offres correspondent à votre profil.`,`${stats?.todayCount||0} nouvelles offres ajoutées aujourd'hui.`,'Mettez à jour votre CV pour booster votre score.'].map((s2,i)=><div key={i} style={{display:'flex',gap:6,marginBottom:7}}><span>💡</span><span style={{fontSize:11,color:'#94a3b8',lineHeight:1.4}}>{s2}</span></div>)}
                  <div style={{fontSize:12,color:'#8b5cf6',fontWeight:600,cursor:'pointer',marginTop:4}}>Voir toutes →</div>
                </div>
              </div>
            )}
          </div>

          {/* Charts mobile */}
          {isMobile && repartition.length>0 && (
            <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={card}><div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Répartition</div><ResponsiveContainer width="100%" height={120}><PieChart><Pie data={repartition} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">{repartition.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie></PieChart></ResponsiveContainer></div>
              <div style={card}><div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>Évolution</div><ResponsiveContainer width="100%" height={120}><LineChart data={evolution}><XAxis dataKey="day" tick={{fontSize:8,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #8b5cf6',borderRadius:8,fontSize:10}}/><Line type="monotone" dataKey="offres" stroke="#8b5cf6" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail */}
      <JobModal job={selectedJob} onClose={()=>setSelectedJob(null)} onViewFull={()=>{setDetailJob(selectedJob);setSelectedJob(null);}}/>
    </div>
  );
}



import React, { useState } from 'react';
import { FileText, Zap, Copy, Check } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const PROFIL = `Mohamed Assalia Maiga - Data & AI Engineer
9 ans d'expérience en télécommunications (Free Mobile, SFR, Orange)
Compétences: SQL, Python, Power BI, Apache Superset, Analyse QoS/QoE
Certifications: PSPO I, PSM I (Scrum.org, Avril 2026)
Cibles: Data Product Manager, Product Owner, Analytics Engineer
Localisation: Longjumeau (91), Île-de-France`;

export default function CVLettres() {
  const [job, setJob] = useState({ title:'', company:'', description:'' });
  const [type, setType] = useState('lettre');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!job.title || !job.company) return alert('Remplis le poste et l\'entreprise');
    setLoading(true);
    setResult('');
    try {
      const prompt = type === 'lettre'
        ? `Tu es un expert en recrutement. Rédige une lettre de motivation professionnelle et percutante en français pour ce candidat:\n\nPROFIL:\n${PROFIL}\n\nOFFRE:\nPoste: ${job.title}\nEntreprise: ${job.company}\nDescription: ${job.description}\n\nLa lettre doit:\n- Être personnalisée et convaincante\n- Mettre en valeur l'expérience data/télécom et les certifications Scrum\n- Être concise (3 paragraphes max)\n- Avoir un ton professionnel mais dynamique`
        : `Tu es un expert RH. Analyse cette offre et donne des conseils précis pour adapter le CV de ce candidat:\n\nPROFIL:\n${PROFIL}\n\nOFFRE:\nPoste: ${job.title}\nEntreprise: ${job.company}\nDescription: ${job.description}\n\nFournis:\n1. Score de compatibilité (/100)\n2. Points forts à mettre en avant\n3. Compétences manquantes à combler\n4. 3 conseils d'adaptation du CV`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      setResult(data.content?.[0]?.text || 'Erreur de génération');
    } catch(e) {
      setResult('Erreur: ' + e.message);
    }
    setLoading(false);
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const card = { background:'rgba(15,23,42,0.85)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, padding:16 };
  const inp = { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'10px 14px', color:'#e2e8f0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', marginBottom:10 };

  return (
    <div>
      {/* Type selector */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          { id:'lettre', label:'✉️ Lettre de motivation', desc:'Générée par IA' },
          { id:'analyse', label:'🎯 Analyse CV', desc:'Conseils personnalisés' }
        ].map(t => (
          <div key={t.id} onClick={() => setType(t.id)} style={{ ...card, cursor:'pointer', border:`1px solid ${type===t.id ? '#8b5cf6' : 'rgba(139,92,246,0.18)'}`, background: type===t.id ? 'rgba(139,92,246,0.1)' : 'rgba(15,23,42,0.85)', textAlign:'center', padding:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color: type===t.id ? '#a78bfa' : '#fff' }}>{t.label}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <FileText size={14} color="#8b5cf6"/> Informations sur le poste
        </div>
        <input style={inp} placeholder="Intitulé du poste *" value={job.title} onChange={e=>setJob({...job,title:e.target.value})}/>
        <input style={inp} placeholder="Entreprise *" value={job.company} onChange={e=>setJob({...job,company:e.target.value})}/>
        <textarea style={{ ...inp, minHeight:80, resize:'vertical' }} placeholder="Description du poste (optionnel - pour un meilleur résultat)" value={job.description} onChange={e=>setJob({...job,description:e.target.value})}/>
        <button onClick={generate} disabled={loading} style={{ background: loading ? '#334155' : 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'12px', fontSize:13, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Zap size={14}/> {loading ? 'Génération en cours...' : `Générer ${type === 'lettre' ? 'la lettre' : 'l\'analyse'}`}
        </button>
      </div>

      {/* Résultat */}
      {result && (
        <div style={{ ...card, border:'1px solid rgba(139,92,246,0.4)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>
              {type === 'lettre' ? '✉️ Lettre générée' : '🎯 Analyse'}
            </span>
            <button onClick={copyResult} style={{ background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.3)', borderRadius:8, padding:'6px 12px', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              {copied ? <><Check size={12}/> Copié !</> : <><Copy size={12}/> Copier</>}
            </button>
          </div>
          <div style={{ fontSize:12, color:'#cbd5e1', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{result}</div>
        </div>
      )}
    </div>
  );
}

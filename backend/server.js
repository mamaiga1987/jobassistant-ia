const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const https = require('https');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: '172.20.0.7', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const ADZUNA_ID = '50599aba';
const ADZUNA_KEY = '1bbedf209f3d69d48761074701c62a07';

// ── Helpers ──────────────────────────────────────────────────────────────────
function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method:'POST', headers:{ ...headers, 'Content-Length': Buffer.byteLength(data) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function getProfil() {
  const r = await pool.query('SELECT * FROM ja_profil ORDER BY id DESC LIMIT 1');
  return r.rows[0] || null;
}

function calcScore(profil, title, description, tags) {
  if (!profil) return Math.floor(55 + Math.random() * 20);
  const titleL = (title||'').toLowerCase();
  const descL = (description||'').toLowerCase();
  const tagStr = (tags||[]).join(' ').toLowerCase();
  const full = titleL + ' ' + descL + ' ' + tagStr;
  let score = 0;

  const metiersTitre = ['product owner','it product manager','data product manager','moa','amoa','chef de projet','analytics engineer','data engineer','ai engineer','data analyst','business analyst','data scientist','scrum master','lead data','architecte data','consultant data','rag engineer'];
  let titleHits = 0;
  metiersTitre.forEach(function(m) { if(titleL.includes(m)) titleHits++; });
  score += Math.min(titleHits * 12, 40);

  if(titleL.includes('product owner') && (titleL.includes('data')||titleL.includes('ia')||titleL.includes('bi'))) score += 12;
  if((titleL.includes('moa')||titleL.includes('maîtrise')) && (titleL.includes('data')||titleL.includes('si')||titleL.includes('ia'))) score += 12;
  if(titleL.includes('chef de projet') && (titleL.includes('data')||titleL.includes('moa')||titleL.includes('bi')||titleL.includes('ia'))) score += 10;
  if(titleL.includes('data engineer')||titleL.includes('analytics engineer')) score += 10;
  if(titleL.includes('ai engineer')||titleL.includes('rag')||titleL.includes('llm')) score += 12;
  if(titleL.includes('senior')||titleL.includes('lead')||titleL.includes('confirmé')) score += 5;
  score = Math.min(score, 40);

  var raresComps = ['rag','pgvector','apache superset','langchain','llamaindex','langgraph','mistral','openai api','embeddings','mlops','headless bi','airbyte','clickhouse'];
  var raresHits = 0;
  raresComps.forEach(function(c) { if(full.includes(c)) raresHits++; });
  score += Math.min(raresHits * 5, 20);

  var stdComps = ['sql','python','power bi','agile','scrum','docker','n8n','etl','git','api','kpi','roadmap','backlog','data','bi','analytics'];
  var stdHits = 0;
  stdComps.forEach(function(c) { if(full.includes(c)) stdHits++; });
  score += Math.min(stdHits * 2, 15);

  // Bonus description riche — compense titres génériques France Travail
  var descMetiers = ['product owner','data engineer','analytics engineer','ai engineer','data analyst','business analyst','moa','amoa','scrum master','data scientist','rag','llm','pgvector','langchain'];
  var descMetierHits = 0;
  descMetiers.forEach(function(m) { if(descL.includes(m)) descMetierHits++; });
  score += Math.min(descMetierHits * 4, 16);

  if(full.includes('paris')||full.includes('75 -')||full.includes('92 -')||full.includes('91 -')||full.includes('93 -')||full.includes('ile-de-france')) score += 10;
  else if(full.includes('remote')||full.includes('france')) score += 5;

  if(full.match(/4[89][0-9]{3}|5[0-9]{4}|6[0-5][0-9]{3}/)) score += 7;

  if(full.includes('senior')||full.includes('confirmé')||full.includes('lead')) score += 5;
  else if(!full.includes('junior')&&!full.includes('débutant')) score += 2;

  if(titleL.includes('alternance')||titleL.includes('stage')||titleL.includes('apprenti')) return Math.min(score, 15);
  if(titleL.includes('junior')||titleL.includes('débutant')) score -= 20;
  if((titleL.includes('développeur')||titleL.includes('fullstack'))&&!titleL.includes('product')&&!titleL.includes('data')) return Math.min(score, 20);
  if(titleL.includes('windev')||titleL.includes('cobol')||titleL.includes('mainframe')) return Math.min(score, 10);
  if(titleL.includes('comptable')&&!titleL.includes('data')) return Math.min(score, 15);
  if(titleL.includes('commercial')||titleL.includes('vendeur')) return Math.min(score, 15);

  return Math.min(Math.max(Math.round(score), 1), 99);
}
const KEYWORDS = ['SQL','Python','Java','Agile','Scrum','Jira','Power BI','Tableau','Spark','dbt','Azure','AWS','MOA','AMOA','Data','BI','ETL','API','Docker','Git','Analytics','QoS','QoE','Telecom','RAG','OpenAI','pgvector','n8n','React','Node.js','Product Owner','PowerBI','Superset','ClickHouse'];
function extractTags(text) {
  return KEYWORDS.filter(k => text && text.toLowerCase().includes(k.toLowerCase())).slice(0, 6);
}

// ── PROFIL ───────────────────────────────────────────────────────────────────
app.get('/api/profil', async (req, res) => {
  try { res.json(await getProfil()); } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/profil', async (req, res) => {
  try {
    const { nom, titre, annees_experience, competences, metiers, secteurs, langues, certifications, localisation, salaire_min, salaire_max, resume } = req.body;
    const r = await pool.query(
      `UPDATE ja_profil SET nom=$1,titre=$2,annees_experience=$3,competences=$4,metiers=$5,secteurs=$6,langues=$7,certifications=$8,localisation=$9,salaire_min=$10,salaire_max=$11,resume=$12,updated_at=NOW() WHERE id=(SELECT id FROM ja_profil ORDER BY id DESC LIMIT 1) RETURNING *`,
      [nom,titre,annees_experience,competences,metiers,secteurs,langues,certifications,localisation,salaire_min,salaire_max,resume]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/profil/competence', async (req, res) => {
  try {
    const { competence } = req.body;
    const r = await pool.query(
      `UPDATE ja_profil SET competences=array_append(competences,$1),updated_at=NOW() WHERE id=(SELECT id FROM ja_profil ORDER BY id DESC LIMIT 1) RETURNING competences`,
      [competence]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/profil/competence', async (req, res) => {
  try {
    const { competence } = req.body;
    const r = await pool.query(
      `UPDATE ja_profil SET competences=array_remove(competences,$1),updated_at=NOW() WHERE id=(SELECT id FROM ja_profil ORDER BY id DESC LIMIT 1) RETURNING competences`,
      [competence]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYSE CV ───────────────────────────────────────────────────────────────
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.post('/api/analyse-cv', express.raw({type:'application/pdf', limit:'10mb'}), async (req, res) => {
  try {
    // Sauvegarder PDF temporairement
    const tmpFile = path.join(os.tmpdir(), `cv_${Date.now()}.pdf`);
    fs.writeFileSync(tmpFile, req.body);
    
    // Extraire le texte avec pdftotext (poppler)
    let cvText = '';
    try {
      cvText = execSync(`pdftotext "${tmpFile}" -`, { encoding:'utf8', timeout:10000 });
    } catch(e) {
      // Fallback: lire le PDF en base64 et envoyer à OpenAI
      cvText = req.body.toString('utf8').replace(/[^\x20-\x7E]/g, ' ').slice(0, 3000);
    }
    fs.unlinkSync(tmpFile);
    cvText = cvText.slice(0, 4000);

    const data = await httpPost('api.openai.com', '/v1/chat/completions',
      { 'Content-Type':'application/json', 'Authorization':`Bearer ${OPENAI_KEY}` },
      {
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [{
          role: 'system',
          content: 'Tu es un expert RH. Analyse le CV et retourne UNIQUEMENT un JSON valide sans markdown ni backticks.'
        },{
          role: 'user',
          content: `Analyse ce CV et retourne ce JSON exactement:
{"nom":"","titre":"","annees_experience":0,"competences":[],"metiers":[],"secteurs":[],"langues":[],"certifications":[],"localisation":"","salaire_min":0,"salaire_max":0,"resume":""}

CV:
${cvText}`
        }]
      }
    );
    const text = data.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const profil = JSON.parse(clean);
    
    // Sauvegarder en DB
    await pool.query(
      `UPDATE ja_profil SET nom=$1,titre=$2,annees_experience=$3,competences=$4,metiers=$5,secteurs=$6,langues=$7,certifications=$8,localisation=$9,salaire_min=$10,salaire_max=$11,resume=$12,updated_at=NOW() WHERE id=(SELECT id FROM ja_profil ORDER BY id DESC LIMIT 1)`,
      [profil.nom,profil.titre,profil.annees_experience,profil.competences,profil.metiers,profil.secteurs,profil.langues,profil.certifications,profil.localisation,profil.salaire_min,profil.salaire_max,profil.resume]
    );
    res.json(profil);
  } catch(e) { 
    console.error('Analyse CV error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// ── JOBS ─────────────────────────────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  try {
    const { limit=20, sort='date', contract, source, minScore=0 } = req.query;
    const profil = await getProfil();
    let q = 'SELECT * FROM ja_jobs WHERE ia_score >= $1';
    const params = [parseInt(minScore)];
    if (contract) { params.push(contract); q += ` AND contract_type=$${params.length}`; }
    if (source) { params.push(source); q += ` AND source=$${params.length}`; }
    q += sort==='score' ? ' ORDER BY ia_score DESC' : ' ORDER BY published_at DESC';
    q += ` LIMIT ${parseInt(limit)}`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, sort='date' } = req.query;
    if (!q) return res.json([]);
    const profil = await getProfil();
    // Chercher en DB d'abord
    const dbResults = await pool.query(
      `SELECT * FROM ja_jobs WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY published_at DESC LIMIT 10`,
      [`%${q}%`]
    );
    let jobs = dbResults.rows;
    // Si moins de 5 résultats, appeler Adzuna
    if (jobs.length < 5) {
      const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=10&what=${encodeURIComponent(q)}&where=Ile-de-France&sort_by=date`;
      const data = await httpGet(url);
      const newJobs = [];
      for (const job of (data.results||[])) {
        const title = job.title||''; const company = job.company?.display_name||'';
        const location = job.location?.display_name||''; const desc = (job.description||'').slice(0,500);
        const url2 = job.redirect_url||''; const published = job.created ? new Date(job.created) : new Date();
        const tags = extractTags(title+' '+desc);
        const score = calcScore(profil, title, desc, tags);
        // Sauvegarder si nouveau
        const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1',[url2]);
        if (exists.rows.length===0 && url2) {
          const r = await pool.query(
            'INSERT INTO ja_jobs (source,title,company,location,contract_type,published_at,url,description,tags,ia_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
            ['Adzuna',title,company,location,'CDI',published,url2,desc,tags,score]
          );
          newJobs.push(r.rows[0]);
        }
        await new Promise(r=>setTimeout(r,100));
      }
      jobs = [...jobs, ...newJobs];
    }
    // Trier par date de publication (plus récent en premier)
    jobs.sort((a,b) => {
      if (sort==='score') return b.ia_score - a.ia_score;
      return new Date(b.published_at) - new Date(a.published_at);
    });
    res.json(jobs.slice(0,20));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) as total FROM ja_jobs');
    const bySource = await pool.query('SELECT source, COUNT(*) as count FROM ja_jobs GROUP BY source ORDER BY count DESC');
    const today = await pool.query("SELECT COUNT(*) as count FROM ja_jobs WHERE created_at > NOW() - INTERVAL '24 hours'");
    const evolution = await pool.query(`SELECT TO_CHAR(d::date,'Dy') as day, COALESCE(COUNT(j.id),0) as offres FROM generate_series(NOW()-INTERVAL '6 days',NOW(),'1 day') d LEFT JOIN ja_jobs j ON j.created_at::date=d::date GROUP BY d ORDER BY d`);
    const repartition = await pool.query(`SELECT CASE WHEN location ILIKE '%paris%' OR location ILIKE '%(75)%' OR location ILIKE '%(92)%' OR location ILIKE '%(91)%' OR location ILIKE '%hauts-de-seine%' OR location ILIKE '%ile-de-france%' THEN 'Île-de-France' WHEN location ILIKE '%remote%' OR location='' OR location IS NULL THEN 'Remote' ELSE 'Province' END as zone, COUNT(*) as count FROM ja_jobs GROUP BY zone`);
    const candidatures = await pool.query('SELECT COUNT(*) as count FROM ja_candidatures');
    const entretiens = await pool.query("SELECT COUNT(*) as count FROM ja_candidatures WHERE statut='entretien'");
    res.json({
      total: parseInt(total.rows[0].total),
      bySource: bySource.rows,
      todayCount: parseInt(today.rows[0].count),
      recentCount: parseInt(total.rows[0].total),
      evolution: evolution.rows,
      repartition: repartition.rows,
      candidaturesCount: parseInt(candidatures.rows[0].count),
      entretiensCount: parseInt(entretiens.rows[0].count)
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CANDIDATURES ──────────────────────────────────────────────────────────────
app.get('/api/candidatures', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM ja_candidatures ORDER BY created_at DESC')).rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/candidatures', async (req, res) => {
  try {
    const { job_id, title, company, url, statut } = req.body;
    const r = await pool.query(
      'INSERT INTO ja_candidatures (job_id,title,company,url,statut,date_postulation) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING RETURNING *',
      [job_id, title, company, url, statut||'postule']
    );
    res.json(r.rows[0]||{});
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/candidatures/:id', async (req, res) => {
  try {
    const { statut, notes } = req.body;
    let q, params;
    if (statut !== undefined && notes !== undefined) {
      q = 'UPDATE ja_candidatures SET statut=$1,notes=$2 WHERE id=$3 RETURNING *';
      params = [statut, notes, req.params.id];
    } else if (statut !== undefined) {
      q = 'UPDATE ja_candidatures SET statut=$1 WHERE id=$2 RETURNING *';
      params = [statut, req.params.id];
    } else {
      q = 'UPDATE ja_candidatures SET notes=$1 WHERE id=$2 RETURNING *';
      params = [notes, req.params.id];
    }
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/candidatures/:id', async (req, res) => {
  try { await pool.query('DELETE FROM ja_candidatures WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── FAVORIS ───────────────────────────────────────────────────────────────────
app.get('/api/favoris', async (req, res) => {
  try { res.json((await pool.query('SELECT f.*,j.title,j.company,j.location,j.contract_type,j.source,j.tags,j.ia_score,j.url as job_url FROM ja_favoris f JOIN ja_jobs j ON f.job_id=j.id ORDER BY f.created_at DESC')).rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/favoris', async (req, res) => {
  try {
    const { job_id } = req.body;
    await pool.query('INSERT INTO ja_favoris (job_id) VALUES ($1) ON CONFLICT (job_id) DO NOTHING',[job_id]);
    res.json({success:true});
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/favoris/:job_id', async (req, res) => {
  try { await pool.query('DELETE FROM ja_favoris WHERE job_id=$1',[req.params.job_id]); res.json({success:true}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ALERTES ───────────────────────────────────────────────────────────────────
app.get('/api/alertes', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM ja_alertes ORDER BY created_at DESC')).rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/alertes', async (req, res) => {
  try {
    const { keywords, location, email } = req.body;
    const kw = Array.isArray(keywords) ? keywords : [keywords];
    const r = await pool.query('INSERT INTO ja_alertes (keywords,location,email) VALUES ($1,$2,$3) RETURNING *',[kw,location,email]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/alertes/:id', async (req, res) => {
  try { await pool.query('DELETE FROM ja_alertes WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({status:'ok'}));
app.listen(4003, () => console.log('JobAssistant backend :4003'));

// ── RECALCUL SCORES ───────────────────────────────────────────────────────────
app.post('/api/recalcul-scores', async (req, res) => {
  try {
    const profil = await getProfil();
    const jobs = await pool.query('SELECT id, title, description, tags FROM ja_jobs');
    let updated = 0;
    for (const job of jobs.rows) {
      const score = calcScore(profil, job.title, job.description, job.tags);
      await pool.query('UPDATE ja_jobs SET ia_score=$1 WHERE id=$2', [score, job.id]);
      updated++;
    }
    res.json({ updated, message: `${updated} scores recalculés` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TRIGGER INDEED COLLECT ────────────────────────────────────────────────────
app.post('/api/collect-indeed', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    // Lancer en arrière-plan sans attendre
    const child = spawn('node', ['/app/collector_indeed.js'], { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ success: true, message: 'Collecte Indeed lancée en arrière-plan' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── VEILLE MARCHÉ ─────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');

app.get('/api/veille/france-travail', async (req, res) => {
  try {
    const { q, dept = '75' } = req.query;
    const token = await new Promise((resolve, reject) => {
      const body = 'grant_type=client_credentials&client_id=PAR_jobassistantia_f68a7f33ad46eaddfb1c2a825cec0137046951bd0005c7011515cce57421dd89&client_secret=9089ff106e4565a5eae1a1a1ba03f1b1dc7fd527a856fd1022955fb60ec2a4ca&scope=api_offresdemploiv2%20o2dsoffre';
      const r = require('https').request({
        hostname:'entreprise.francetravail.fr',
        path:'/connexion/oauth2/access_token?realm=%2Fpartenaire',
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)}
      }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d).access_token)}catch(e){reject(e)} }); });
      r.on('error',reject); r.write(body); r.end();
    });
    const data = await new Promise((resolve) => {
      const path = `/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(q)}&departement=${dept}&range=0-14&sort=1`;
      require('https').get({ hostname:'api.francetravail.io', path, headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'} },
        r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({resultats:[]})} }); }
      ).on('error',()=>resolve({resultats:[]}));
    });
    const jobs = (data.resultats||[]).map(j => ({
      title: j.appellationlibelle||j.intitule||'',
      company: j.entreprise?.nom||'',
      location: j.lieuTravail?.libelle||'',
      description: j.description||'',
      published_at: j.dateCreation,
      contract: j.typeContrat
    }));
    res.json({ jobs, total: jobs.length, query: q });
  } catch(e) { res.status(500).json({ error: e.message, jobs: [] }); }
});

app.post('/api/veille/send-email', async (req, res) => {
  try {
    const rapport = req.body.rapport || req.body.rapport_ia || '';
    const totalOffres = req.body.totalOffres || req.body.total_offres || 0;
    const nouvellesOffres = req.body.nouvellesOffres || req.body.nouvellesOffres24h || req.body.nouvelles_offres || 0;
    const topCompetences = req.body.topCompetences || req.body.top_competences || [];
    const topEntreprises = req.body.topEntreprises || req.body.top_entreprises || [];
    const date = req.body.date || req.body.dateAnalyse || new Date().toLocaleDateString('fr-FR');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: 'mmohamedassalia6@gmail.com', pass: process.env.GMAIL_PASS || '' }
    });
    const html = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1e3a5f, #2d6a9f); padding: 30px; color: white; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 8px 0 0; opacity: 0.8; }
  .stats { display: flex; padding: 20px; gap: 15px; background: #f8faff; }
  .stat { flex: 1; text-align: center; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e0e8ff; }
  .stat-num { font-size: 32px; font-weight: bold; color: #2d6a9f; }
  .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
  .content { padding: 25px; }
  .section { margin-bottom: 25px; }
  .section h2 { color: #1e3a5f; border-bottom: 2px solid #2d6a9f; padding-bottom: 8px; font-size: 16px; }
  .rapport { white-space: pre-wrap; line-height: 1.7; color: #333; font-size: 14px; background: #f8faff; padding: 20px; border-radius: 8px; border-left: 4px solid #2d6a9f; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .tag { background: #e8f0ff; color: #2d6a9f; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .footer { background: #1e3a5f; color: white; padding: 15px; text-align: center; font-size: 12px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🎯 Rapport Veille Marché</h1>
    <p>${date} — Product Owner & MOA Data</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-num">${totalOffres}</div><div class="stat-label">Offres totales</div></div>
    <div class="stat"><div class="stat-num">${nouvellesOffres}</div><div class="stat-label">Nouvelles 24h</div></div>
    <div class="stat"><div class="stat-num">${(topEntreprises||[]).length}</div><div class="stat-label">Entreprises actives</div></div>
  </div>
  <div class="content">
    <div class="section">
      <h2>🤖 Analyse IA du Marché</h2>
      <div class="rapport">${rapport||'Analyse en cours...'}</div>
    </div>
    <div class="section">
      <h2>💻 Top Compétences Demandées</h2>
      <div class="tags">${(topCompetences||[]).map(c=>`<span class="tag">${c}</span>`).join('')}</div>
    </div>
    <div class="section">
      <h2>🏢 Entreprises qui Recrutent</h2>
      <div class="tags">${(topEntreprises||[]).map(e=>`<span class="tag">${e}</span>`).join('')}</div>
    </div>
  </div>
  <div class="footer">JobAssistant IA — jobassistant.monairbyte.eu</div>
</div>
</body>
</html>`;

    await transporter.sendMail({
      from: 'JobAssistant IA <mmohamedassalia6@gmail.com>',
      to: 'mmohamedassalia6@gmail.com',
      subject: `🎯 Veille Marché ${date} — ${nouvellesOffres} nouvelles offres`,
      html
    });
    res.json({ success: true, message: 'Email envoyé' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/veille/save-rapport', async (req, res) => {
  try {
    const { totalOffres, nouvellesOffres24h, topCompetences, topEntreprises, rapport } = req.body;
    await pool.query(`CREATE TABLE IF NOT EXISTS ja_veille_rapports (
      id SERIAL PRIMARY KEY, date_rapport DATE DEFAULT CURRENT_DATE,
      total_offres INTEGER, nouvelles_offres INTEGER,
      top_competences JSONB, top_entreprises JSONB,
      rapport_ia TEXT, created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(
      'INSERT INTO ja_veille_rapports (total_offres, nouvelles_offres, top_competences, top_entreprises, rapport_ia) VALUES ($1,$2,$3,$4,$5)',
      [totalOffres, nouvellesOffres24h || 0, JSON.stringify(topCompetences), JSON.stringify(topEntreprises), rapport]
    );
    res.json({ success: true, message: 'Rapport sauvegardé' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/veille/run-complet', async (req, res) => {
  try {
    // Utiliser les offres déjà en DB + nouvelles collectées
    const hier = new Date(Date.now() - 24*60*60*1000);
    const allJobsResult = await pool.query('SELECT title, company, description, published_at, location FROM ja_jobs WHERE ia_score >= 30 ORDER BY published_at DESC LIMIT 200');
    const allJobs = allJobsResult.rows;

    const COMPS = ['SQL','Python','Power BI','Agile','Scrum','Data','BI','MOA','KPI','ETL','Docker','RAG','Azure','API','Git','pgvector','LangChain','LlamaIndex','OpenAI','Apache Superset','ClickHouse'];
    const compCount = {};
    const entCount = {};

    for (const job of allJobs) {
      const text = ((job.title||'') + ' ' + (job.description||'')).toLowerCase();
      COMPS.forEach(c => { if(text.includes(c.toLowerCase())) compCount[c]=(compCount[c]||0)+1; });
      if(job.company) entCount[job.company]=(entCount[job.company]||0)+1;
    }

    const topCompetences = Object.entries(compCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>k+': '+v+' offres');
    const topEntreprises = Object.entries(entCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>k+': '+v+' postes');
    const nouvellesOffres24h = allJobs.filter(j=>j.published_at&&new Date(j.published_at)>hier).length;
    const dateAnalyse = new Date().toLocaleDateString('fr-FR');

    // Meilleures offres France Travail pour le prompt
    const topFTOffres = allJobs
      .filter(j=>j.source==='France Travail')
      .sort((a,b)=>(b.ia_score||0)-(a.ia_score||0))
      .slice(0,15)
      .map(j=>j.title+' chez '+(j.company||'?')+' (score:'+j.ia_score+'%) — '+(j.description||'').slice(0,150))
      .join(' || ');

    const nouvellesDetails = allJobs
      .filter(j=>j.published_at&&new Date(j.published_at)>hier)
      .slice(0,5)
      .map(j=>(j.source||'?')+': '+j.title+' ('+j.company+')')
      .join(', ') || 'Aucune';

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    // Répartition par métier
    const metierStats = {};
    const metiersList = [
      {key:'product owner', label:'Product Owner'},
      {key:'data engineer', label:'Data Engineer'},
      {key:'moa', label:'MOA/AMOA'},
      {key:'analytics engineer', label:'Analytics Engineer'},
      {key:'data analyst', label:'Data Analyst'},
      {key:'business analyst', label:'Business Analyst'},
      {key:'data scientist', label:'Data Scientist'},
      {key:'scrum master', label:'Scrum Master'},
      {key:'ai engineer', label:'AI Engineer'},
      {key:'chef de projet', label:'Chef de Projet'}
    ];
    for (const m of metiersList) {
      const count = allJobs.filter(j=>(j.title||'').toLowerCase().includes(m.key)).length;
      if(count > 0) metierStats[m.label] = count;
    }
    const metierStatsStr = Object.entries(metierStats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+': '+v).join(', ');

    const prompt = 'Tu es expert emploi France IDF. Profil: Product Owner Data & IA, Analytics Engineer, Data Engineer, AI Engineer, MOA/AMOA, Business Analyst — 9 ans exp, PSPO I PSM I, Longjumeau 91, salaire cible 52-65k.\n' +
      'Date: ' + dateAnalyse + '. Total offres DB: ' + allJobs.length + '. Nouvelles 24h: ' + nouvellesOffres24h + '.\n' +
      'Nouvelles offres 24h: ' + nouvellesDetails + '\n' +
      'Top 15 meilleures offres France Travail: ' + topFTOffres + '\n' +
      'Repartition offres par metier: ' + metierStatsStr + '\n' +
      'Top competences: ' + topCompetences.join(', ') + '\n' +
      'Entreprises actives: ' + topEntreprises.join(', ') + '\n' +
      'Genere rapport 5 sections tableaux markdown 2 colonnes max:\n' +
      '1.RESUME EXECUTIF\n2.SIGNAUX CHAUDS (offres du jour en priorite)\n3.COMPETENCES A METTRE EN AVANT\n4.ENTREPRISES PRIORITAIRES\n5.ACTIONS AUJOURD HUI';

    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1500,messages:[{role:'user',content:prompt}]});
    const rapport = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur analyse')}})});
      r.on('error',e=>resolve('Erreur: '+e.message));r.write(body);r.end();
    });

    await pool.query('CREATE TABLE IF NOT EXISTS ja_veille_rapports (id SERIAL PRIMARY KEY,date_rapport DATE DEFAULT CURRENT_DATE,total_offres INTEGER,nouvelles_offres INTEGER,top_competences JSONB,top_entreprises JSONB,rapport_ia TEXT,created_at TIMESTAMP DEFAULT NOW())');
    await pool.query('INSERT INTO ja_veille_rapports (total_offres,nouvelles_offres,top_competences,top_entreprises,rapport_ia) VALUES ($1,$2,$3,$4,$5)',[allJobs.length,nouvellesOffres24h,JSON.stringify(topCompetences),JSON.stringify(topEntreprises),rapport]);

    res.json({ success: true, totalOffres: allJobs.length, nouvellesOffres24h, topCompetences, topEntreprises, rapport, dateAnalyse });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


app.post('/api/veille/run-et-email', async (req, res) => {
  try {
    // Appel interne run-complet
    const http = require('http');
    const data = await new Promise((resolve, reject) => {
      const req2 = http.request({hostname:'localhost',port:4003,path:'/api/veille/run-complet',method:'POST',headers:{'Content-Type':'application/json','Content-Length':0}}, r => {
        let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch(e){reject(e)} });
      });
      req2.on('error',reject); req2.end();
    });

    // Envoyer email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ service:'gmail', auth:{ user:'mmohamedassalia6@gmail.com', pass:process.env.GMAIL_PASS||'' } });
    

    // Convertir Markdown en HTML
    function mdToHtml(text) {
      if (!text) return '';
      return text
        // Tableaux markdown
        .replace(/\|(.+)\|\n\|[-|\s]+\|\n/g, (match, header) => {
          const cols = header.split('|').filter(c=>c.trim());
          return '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px"><tr>' + 
            cols.map(c=>'<th style="background:#1e3a5f;color:white;padding:6px 8px;text-align:left;font-size:12px;word-wrap:break-word">'+c.trim()+'</th>').join('') + '</tr>';
        })
        .replace(/\|(.+)\|/g, (match, row) => {
          const cols = row.split('|').filter(c=>c.trim());
          return '<tr>' + cols.map(c=>'<td style="padding:6px 8px;border-bottom:1px solid #e0e8ff;font-size:12px;word-wrap:break-word">'+c.trim()+'</td>').join('') + '</tr>';
        })
        .replace(/<\/tr>\n(?!<tr|<\/table)/g, '</tr></table>')
        // Titres
        .replace(/^### (.+)$/gm, '<h4 style="color:#2d6a9f;margin:16px 0 6px;font-size:14px">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="color:#1e3a5f;margin:20px 0 8px;font-size:16px;border-bottom:2px solid #2d6a9f;padding-bottom:6px">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 style="color:#1e3a5f;margin:24px 0 10px;font-size:18px">$1</h2>')
        // Gras
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1e3a5f">$1</strong>')
        // Italique
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Citations
        .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #2d6a9f;margin:10px 0;padding:10px 16px;background:#f0f6ff;border-radius:0 8px 8px 0;font-style:italic;color:#333">$1</blockquote>')
        // Listes
        .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:8px;color:#333;font-size:13px">$1</li>')
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul style="margin:8px 0;padding-left:20px">${m}</ul>`)
        // Séparateurs
        .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e0e8ff;margin:16px 0">')
        // Sauts de ligne
        .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.7;font-size:13px;color:#333">')
        .replace(/\n/g, '<br>');
    }

    rapportHtml = mdToHtml(data.rapport || '');
    var css = 'body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px}';
    css += '.container{max-width:720px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12)}';
    css += '.header{background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:35px 30px;color:white;text-align:center}';
    css += '.header h1{margin:0 0 8px;font-size:26px}.header p{margin:0;opacity:0.85;font-size:14px}';
    css += '.stats{display:flex;padding:20px;gap:12px;background:#f8faff;border-bottom:1px solid #e0e8ff}';
    css += '.stat{flex:1;text-align:center;background:white;padding:16px 8px;border-radius:10px;border:1px solid #e0e8ff}';
    css += '.stat-num{font-size:34px;font-weight:800;color:#2d6a9f;line-height:1}';
    css += '.stat-label{font-size:11px;color:#888;margin-top:6px;text-transform:uppercase}';
    css += '.content{padding:28px}.section{margin-bottom:24px}';
    css += '.section-title{font-size:16px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #2d6a9f;padding-bottom:8px;margin-bottom:14px}';
    css += '.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}';
    css += '.tag-blue{background:#e8f0ff;color:#2d6a9f;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}';
    css += '.tag-green{background:#e8f8f0;color:#1a7a4a;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}';
    css += 'table{width:100%;border-collapse:collapse;margin:12px 0}';
    css += 'th{background:#1e3a5f;color:white;padding:9px 12px;text-align:left;font-size:12px}';
    css += 'td{padding:8px 12px;border-bottom:1px solid #e8f0ff;font-size:13px;color:#333}';
    css += 'tr:nth-child(even) td{background:#f8faff}';
    css += '.footer{background:#1e3a5f;color:rgba(255,255,255,0.8);padding:16px;text-align:center;font-size:12px}';
    var statsHtml = '<div class="stats">';
    statsHtml += '<div class="stat"><div class="stat-num">'+data.totalOffres+'</div><div class="stat-label">Offres analysées</div></div>';
    statsHtml += '<div class="stat"><div class="stat-num">'+data.nouvellesOffres24h+'</div><div class="stat-label">Nouvelles 24h</div></div>';
    statsHtml += '<div class="stat"><div class="stat-num">'+((data.topEntreprises||[]).length)+'</div><div class="stat-label">Entreprises actives</div></div>';
    statsHtml += '</div>';
    var tagsComps = (data.topCompetences||[]).map(function(c){return '<span class="tag-blue">'+c+'</span>';}).join('');
    var tagsEnts = (data.topEntreprises||[]).map(function(e){return '<span class="tag-green">'+e+'</span>';}).join('');
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'+css+'</style></head><body>';
    html += '<div class="container">';
    html += '<div class="header"><h1>🎯 Rapport Veille Marché</h1><p>'+data.dateAnalyse+' — Product Owner · MOA · Data Engineer · Analytics · AI Engineer | IDF</p></div>';
    html += statsHtml;
    html += '<div class="content">';
    html += '<div class="section"><div class="section-title">🤖 Analyse IA du Marché</div><div style="line-height:1.7;font-size:13px;color:#333">'+rapportHtml+'</div></div>';
    html += '<div class="section"><div class="section-title">💻 Top Compétences Demandées</div><div class="tags">'+tagsComps+'</div></div>';
    html += '<div class="section"><div class="section-title">🏢 Entreprises qui Recrutent</div><div class="tags">'+tagsEnts+'</div></div>';
    html += '</div>';
    html += '<div class="footer">JobAssistant IA — jobassistant.monairbyte.eu | Rapport généré par Claude IA</div>';
    html += '</div></body></html>';

    await transporter.sendMail({ from:'JobAssistant IA <mmohamedassalia6@gmail.com>', to:'mmohamedassalia6@gmail.com', subject:'🎯 Veille Marché '+data.dateAnalyse+' — '+data.totalOffres+' offres analysées', html });
    
    res.json({ success: true, totalOffres: data.totalOffres, message: 'Veille complète et email envoyé' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCORING CONFIG ────────────────────────────────────────────────────────────
app.get('/api/scoring-config', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ja_scoring_config ORDER BY poids DESC');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/scoring-config/:critere', async (req, res) => {
  try {
    const { poids, actif, label, description } = req.body;
    const r = await pool.query(
      'UPDATE ja_scoring_config SET poids=$1, actif=$2, label=$3, description=$4, updated_at=NOW() WHERE critere=$5 RETURNING *',
      [poids, actif, label, description, req.params.critere]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/scoring-config', async (req, res) => {
  try {
    const { critere, label, poids, description } = req.body;
    const r = await pool.query(
      'INSERT INTO ja_scoring_config (critere, label, poids, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [critere, label, poids, description]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/scoring-config/:critere', async (req, res) => {
  try {
    await pool.query('DELETE FROM ja_scoring_config WHERE critere=$1', [req.params.critere]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GENERER LETTRE DE MOTIVATION ─────────────────────────────────────────────
app.post('/api/generer-lettre', async (req, res) => {
  try {
    const { offre_id } = req.body;
    const profil = await getProfil();
    const jobResult = await pool.query('SELECT * FROM ja_jobs WHERE id=$1', [offre_id]);
    const job = jobResult.rows[0];
    if (!job) return res.status(404).json({ error: 'Offre non trouvée' });

    const prompt = `Tu es expert en rédaction de lettres de motivation pour des profils Data & IA seniors.

Rédige une lettre de motivation professionnelle et personnalisée pour ce candidat :
- Nom : ${profil.nom}
- Titre : ${profil.titre}
- Expérience : ${profil.annees_experience} ans (Free Mobile, SFR, Orange)
- Certifications : PSPO I, PSM I (Scrum.org 2026)
- Compétences clés : RAG, LangChain, pgvector, Apache Superset, Power BI, SQL, Python, ETL, Docker, n8n
- Localisation : Longjumeau (91), IDF
- Salaire cible : 52-65k€

Pour cette offre :
- Titre : ${job.title}
- Entreprise : ${job.company || 'Non précisée'}
- Localisation : ${job.location || 'IDF'}
- Description : ${(job.description || '').slice(0, 800)}

Instructions :
- Lettre courte (250-300 mots max)
- Ton professionnel et direct
- Mettre en avant 2-3 compétences clés qui matchent l'offre
- Mentionner une réalisation concrète chiffrée
- Pas de formules bateau ("je me permets de...")
- Terminer par une phrase d'accroche pour l'entretien
- Format : Objet + Corps + Formule de politesse`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:800,messages:[{role:'user',content:prompt}]});
    const lettre = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur: '+e.message));r.write(body);r.end();
    });

    res.json({ lettre });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ALERTE OFFRES TOP SCORE ───────────────────────────────────────────────────
app.post('/api/alertes/check-top-offres', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({service:'gmail',auth:{user:'mmohamedassalia6@gmail.com',pass:process.env.GMAIL_PASS||''}});

    // Offres avec score >= 80 ajoutées dans les dernières 2h
    const result = await pool.query(`
      SELECT title, company, location, ia_score, url, tags, contract_type
      FROM ja_jobs 
      WHERE ia_score >= 80 
      AND created_at > NOW() - INTERVAL '2 hours'
      ORDER BY ia_score DESC LIMIT 10
    `);

    if (result.rows.length === 0) return res.json({sent:false, message:'Aucune nouvelle offre top score'});

    const offresHtml = result.rows.map(j => `
      <div style="background:#f8faff;border-left:4px solid #2d6a9f;padding:12px;margin:8px 0;border-radius:4px">
        <div style="font-weight:700;color:#1e3a5f;font-size:14px">${j.title}</div>
        <div style="color:#64748b;font-size:12px">${j.company||'?'} · ${j.location||'IDF'} · ${j.contract_type||'CDI'}</div>
        <div style="margin:6px 0">${(j.tags||[]).map(t=>`<span style="background:#e8f0ff;color:#2d6a9f;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px">${t}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <span style="background:#22c55e;color:white;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:700">${j.ia_score}%</span>
          ${j.url ? `<a href="${j.url}" style="color:#2d6a9f;font-size:12px">Voir l'offre →</a>` : ''}
        </div>
      </div>
    `).join('');

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:24px;color:white;text-align:center">
          <h2 style="margin:0">🚨 ${result.rows.length} nouvelle(s) offre(s) TOP SCORE !</h2>
          <p style="margin:8px 0 0;opacity:0.85">Score ≥ 80% — À postuler rapidement</p>
        </div>
        <div style="padding:20px">${offresHtml}</div>
        <div style="background:#1e3a5f;color:rgba(255,255,255,0.7);padding:12px;text-align:center;font-size:12px">
          JobAssistant IA — jobassistant.monairbyte.eu
        </div>
      </div>
    </body></html>`;

    await transporter.sendMail({
      from:'JobAssistant IA <mmohamedassalia6@gmail.com>',
      to:'mmohamedassalia6@gmail.com',
      subject:`🚨 ${result.rows.length} offre(s) TOP SCORE détectée(s) — Score ≥ 80%`,
      html
    });

    res.json({sent:true, count:result.rows.length});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ── STATUT VEILLE ─────────────────────────────────────────────────────────────
app.get('/api/veille/statut', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ja_veille_rapports ORDER BY created_at DESC LIMIT 5');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCORE DÉTAILLÉ ────────────────────────────────────────────────────────────
app.get('/api/jobs/:id/score-detail', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1', [req.params.id])).rows[0];
    if (!job) return res.status(404).json({ error: 'Offre non trouvée' });

    const titleL = (job.title||'').toLowerCase();
    const descL = (job.description||'').toLowerCase();
    const full = titleL + ' ' + descL + ' ' + (job.tags||[]).join(' ').toLowerCase();

    const details = [];
    let total = 0;

    // Titre
    const metiersTitre = ['product owner','it product manager','data product manager','moa','amoa','chef de projet','analytics engineer','data engineer','ai engineer','data analyst','business analyst','data scientist','scrum master','lead data','architecte data','consultant data'];
    let titreScore = 0;
    metiersTitre.forEach(m => { if(titleL.includes(m)) titreScore += 12; });
    if(titleL.includes('product owner') && (titleL.includes('data')||titleL.includes('ia'))) titreScore += 12;
    if((titleL.includes('moa')||titleL.includes('maîtrise')) && titleL.includes('data')) titreScore += 12;
    if(titleL.includes('data engineer')||titleL.includes('analytics engineer')) titreScore += 10;
    if(titleL.includes('ai engineer')||titleL.includes('rag')) titreScore += 12;
    titreScore = Math.min(titreScore, 40);
    details.push({critere:'Titre du poste', points:titreScore, max:40, detail:titleL.includes('product owner')||titleL.includes('moa')||titleL.includes('data engineer')?'Métier ciblé détecté':'Titre générique'});
    total += titreScore;

    // Compétences rares
    const rares = ['rag','pgvector','apache superset','langchain','llamaindex','langgraph','openai api','embeddings','mlops','headless bi','airbyte','clickhouse'];
    const raresFound = rares.filter(c => full.includes(c));
    const raresScore = Math.min(raresFound.length * 5, 20);
    details.push({critere:'Compétences rares', points:raresScore, max:20, detail:raresFound.length > 0 ? raresFound.join(', ') : 'Aucune compétence rare détectée'});
    total += raresScore;

    // Compétences standard
    const std = ['sql','python','power bi','agile','scrum','docker','n8n','etl','git','api','kpi','roadmap','backlog','data','bi','analytics'];
    const stdFound = std.filter(c => full.includes(c));
    const stdScore = Math.min(stdFound.length * 2, 15);
    details.push({critere:'Compétences standard', points:stdScore, max:15, detail:stdFound.slice(0,5).join(', ')});
    total += stdScore;

    // Localisation
    let locScore = 0;
    if(full.includes('paris')||full.includes('ile-de-france')||full.includes('92 -')||full.includes('91 -')) locScore = 10;
    else if(full.includes('remote')||full.includes('france')) locScore = 5;
    details.push({critere:'Localisation IDF', points:locScore, max:10, detail:locScore===10?'Paris/IDF détecté':locScore===5?'France/Remote':'Hors IDF'});
    total += locScore;

    // Salaire
    const salScore = full.match(/4[89][0-9]{3}|5[0-9]{4}|6[0-5][0-9]{3}/) ? 7 : 0;
    details.push({critere:'Salaire compatible', points:salScore, max:7, detail:salScore?'Fourchette 48-65k détectée':'Non mentionné'});
    total += salScore;

    // Séniorité
    const senScore = (full.includes('senior')||full.includes('confirmé')||full.includes('lead')) ? 5 : 2;
    details.push({critere:'Séniorité', points:senScore, max:5, detail:senScore===5?'Profil senior requis':'Niveau non précisé'});
    total += senScore;

    res.json({ total: Math.min(total, 99), details, job: {title:job.title, company:job.company} });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PITCH IA ──────────────────────────────────────────────────────────────────
app.post('/api/jobs/:id/pitch', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1', [req.params.id])).rows[0];
    if (!job) return res.status(404).json({ error: 'Non trouvée' });

    const prompt = `En 3 phrases max, génère un pitch percutant pour Mohamed Assalia Maiga (9 ans exp, PSPO I, RAG/pgvector/Superset) pour ce poste: "${job.title}" chez ${job.company||'?'}. Description: ${(job.description||'').slice(0,300)}. Le pitch doit montrer l'adéquation immédiate avec le poste. Commence directement par le pitch, pas d'introduction.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:200,messages:[{role:'user',content:prompt}]});
    const pitch = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ pitch });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PRÉPARATION ENTRETIEN ─────────────────────────────────────────────────────
app.post('/api/jobs/:id/entretien', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1', [req.params.id])).rows[0];
    if (!job) return res.status(404).json({ error: 'Non trouvée' });

    const prompt = `Tu es coach carrière expert. Pour Mohamed Assalia Maiga (Product Owner Data & IA, 9 ans, Free Mobile/SFR/Orange, PSPO I PSM I, RAG/pgvector/Superset/Python/SQL), génère 5 questions d'entretien probables pour ce poste: "${job.title}" chez ${job.company||'?'}. Description: ${(job.description||'').slice(0,400)}. Pour chaque question, donne une réponse suggérée basée sur son profil réel. Format: Q: [question]\nR: [réponse suggérée]`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]});
    const questions = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ questions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CV PDF ────────────────────────────────────────────────────────────────────
app.get('/api/profil/cv-pdf', async (req, res) => {
  try {
    const profil = await getProfil();
    const html = `<!DOCTYPE html><html><head><meta charset=UTF-8><style>
body{font-family:Arial,sans-serif;padding:30px;color:#333;max-width:800px;margin:0 auto;font-size:13px}
h1{color:#1e3a5f;font-size:22px;margin:0 0 4px}
h2{color:#1e3a5f;font-size:14px;border-bottom:2px solid #2d6a9f;padding-bottom:4px;margin:16px 0 8px}
.subtitle{color:#2d6a9f;font-size:14px;margin-bottom:4px}
.contact{color:#64748b;font-size:12px;margin-bottom:16px}
.tags{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
.tag{background:#e8f0ff;color:#2d6a9f;padding:3px 8px;border-radius:4px;font-size:11px}
.section{margin-bottom:12px}
.exp{margin-bottom:10px}
.exp-title{font-weight:700;color:#1e3a5f}
.exp-sub{color:#64748b;font-size:12px}
@media print{body{padding:15px}}
</style></head><body>
<h1>${profil.nom}</h1>
<div class=subtitle>${profil.titre}</div>
<div class=contact>Longjumeau (91), Île-de-France | mmohamedassalia6@gmail.com | +33 778 501 767 | Disponible immédiatement</div>
<h2>PROFIL</h2>
<p>${profil.resume||'Product Owner Data & IA, IT Product Manager et Data Engineer avec '+profil.annees_experience+' ans d\'expérience en Data, Analytics et Télécommunications chez Free Mobile, SFR et Orange.'}</p>
<h2>CERTIFICATIONS</h2>
<div class=tags>${(profil.certifications||[]).map(c=>'<span class=tag>'+c+'</span>').join('')}</div>
<h2>STACK TECHNIQUE</h2>
<div class=tags>${(profil.competences||[]).map(c=>'<span class=tag>'+c+'</span>').join('')}</div>
<h2>MÉTIERS CIBLÉS</h2>
<div class=tags>${(profil.metiers||[]).map(m=>'<span class=tag>'+m+'</span>').join('')}</div>
<h2>EXPÉRIENCES</h2>
<div class=exp><div class=exp-title>IT Product Manager, Data Analytics — Free Mobile (Iliad Group)</div><div class=exp-sub>Juin 2022 – Mai 2026 | Paris, CDI</div><p>Pilotage roadmap analytique QoS/QoE nationale, 50 KPI réseau 3G/4G/5G, pipelines ETL/ELT, dashboards Power BI et Apache Superset. -40% délai détection incidents.</p></div>
<div class=exp><div class=exp-title>Product Owner Data & IA — Projet Association (Bénévole)</div><div class=exp-sub>Janvier 2023 – Aujourd'hui | Longjumeau (91)</div><p>Plateforme 5 modules pour 150+ résidents. Architecture RAG: pgvector + OpenAI API + LangChain. DocTracker forensique, Headless BI Superset+React.</p></div>
<div class=exp><div class=exp-title>Analyste QoS — Free Mobile</div><div class=exp-sub>Avril 2020 – Mai 2022 | Paris, CDI</div><p>Dashboards Power BI, 300+ stations RATP, zones blanches, reportings réglementaires.</p></div>
<div class=exp><div class=exp-title>Ingénieur Radio — SFR NOC SPAR</div><div class=exp-sub>Novembre 2016 – Janvier 2020 | Vélizy, CDI</div><p>Analyse KPI 2G/3G/4G, worst cells, automatisation VBA et Power BI.</p></div>
<h2>FORMATION</h2>
<p>Master Composants et Antennes — Télécommunications | Université Paris-Sud (Paris XI) | 2014–2016</p>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SIMULATEUR SALAIRE ────────────────────────────────────────────────────────
app.get('/api/stats/salaires', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN title ILIKE '%product owner%' THEN 'Product Owner'
          WHEN title ILIKE '%moa%' OR title ILIKE '%maîtrise%' THEN 'MOA/AMOA'
          WHEN title ILIKE '%data engineer%' THEN 'Data Engineer'
          WHEN title ILIKE '%analytics engineer%' THEN 'Analytics Engineer'
          WHEN title ILIKE '%data analyst%' THEN 'Data Analyst'
          WHEN title ILIKE '%business analyst%' THEN 'Business Analyst'
          WHEN title ILIKE '%data scientist%' THEN 'Data Scientist'
          ELSE 'Autre'
        END as metier,
        COUNT(*) as nb_offres,
        ROUND(AVG(ia_score)) as score_moyen,
        MAX(ia_score) as score_max
      FROM ja_jobs
      WHERE ia_score >= 50
      GROUP BY 1
      ORDER BY score_moyen DESC`);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PROFIL PUBLIC ─────────────────────────────────────────────────────────────
app.get('/profil', async (req, res) => {
  try {
    const profil = await getProfil();
    const stats = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN ia_score>=80 THEN 1 END) as top FROM ja_jobs');
    const html = `<!DOCTYPE html><html><head><meta charset=UTF-8><meta name="viewport" content="width=device-width,initial-scale=1"><title>${profil.nom} — Profil</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#060b18;color:#e2e8f0;min-height:100vh;padding:20px}
.container{max-width:600px;margin:0 auto}
.header{background:linear-gradient(135deg,#1e3a5f,#2d6a9f);border-radius:16px;padding:30px;text-align:center;margin-bottom:16px}
h1{font-size:24px;font-weight:800;margin-bottom:6px}
.subtitle{color:rgba(255,255,255,0.8);font-size:14px;margin-bottom:4px}
.contact{color:rgba(255,255,255,0.6);font-size:12px}
.card{background:rgba(15,23,42,0.85);border:1px solid rgba(139,92,246,0.18);border-radius:12px;padding:16px;margin-bottom:12px}
.card h2{font-size:14px;color:#8b5cf6;margin-bottom:10px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.2);border-radius:6px;padding:3px 10px;font-size:11px}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.stat{background:rgba(15,23,42,0.85);border:1px solid rgba(139,92,246,0.18);border-radius:12px;padding:12px;text-align:center}
.stat-num{font-size:24px;font-weight:800;color:#8b5cf6}
.stat-label{font-size:10px;color:#64748b;margin-top:4px}
.badge{background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;margin:4px 0}
.footer{text-align:center;color:#475569;font-size:11px;margin-top:16px}
</style></head><body>
<div class=container>
  <div class=header>
    <h1>${profil.nom}</h1>
    <div class=subtitle>${profil.titre}</div>
    <div class=contact>Longjumeau (91) • Disponible immédiatement • mmohamedassalia6@gmail.com</div>
  </div>
  <div class=stats>
    <div class=stat><div class=stat-num>${profil.annees_experience}</div><div class=stat-label>Ans d'exp.</div></div>
    <div class=stat><div class=stat-num>${(profil.competences||[]).length}</div><div class=stat-label>Compétences</div></div>
    <div class=stat><div class=stat-num>${(profil.metiers||[]).length}</div><div class=stat-label>Métiers ciblés</div></div>
  </div>
  <div class=card>
    <h2>Certifications</h2>
    ${(profil.certifications||[]).map(c=>'<div class=badge>✅ '+c+'</div>').join('')}
  </div>
  <div class=card>
    <h2>Stack Technique</h2>
    <div class=tags>${(profil.competences||[]).map(c=>'<span class=tag>'+c+'</span>').join('')}</div>
  </div>
  <div class=card>
    <h2>Métiers ciblés</h2>
    <div class=tags>${(profil.metiers||[]).map(m=>'<span class=tag>'+m+'</span>').join('')}</div>
  </div>
  <div class=footer>Profil généré par JobAssistant IA — jobassistant.monairbyte.eu</div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYSE ATS CV ────────────────────────────────────────────────────────────
app.post('/api/analyse-ats', async (req, res) => {
  try {
    const profil = await getProfil();
    // Top compétences demandées dans les offres
    const topComps = await pool.query(`
      SELECT unnest(tags) as comp, COUNT(*) as nb
      FROM ja_jobs WHERE ia_score >= 50
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20`);

    const demandeesMarche = topComps.rows.map(r => r.comp.toLowerCase());
    const competencesProfil = (profil.competences||[]).map(c => c.toLowerCase());

    const manquantes = demandeesMarche.filter(c => !competencesProfil.some(p => p.includes(c) || c.includes(p)));
    const presentes = demandeesMarche.filter(c => competencesProfil.some(p => p.includes(c) || c.includes(p)));
    const score = Math.round(presentes.length / demandeesMarche.length * 100);

    const prompt = `Tu es expert ATS et recrutement tech France. Analyse ce profil pour le marché IDF 2026:
Profil: ${profil.titre}, ${profil.annees_experience} ans exp, certif: ${(profil.certifications||[]).join(', ')}
Competences profil: ${competencesProfil.slice(0,20).join(', ')}
Top 20 competences demandees sur le marche IDF: ${demandeesMarche.join(', ')}
Competences manquantes vs marche: ${manquantes.slice(0,10).join(', ')}
Score ATS actuel: ${score}%

Donne:
1. Score ATS /100 avec explication
2. Top 5 competences a ajouter immediatement au CV
3. Formulation optimale du titre pour passer les ATS
4. 3 mots-cles critiques manquants
5. Conseil pour le resume/accroche

Sois direct et actionnable.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:800,messages:[{role:'user',content:prompt}]});
    const analyse = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur'));r.write(body);r.end();
    });

    res.json({ score, presentes, manquantes: manquantes.slice(0,10), analyse });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MESSAGE LINKEDIN ──────────────────────────────────────────────────────────
app.post('/api/jobs/:id/linkedin-message', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1',[req.params.id])).rows[0];
    if(!job) return res.status(404).json({error:'Non trouvée'});

    const prompt = `Génère un message LinkedIn court (4-5 lignes max) pour Mohamed Assalia Maiga qui postule chez ${job.company||'cette entreprise'} pour le poste "${job.title}". Profil: PO Data & IA, 9 ans Free Mobile/SFR/Orange, PSPO I PSM I, RAG/pgvector/Superset. Le message doit être naturel, pas commercial, montrer une vraie connaissance de l'entreprise et se terminer par une question ouverte. Commence directement par le message.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:200,messages:[{role:'user',content:prompt}]});
    const message = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ message });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATISTIQUES PERSONNELLES ─────────────────────────────────────────────────
app.get('/api/stats/candidatures', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) as total FROM ja_candidatures');
    const parStatut = await pool.query('SELECT statut, COUNT(*) as nb FROM ja_candidatures GROUP BY statut');
    const tauxReponse = await pool.query(`SELECT COUNT(*) as nb FROM ja_candidatures WHERE statut != 'postule'`);
    const relances = await pool.query(`SELECT COUNT(*) as nb FROM ja_candidatures WHERE statut='postule' AND date_postulation < NOW() - INTERVAL '7 days'`);
    res.json({
      total: parseInt(total.rows[0].total),
      parStatut: parStatut.rows,
      tauxReponse: total.rows[0].total > 0 ? Math.round(parseInt(tauxReponse.rows[0].nb)/parseInt(total.rows[0].total)*100) : 0,
      aRelancer: parseInt(relances.rows[0].nb)
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MESSAGE FRANCE TRAVAIL ────────────────────────────────────────────────────
app.post('/api/jobs/:id/ft-message', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1',[req.params.id])).rows[0];
    if(!job) return res.status(404).json({error:'Non trouvée'});

    const prompt = `Génère un message de candidature court et percutant (5-6 lignes max) pour le champ "Message au recruteur" sur France Travail. Candidat: Mohamed Assalia Maiga, Product Owner Data & IA, 9 ans Free Mobile/SFR/Orange, PSPO I PSM I, disponible immédiatement, Longjumeau 91. Poste: "${job.title}" chez ${job.company||'?'}. Le message doit être professionnel, montrer la valeur ajoutée immédiate et donner envie de lire le CV. Commence directement par le message, sans objet ni formule d'introduction.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:200,messages:[{role:'user',content:prompt}]});
    const message = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',e=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ message });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── UPLOAD CV PDF ─────────────────────────────────────────────────────────────
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads/' });

app.post('/api/profil/upload-cv', upload.single('cv'), async (req, res) => {
  try {
    const fs = require('fs');
    const { execSync } = require('child_process');
    const filePath = req.file.path;

    // Extraire texte du PDF
    let cvText = '';
    try {
      cvText = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf8', timeout: 15000 });
    } catch(e) {
      cvText = fs.readFileSync(filePath, 'utf8');
    }
    fs.unlinkSync(filePath);

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const prompt = `Analyse ce CV et extrait les informations en JSON exact:
{
  "nom": "...",
  "titre": "...",
  "annees_experience": nombre,
  "competences": ["liste", "des", "competences", "techniques"],
  "metiers": ["liste", "des", "metiers", "cibles"],
  "certifications": ["liste"],
  "localisation": "...",
  "resume": "resume en 2 phrases"
}
CV: ${cvText.slice(0, 3000)}
Retourne UNIQUEMENT le JSON, rien d'autre.`;

    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]});
    const result = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve(null)}})});
      r.on('error',()=>resolve(null));r.write(body);r.end();
    });

    const data = JSON.parse(result.replace(/```json|```/g,'').trim());
    
    // Mettre à jour le profil
    await pool.query(`UPDATE ja_profil SET 
      nom=COALESCE($1,nom), titre=COALESCE($2,titre), 
      annees_experience=COALESCE($3,annees_experience),
      competences=COALESCE($4,competences), metiers=COALESCE($5,metiers),
      certifications=COALESCE($6,certifications), localisation=COALESCE($7,localisation),
      resume=COALESCE($8,resume), updated_at=NOW()
      WHERE id=(SELECT id FROM ja_profil ORDER BY id DESC LIMIT 1)`,
      [data.nom, data.titre, data.annees_experience, data.competences, 
       data.metiers, data.certifications, data.localisation, data.resume]);

    res.json({ success: true, data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MATCH CV/OFFRE ────────────────────────────────────────────────────────────
app.post('/api/jobs/:id/match-cv', async (req, res) => {
  try {
    const profil = await getProfil();
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1',[req.params.id])).rows[0];
    if(!job) return res.status(404).json({error:'Non trouvée'});

    const prompt = `Analyse le match entre ce candidat et cette offre:
CANDIDAT: ${profil.nom}, ${profil.titre}, ${profil.annees_experience} ans
Competences: ${(profil.competences||[]).join(', ')}
Certifications: ${(profil.certifications||[]).join(', ')}

OFFRE: ${job.title} chez ${job.company||'?'}
Description: ${(job.description||'').slice(0,600)}
Tags: ${(job.tags||[]).join(', ')}

Donne en JSON:
{
  "score_match": nombre 0-100,
  "points_forts": ["liste 3 points forts du candidat pour ce poste"],
  "points_faibles": ["liste 2-3 ecarts a combler"],
  "conseil": "conseil en 1 phrase pour maximiser les chances",
  "verdict": "POSTULER MAINTENANT / POSTULER / A SURVEILLER / PASSER"
}
Retourne UNIQUEMENT le JSON.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,messages:[{role:'user',content:prompt}]});
    const result = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve(null)}})});
      r.on('error',()=>resolve(null));r.write(body);r.end();
    });

    const data = JSON.parse(result.replace(/```json|```/g,'').trim());
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── RELANCE EMAIL ─────────────────────────────────────────────────────────────
app.post('/api/candidatures/:id/relance', async (req, res) => {
  try {
    const profil = await getProfil();
    const cand = (await pool.query('SELECT * FROM ja_candidatures WHERE id=$1',[req.params.id])).rows[0];
    if(!cand) return res.status(404).json({error:'Non trouvée'});

    const prompt = `Génère un email de relance court et professionnel (5-6 lignes) pour Mohamed Assalia Maiga qui a postulé il y a 7+ jours pour "${cand.title}" chez ${cand.company||'?'}. Ton naturel, pas insistant, rappelle sa valeur ajoutée (PO Data & IA, 9 ans, PSPO I, disponible immédiatement). Commence par Objet: puis le corps du mail.`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,messages:[{role:'user',content:prompt}]});
    const email = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',()=>resolve('Erreur'));r.write(body);r.end();
    });

    // Marquer comme relancé
    await pool.query("UPDATE ja_candidatures SET statut='relance' WHERE id=$1",[req.params.id]);
    res.json({ email });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── HISTORIQUE RAPPORTS ───────────────────────────────────────────────────────
app.get('/api/veille/historique', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, date_rapport, total_offres, nouvelles_offres, top_competences, top_entreprises, created_at FROM ja_veille_rapports ORDER BY created_at DESC LIMIT 10');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ENTREPRISES GÉOLOCALISÉES ─────────────────────────────────────────────────
app.get('/api/stats/entreprises-map', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT company, location, COUNT(*) as nb_offres, ROUND(AVG(ia_score)) as score_moyen
      FROM ja_jobs 
      WHERE company IS NOT NULL AND company != '' AND ia_score >= 50
      GROUP BY company, location
      ORDER BY nb_offres DESC LIMIT 30`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TENDANCES MARCHÉ ──────────────────────────────────────────────────────────
app.get('/api/stats/tendances', async (req, res) => {
  try {
    const parJour = await pool.query(`
      SELECT DATE(published_at) as date, COUNT(*) as nb
      FROM ja_jobs WHERE published_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(published_at) ORDER BY date DESC LIMIT 14`);
    
    const parMetier = await pool.query(`
      SELECT CASE 
        WHEN title ILIKE '%product owner%' THEN 'Product Owner'
        WHEN title ILIKE '%moa%' OR title ILIKE '%maîtrise%' THEN 'MOA/AMOA'
        WHEN title ILIKE '%data engineer%' THEN 'Data Engineer'
        WHEN title ILIKE '%data analyst%' THEN 'Data Analyst'
        WHEN title ILIKE '%business analyst%' THEN 'Business Analyst'
        WHEN title ILIKE '%data scientist%' THEN 'Data Scientist'
        ELSE 'Autre'
      END as metier, COUNT(*) as nb
      FROM ja_jobs WHERE ia_score >= 50
      GROUP BY 1 ORDER BY 2 DESC`);

    const parSource = await pool.query(`SELECT source, COUNT(*) as nb FROM ja_jobs GROUP BY source`);

    res.json({ parJour: parJour.rows, parMetier: parMetier.rows, parSource: parSource.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── COMPARATEUR OFFRES ────────────────────────────────────────────────────────
app.post('/api/jobs/comparer', async (req, res) => {
  try {
    const { ids } = req.body;
    const r = await pool.query('SELECT * FROM ja_jobs WHERE id = ANY($1)', [ids]);
    const profil = await getProfil();
    
    const jobs = r.rows.map(job => {
      const full = (job.title+' '+job.description+' '+(job.tags||[]).join(' ')).toLowerCase();
      const rares = ['rag','pgvector','apache superset','langchain','llamaindex','openai api','mlops','clickhouse'];
      const std = ['sql','python','power bi','agile','scrum','docker','git','etl'];
      return {
        ...job,
        raresMatch: rares.filter(c=>full.includes(c)),
        stdMatch: std.filter(c=>full.includes(c)),
        idf: full.includes('paris')||full.includes('ile-de-france')||full.includes('91 -')||full.includes('92 -'),
      };
    });
    res.json(jobs);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── RAPPELS QUOTIDIENS ────────────────────────────────────────────────────────
app.post('/api/rappels/envoyer', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({service:'gmail',auth:{user:'mmohamedassalia6@gmail.com',pass:process.env.GMAIL_PASS||''}});

    // Offres top score nouvelles
    const topOffres = await pool.query(`SELECT title, company, ia_score, url FROM ja_jobs WHERE ia_score >= 75 AND created_at > NOW() - INTERVAL '24 hours' ORDER BY ia_score DESC LIMIT 5`);
    
    // Candidatures à relancer
    const aRelancer = await pool.query(`SELECT title, company FROM ja_candidatures WHERE statut='postule' AND date_postulation < NOW() - INTERVAL '7 days' LIMIT 5`);
    
    // Stats du jour
    const stats = await pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as nouvelles FROM ja_jobs`);

    const topHtml = topOffres.rows.map(j=>`<li><strong>${j.title}</strong> — ${j.company||'?'} — <span style="color:#22c55e">${j.ia_score}%</span></li>`).join('');
    const relanceHtml = aRelancer.rows.map(c=>`<li>${c.title} chez ${c.company||'?'}</li>`).join('');

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f0f4f8">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
<div style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:24px;color:white;text-align:center">
<h2 style="margin:0">📋 Agenda du jour — ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</h2>
</div>
<div style="padding:20px">
<h3 style="color:#1e3a5f">📊 Marché aujourd'hui</h3>
<p>${stats.rows[0].total} offres en base · <strong>${stats.rows[0].nouvelles} nouvelles aujourd'hui</strong></p>
${topOffres.rows.length>0?`<h3 style="color:#1e3a5f">🔥 Offres prioritaires à postuler</h3><ul>${topHtml}</ul>`:''}
${aRelancer.rows.length>0?`<h3 style="color:#f59e0b">🔔 Candidatures à relancer</h3><ul>${relanceHtml}</ul>`:''}
<h3 style="color:#1e3a5f">✅ Actions du jour</h3>
<ul>
<li>Consulter les nouvelles offres sur <a href="https://jobassistant.monairbyte.eu">JobAssistant IA</a></li>
${aRelancer.rows.length>0?'<li>Relancer '+aRelancer.rows.length+' candidature(s) sans réponse</li>':''}
<li>Mettre à jour le statut de tes candidatures</li>
</ul>
</div>
<div style="background:#1e3a5f;color:rgba(255,255,255,0.7);padding:12px;text-align:center;font-size:12px">JobAssistant IA — jobassistant.monairbyte.eu</div>
</div></body></html>`;

    await transporter.sendMail({
      from:'JobAssistant IA <mmohamedassalia6@gmail.com>',
      to:'mmohamedassalia6@gmail.com',
      subject:`📋 Agenda du ${new Date().toLocaleDateString('fr-FR')} — ${stats.rows[0].nouvelles} nouvelles offres`,
      html
    });

    res.json({sent:true, topOffres:topOffres.rows.length, aRelancer:aRelancer.rows.length});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── EXPORT EXCEL CANDIDATURES ─────────────────────────────────────────────────
app.get('/api/candidatures/export', async (req, res) => {
  try {
    const r = await pool.query('SELECT title, company, url, statut, date_postulation, notes FROM ja_candidatures ORDER BY date_postulation DESC');
    const rows = [['Titre', 'Entreprise', 'URL', 'Statut', 'Date postulation', 'Notes']];
    r.rows.forEach(c => rows.push([c.title, c.company||'', c.url||'', c.statut||'', c.date_postulation?new Date(c.date_postulation).toLocaleDateString('fr-FR'):'', c.notes||'']));
    
    let csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n');
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=candidatures.csv');
    res.send('\ufeff' + csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SIMULATEUR ENTRETIEN ──────────────────────────────────────────────────────
app.post('/api/jobs/:id/simuler-entretien', async (req, res) => {
  try {
    const { reponse, question, historique } = req.body;
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1',[req.params.id])).rows[0];
    
    const systemPrompt = `Tu es un recruteur senior qui conduit un entretien pour le poste "${job?.title}" chez ${job?.company||'cette entreprise'}. Le candidat est Mohamed Assalia Maiga, PO Data & IA, 9 ans exp, PSPO I PSM I. Pose des questions pertinentes, évalue les réponses et donne un feedback constructif. Sois professionnel mais bienveillant. Après chaque réponse, donne un score /10 et une question suivante.`;
    
    const messages = historique || [];
    if(reponse) messages.push({role:'user', content: reponse});
    else messages.push({role:'user', content: 'Bonjour, je suis prêt pour l\'entretien.'});

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,system:systemPrompt,messages});
    const result = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',()=>resolve('Erreur'));r.write(body);r.end();
    });

    messages.push({role:'assistant', content: result});
    res.json({ response: result, historique: messages });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CANDIDATURE MANUELLE ──────────────────────────────────────────────────────
app.post('/api/candidatures/manuelle', async (req, res) => {
  try {
    const { title, company, url, contact_rh, contact_linkedin, contact_email, notes, source_candidature, motivation_score } = req.body;
    const r = await pool.query(
      'INSERT INTO ja_candidatures (title,company,url,statut,date_postulation,contact_rh,contact_linkedin,contact_email,notes,source_candidature,motivation_score) VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8,$9,$10) RETURNING *',
      [title,company,url||'','postule',contact_rh||'',contact_linkedin||'',contact_email||'',notes||'',source_candidature||'Manuel',motivation_score||0]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── FICHE ENTREPRISE ──────────────────────────────────────────────────────────
app.get('/api/entreprise/:nom', async (req, res) => {
  try {
    const nom = decodeURIComponent(req.params.nom);
    const offres = await pool.query('SELECT title, ia_score, location, contract_type FROM ja_jobs WHERE company ILIKE $1 ORDER BY ia_score DESC LIMIT 5', ['%'+nom+'%']);
    
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const prompt = `En 150 mots max, donne une fiche synthétique sur l'entreprise "${nom}" en France: secteur d'activité, taille approximative, culture d'entreprise connue, points positifs et négatifs comme employeur, actualités récentes si connues. Format: bullet points courts. Si tu ne connais pas l'entreprise, dis-le clairement.`;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,messages:[{role:'user',content:prompt}]});
    const fiche = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',()=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ nom, fiche, offres: offres.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── REPONSES STAR ─────────────────────────────────────────────────────────────
app.post('/api/jobs/:id/reponses-star', async (req, res) => {
  try {
    const job = (await pool.query('SELECT * FROM ja_jobs WHERE id=$1',[req.params.id])).rows[0];
    const prompt = `Génère 3 réponses STAR (Situation, Tâche, Action, Résultat) pour Mohamed Assalia Maiga qui postule pour "${job?.title}" chez ${job?.company||'?'}. Basé sur son expérience réelle: Free Mobile (IT Product Manager, roadmap analytique QoS/QoE, 50 KPI réseau, ETL/Power BI/Superset, -40% délai incidents), projet association (RAG/pgvector/LangChain, 150 résidents, 5 modules). Chaque réponse STAR doit être concrète, chiffrée et directement liée aux compétences du poste. Format: **Question probable:** ... puis S/T/A/R.`;
    
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:800,messages:[{role:'user',content:prompt}]});
    const reponses = await new Promise((resolve) => {
      const https = require('https');
      const r = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text)}catch(e){resolve('Erreur')}})});
      r.on('error',()=>resolve('Erreur'));r.write(body);r.end();
    });
    res.json({ reponses });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── BLACKLIST ENTREPRISES ─────────────────────────────────────────────────────
app.post('/api/blacklist', async (req, res) => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS ja_blacklist (id SERIAL PRIMARY KEY, company VARCHAR(255) UNIQUE, raison TEXT, created_at TIMESTAMP DEFAULT NOW())');
    const { company, raison } = req.body;
    const r = await pool.query('INSERT INTO ja_blacklist (company,raison) VALUES ($1,$2) ON CONFLICT (company) DO UPDATE SET raison=$2 RETURNING *',[company,raison||'']);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/blacklist', async (req, res) => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS ja_blacklist (id SERIAL PRIMARY KEY, company VARCHAR(255) UNIQUE, raison TEXT, created_at TIMESTAMP DEFAULT NOW())');
    const r = await pool.query('SELECT * FROM ja_blacklist ORDER BY created_at DESC');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/blacklist/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ja_blacklist WHERE id=$1',[req.params.id]);
    res.json({success:true});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCORE MOTIVATION ──────────────────────────────────────────────────────────
app.patch('/api/jobs/:id/motivation', async (req, res) => {
  try {
    const { score } = req.body;
    await pool.query('UPDATE ja_jobs SET tags = array_append(array_remove(tags,$1),$2) WHERE id=$3',
      ['motivation_'+0,'motivation_'+score,req.params.id]);
    res.json({success:true, score});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ALERTE INSTANTANEE (verif toutes les heures) ──────────────────────────────
app.post('/api/alertes/check-instant', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({service:'gmail',auth:{user:'mmohamedassalia6@gmail.com',pass:process.env.GMAIL_PASS||''}});
    const result = await pool.query(`SELECT title,company,ia_score,url FROM ja_jobs WHERE ia_score>=85 AND created_at>NOW()-INTERVAL '1 hour' ORDER BY ia_score DESC LIMIT 5`);
    if(result.rows.length===0) return res.json({sent:false});
    const html = `<h2>🚨 ${result.rows.length} offre(s) 85%+ detectee(s) !</h2>${result.rows.map(j=>`<p><strong>${j.title}</strong> — ${j.company||'?'} — ${j.ia_score}% <a href="${j.url||'#'}">Voir</a></p>`).join('')}`;
    await transporter.sendMail({from:'JobAssistant IA <mmohamedassalia6@gmail.com>',to:'mmohamedassalia6@gmail.com',subject:`🚨 Offre ${result.rows[0].ia_score}%+ : ${result.rows[0].title}`,html});
    res.json({sent:true,count:result.rows.length});
  } catch(e) { res.status(500).json({error:e.message}); }
});

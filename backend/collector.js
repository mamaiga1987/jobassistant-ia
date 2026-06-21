const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: '172.20.0.6', port: 5432,
  database: 'superset', user: 'superset', password: 'superset123'
});

const ADZUNA_ID = '50599aba';
const ADZUNA_KEY = '1bbedf209f3d69d48761074701c62a07';
const FT_CLIENT_ID = 'PAR_jobassistantia_f68a7f33ad46eaddfb1c2a825cec0137046951bd0005c7011515cce57421dd89';
const FT_CLIENT_SECRET = '9089ff106e4565a5eae1a1a1ba03f1b1dc7fd527a856fd1022955fb60ec2a4ca';

const KEYWORDS = ['SQL','Python','Power BI','Apache Superset','PostgreSQL','Docker','n8n','OpenAI','RAG','pgvector','LangChain','ETL','ELT','Power Automate','Git','Node.js','React','QoS','QoE','ClickHouse','JavaScript','TypeScript','Agile','Scrum','Analytics','Data','BI','Pipeline','Dashboard','Product Owner','MOA','AMOA','Roadmap','Backlog','Sprint','User Stories','KPI','Tableau','Airflow','dbt','Azure','AWS','API REST','DAX'];

function extractTags(text) {
  return KEYWORDS.filter(k => text && text.toLowerCase().includes(k.toLowerCase())).slice(0, 8);
}

function calcScore(title, description, tags) {
  const titleL = (title||'').toLowerCase();
  const descL = (description||'').toLowerCase();
  const tagStr = (tags||[]).join(' ').toLowerCase();
  const full = titleL + ' ' + descL + ' ' + tagStr;
  let score = 0;

  // Titre (50pts)
  const metiers = ['product owner','moa','data product','analytics engineer','chef de projet','business analyst','scrum master','it product manager','data engineer','amoa'];
  metiers.forEach(m => { if(titleL.includes(m)) score += 15; });
  if(titleL.includes('product owner')&&(titleL.includes('data')||titleL.includes('ia'))) score += 10;
  if(titleL.includes('moa')&&(titleL.includes('data')||titleL.includes('si')||titleL.includes('it'))) score += 10;
  if(titleL.includes('chef de projet')&&(titleL.includes('data')||titleL.includes('moa')||titleL.includes('bi'))) score += 8;
  score = Math.min(score, 50);

  // Tags/Description (35pts)
  const comps = ['sql','python','power bi','superset','postgresql','docker','n8n','rag','langchain','etl','agile','scrum','analytics','data','bi','pipeline','dashboard','node.js','react','git','api','kpi','roadmap','backlog'];
  let hits = 0;
  comps.forEach(c => { if(full.includes(c)) hits++; });
  score += Math.min(hits * 2, 35);

  // Localisation (10pts)
  if(full.includes('paris')||full.includes('ile-de-france')||full.includes('hauts-de-seine')||full.includes('92)')||full.includes('91)')||full.includes('75)')||full.includes('75 -')||full.includes('92 -')) score += 10;
  else if(full.includes('france')||full.includes('remote')||full.includes('télétravail')) score += 5;

  // Séniorité (5pts)
  if(full.includes('senior')||full.includes('confirmé')||full.includes('expérimenté')) score += 5;
  else if(!full.includes('junior')&&!full.includes('débutant')) score += 3;

  // Pénalités
  if(titleL.includes('alternance')||titleL.includes('stage')||titleL.includes('apprenti')) return Math.min(score, 20);
  if(titleL.includes('junior')||titleL.includes('débutant')) score -= 20;
  if((titleL.includes('développeur')||titleL.includes('fullstack'))&&!titleL.includes('product')&&!titleL.includes('data')) return Math.min(score, 25);
  if(titleL.includes('windev')||titleL.includes('cobol')||titleL.includes('mainframe')) return Math.min(score, 10);
  if(titleL.includes('comptable')&&!titleL.includes('analyste')&&!titleL.includes('data')) return Math.min(score, 15);

  return Math.min(Math.max(Math.round(score), 1), 99);
}

async function saveJob(source, title, company, location, contract, published, url, desc, tags) {
  const score = calcScore(title, desc, tags);
  if (!url) return false;
  const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1', [url]);
  if (exists.rows.length > 0) return false;
  await pool.query(
    'INSERT INTO ja_jobs (source,title,company,location,contract_type,published_at,url,description,tags,ia_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [source, title, company, location, contract, published, url, (desc||'').slice(0,800), tags, score]
  );
  return true;
}

// ── ADZUNA ────────────────────────────────────────────────────────────────────
async function collectAdzuna() {
  console.log('📊 Collecte Adzuna...');
  const queries = ['Product Owner Data','Chef de Projet MOA Data','Data Product Manager','IT Product Manager','Analytics Engineer','Business Analyst Data','Scrum Master Data','Data Engineer SQL Python','MOA SI transformation','Chef de projet BI'];
  let total = 0;
  for (const q of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=10&what=${encodeURIComponent(q)}&where=Ile-de-France&sort_by=date`;
      const data = await new Promise((resolve, reject) => {
        https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({results:[]})} }); }).on('error',()=>resolve({results:[]}));
      });
      for (const job of (data.results||[])) {
        const tags = extractTags((job.title||'')+' '+(job.description||''));
        const saved = await saveJob('Adzuna', job.title||'', job.company?.display_name||'', job.location?.display_name||'', 'CDI', job.created?new Date(job.created):new Date(), job.redirect_url||'', job.description||'', tags);
        if (saved) total++;
      }
      await new Promise(r=>setTimeout(r,1000));
    } catch(e) { console.error(`❌ Adzuna ${q}:`, e.message); }
  }
  console.log(`✅ Adzuna: ${total} nouvelles offres`);
  return total;
}

// ── FRANCE TRAVAIL ────────────────────────────────────────────────────────────
async function getFTToken() {
  return new Promise((resolve, reject) => {
    const body = `grant_type=client_credentials&client_id=${FT_CLIENT_ID}&client_secret=${FT_CLIENT_SECRET}&scope=api_offresdemploiv2%20o2dsoffre`;
    const req = https.request({
      hostname:'entreprise.francetravail.fr',
      path:'/connexion/oauth2/access_token?realm=%2Fpartenaire',
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)}
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d).access_token)}catch(e){reject(e)} }); });
    req.on('error',reject); req.write(body); req.end();
  });
}

async function collectFranceTravail() {
  console.log('🇫🇷 Collecte France Travail...');
  const token = await getFTToken();
  if (!token) { console.error('❌ Token FT invalide'); return 0; }

  const queries = [
    {q:'Product Owner Data', dept:'75'},{q:'Product Owner Data', dept:'92'},{q:'Product Owner Data', dept:'91'},
    {q:'Chef de projet MOA Data', dept:'75'},{q:'Chef de projet MOA Data', dept:'92'},{q:'Chef de projet MOA Data', dept:'93'},
    {q:'Data Product Manager', dept:'75'},{q:'Data Product Manager', dept:'92'},
    {q:'IT Product Manager', dept:'75'},{q:'Analytics Engineer', dept:'75'},
    {q:'Business Analyst Data', dept:'75'},{q:'Business Analyst Data', dept:'92'},
    {q:'MOA SI transformation', dept:'75'},{q:'MOA SI transformation', dept:'92'},
    {q:'Scrum Master Data', dept:'75'},{q:'Chef de projet BI', dept:'75'},
    {q:'Data Engineer Python SQL', dept:'75'},{q:'AMOA Data', dept:'75'},
    {q:'Product Manager IA', dept:'75'},{q:'Chef de projet AMOA', dept:'75'},
    {q:'Data Analyst Senior', dept:'75'},{q:'Data Analyst Senior', dept:'92'},
  ];

  let total = 0;
  for (const {q, dept} of queries) {
    try {
      console.log(`  🔍 FT: ${q} (${dept})`);
      const data = await new Promise((resolve, reject) => {
        const path = `/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(q)}&departement=${dept}&range=0-14&sort=1`;
        https.get({ hostname:'api.francetravail.io', path, headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'} },
          r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({resultats:[]})} }); }
        ).on('error',()=>resolve({resultats:[]}));
      });

      for (const job of (data.resultats||[])) {
        const url = `https://candidat.francetravail.fr/offres/recherche/detail/${job.id}`;
        const ftTags = (job.competences||[]).map(c=>c.libelle).slice(0,5);
        const tags = ftTags.length>0 ? ftTags : extractTags((job.appellationlibelle||job.intitule||'')+' '+(job.description||''));
        const saved = await saveJob('France Travail', job.appellationlibelle||job.intitule||'', job.entreprise?.nom||'', job.lieuTravail?.libelle||'', job.typeContrat||'CDI', job.dateCreation?new Date(job.dateCreation):new Date(), url, job.description||'', tags);
        if (saved) total++;
      }
      await new Promise(r=>setTimeout(r,500));
    } catch(e) { console.error(`❌ FT ${q}:`, e.message); }
  }
  console.log(`✅ France Travail: ${total} nouvelles offres`);
  return total;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Démarrage collecte multi-sources...');
  try {
    const [adzuna, ft] = await Promise.all([collectAdzuna(), collectFranceTravail()]);
    console.log(`\n📊 TOTAL: ${adzuna + ft} nouvelles offres (Adzuna: ${adzuna} | France Travail: ${ft})`);
  } catch(e) {
    console.error('Erreur:', e.message);
  } finally {
    await pool.end();
    console.log('✅ Collecte terminée');
  }
}

main();
// Ajout requêtes supplémentaires FT déjà dans le fichier

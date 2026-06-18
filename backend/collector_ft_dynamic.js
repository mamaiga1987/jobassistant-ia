const axios = require('axios');
const https = require('https');
const { Pool } = require('pg');

const FT_CLIENT_ID = 'PAR_jobassistantia_f68a7f33ad46eaddfb1c2a825cec0137046951bd0005c7011515cce57421dd89';
const FT_CLIENT_SECRET = '9089ff106e4565a5eae1a1a1ba03f1b1dc7fd527a856fd1022955fb60ec2a4ca';

const pool = new Pool({
  host: process.env.DB_HOST || 'superset-db',
  port: 5432,
  database: process.env.DB_NAME || 'jobassistant',
  user: process.env.DB_USER || 'jobassistant',
  password: process.env.DB_PASSWORD || 'jobassistant2026',
});

const DEPTS_IDF = ['75','77','78','91','92','93','94','95'];

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


function calcScore(title, description, tags) {
  const full = (title+' '+description+' '+(tags||[]).join(' ')).toLowerCase();
  let score = 0;
  const metiers = ['product owner','moa','amoa','data engineer','analytics engineer','data analyst','business analyst','ai engineer','data product manager','it product manager'];
  metiers.forEach(m => { if(full.includes(m)) score += 12; });
  const rares = ['rag','pgvector','langchain','superset','llamaindex','mlops','openai'];
  rares.forEach(c => { if(full.includes(c)) score += 5; });
  const std = ['sql','python','power bi','agile','scrum','docker','git','etl','api','bi','data'];
  std.forEach(c => { if(full.includes(c)) score += 2; });
  if(full.includes('paris')||full.includes('ile-de-france')||full.match(/9[12345] /)) score += 10;
  if(full.match(/4[89]\s*000|5\d\s*000|6[0-5]\s*000/)) score += 7;
  if(full.includes('senior')||full.includes('confirmé')) score += 5;
  return Math.min(score, 99);
}

async function collectForQuery(token, query, dept) {
  try {
    const r = await axios.get('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { motsCles: query, departement: dept, range: '0-49', typeContrat: 'CDI,CDD,MIS', niveauFormation: '6,7' }
    });
    return r.data.resultats || [];
  } catch(e) { return []; }
}

async function main() {
  console.log('🚀 Collecte dynamique France Travail...');
  
  // Récupérer métiers actifs depuis DB
  const metiersResult = await pool.query('SELECT metier, requetes FROM ja_metiers_cibles WHERE actif=true');
  const requetes = [];
  metiersResult.rows.forEach(m => {
    (m.requetes||[m.metier]).forEach(r => requetes.push(r));
  });
  
  console.log(`📋 ${requetes.length} requêtes pour ${metiersResult.rows.length} métiers`);
  
  const token = await getFTToken();
  console.log('✅ Token OK');
  
  let total = 0;
  
  for(const query of requetes) {
    for(const dept of DEPTS_IDF) {
      const offres = await collectForQuery(token, query, dept);
      for(const offre of offres) {
        try {
          const tags = [];
          const full = (offre.intitule+' '+(offre.description||'')).toLowerCase();
          ['SQL','Python','Power BI','RAG','Docker','Git','Agile','Scrum','ETL','API','BI','Data','MOA','AMOA','Product Owner','Analytics','Pipeline','KPI','Roadmap','Backlog','Dashboard'].forEach(t => {
            if(full.includes(t.toLowerCase())) tags.push(t);
          });
          
          const score = calcScore(offre.intitule, offre.description||'', tags);
          
          const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1', [offre.origineOffre?.urlOrigine||offre.id]);
          if(exists.rows.length === 0) {
            await pool.query(
              'INSERT INTO ja_jobs (source,title,company,location,contract_type,published_at,url,description,tags,ia_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
              ['France Travail', offre.intitule, offre.entreprise?.nom||'', 
               (dept)+' - '+(offre.lieuTravail?.libelle||''), 
               offre.typeContrat||'CDI', new Date(offre.dateCreation||Date.now()),
               offre.origineOffre?.urlOrigine||('https://candidat.francetravail.fr/offres/recherche/detail/'+offre.id),
               (offre.description||'').slice(0,3000), tags, score]
            );
            total++;
          }
        } catch(e) {}
      }
      await new Promise(r=>setTimeout(r,200));
    }
    process.stdout.write('.');
  }
  
  console.log(`\n✅ TOTAL: ${total} nouvelles offres collectées`);
  await pool.end();
}

main().catch(console.error);

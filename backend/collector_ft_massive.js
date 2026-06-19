const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: '172.20.0.7', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const FT_CLIENT_ID = 'PAR_jobassistantia_e4067ff9061b93885dbf20a4781ce86b657007da21cd91505f7bbdd0d7a66bc1';
const FT_CLIENT_SECRET = 'a5797d080b488116429d967bb4ccb57e652921c2491cab16d0d9c22c9a4cb4df';
const DEPTS = ['75','92','93','94','91','78','95'];

const QUERIES = [
  'Product Owner Data','Product Owner IA','Product Owner Digital',
  'Chef de projet MOA','Chef de projet AMOA','Chef de projet Data',
  'Chef de projet SI Data','Chef de projet BI','Chef de projet transformation',
  'Data Product Manager','IT Product Manager','Product Manager Data',
  'Analytics Engineer','Data Analyst Senior','Data Engineer Senior',
  'Business Analyst Data','Business Analyst Senior','AMOA Data',
  'Scrum Master Data','Agile Coach Data','MOA Data',
  'Responsable produit Data','Manager Data','Lead Data',
  'Consultant Data','Consultant MOA','Consultant AMOA',
  'Chef de projet IA','Product Owner BI','Data Steward',
  'Data Engineer Python','Data Engineer SQL','Data Engineer BI',
  'Analytics Engineer SQL','Analytics Engineer Python',
  'AI Engineer','IA Engineer','Ingenieur IA',
  'RAG Engineer','LLM Engineer','Machine Learning Engineer',
  'Data Scientist Senior','Lead Data Engineer','Lead Analytics',
  'Architecte Data','Architecte SI Data','Data Architect',
  'Product Builder','Growth Product Manager',
  'Head of Data','Chief Data Officer',
  'Freelance Data Engineer','Mission Data Engineer',
  'Consultant BI','Consultant Analytics','Consultant Data Engineer',
];

const KEYWORDS = ['SQL','Python','Power BI','Apache Superset','PostgreSQL','Docker','n8n','RAG','ETL','Agile','Scrum','Analytics','Data','BI','Pipeline','Dashboard','Product Owner','MOA','AMOA','Roadmap','Backlog','KPI','API','Git'];

function extractTags(text) {
  return KEYWORDS.filter(k => text && text.toLowerCase().includes(k.toLowerCase())).slice(0, 8);
}

function calcScore(title, description, tags) {
  const titleL = (title||'').toLowerCase();
  const descL = (description||'').toLowerCase();
  const tagStr = (tags||[]).join(' ').toLowerCase();
  const full = titleL + ' ' + descL + ' ' + tagStr;
  let score = 0;

  const metiers = ['product owner','moa','amoa','data product','analytics engineer','chef de projet','business analyst','scrum master','it product manager','data engineer','data analyst','responsable produit'];
  metiers.forEach(m => { if(titleL.includes(m)) score += 15; });
  if(titleL.includes('product owner')) score += 10;
  if(titleL.includes('moa')||titleL.includes('amoa')||titleL.includes('maîtrise d')||titleL.includes('maitrise d')) score += 10;
  if(titleL.includes('chef de projet')&&(titleL.includes('data')||titleL.includes('moa')||titleL.includes('bi')||titleL.includes('si')||titleL.includes('ia'))) score += 8;
  if(titleL.includes('senior')||titleL.includes('confirmé')) score += 5;
  score = Math.min(score, 50);

  const comps = ['sql','python','power bi','superset','agile','scrum','analytics','data','bi','pipeline','dashboard','etl','api','kpi','roadmap','backlog','product owner','moa'];
  let hits = 0;
  comps.forEach(c => { if(full.includes(c)) hits++; });
  score += Math.min(hits * 2, 35);

  if(full.includes('paris')||full.includes('75 -')||full.includes('92 -')||full.includes('91 -')||full.includes('93 -')||full.includes('94 -')||full.includes('ile-de-france')) score += 10;
  else if(full.includes('france')||full.includes('remote')||full.includes('télétravail')) score += 5;

  if(titleL.includes('alternance')||titleL.includes('stage')||titleL.includes('apprenti')) return Math.min(score, 15);
  if(titleL.includes('junior')||titleL.includes('débutant')) score -= 20;
  if((titleL.includes('développeur')||titleL.includes('fullstack'))&&!titleL.includes('product')&&!titleL.includes('data')) return Math.min(score, 20);

  return Math.min(Math.max(Math.round(score), 1), 99);
}

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

async function main() {
  console.log('🚀 Collecte massive France Travail IDF...');
  const token = await getFTToken();
  console.log('✅ Token OK');
  let total = 0; let errors = 0;

  for (const q of QUERIES) {
    for (const dept of DEPTS) {
      try {
        const path = `/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(q)}&departement=${dept}&range=0-14&sort=1`;
        const data = await new Promise((resolve) => {
          https.get({ hostname:'api.francetravail.io', path, headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'} },
            r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({resultats:[]})} }); }
          ).on('error',()=>resolve({resultats:[]}));
        });

        for (const job of (data.resultats||[])) {
          const url = `https://candidat.francetravail.fr/offres/recherche/detail/${job.id}`;
          const title = job.appellationlibelle||job.intitule||'';
          const company = job.entreprise?.nom||'';
          const location = job.lieuTravail?.libelle||'';
          const desc = job.description||'';
          const contract = job.typeContrat||'CDI';
          const published = job.dateCreation?new Date(job.dateCreation):new Date();
          const ftTags = (job.competences||[]).map(c=>c.libelle).slice(0,5);
          const tags = ftTags.length>0 ? ftTags : extractTags(title+' '+desc);
          const score = calcScore(title, desc, tags);

          const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1',[url]);
          if (exists.rows.length>0) continue;

          await pool.query(
            'INSERT INTO ja_jobs (source,title,company,location,contract_type,published_at,url,description,tags,ia_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            ['France Travail',title,company,location,contract,published,url,desc.slice(0,3000),tags,score]
          );
          total++;
        }
        await new Promise(r=>setTimeout(r,300));
      } catch(e) { errors++; }
    }
    process.stdout.write(`\r📊 ${q}: ${total} offres insérées...`);
  }

  console.log(`\n✅ TOTAL: ${total} nouvelles offres France Travail (${errors} erreurs)`);
  await pool.end();
}

main();

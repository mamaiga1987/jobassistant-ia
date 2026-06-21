const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: '172.20.0.6', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const KEYWORDS = ['SQL','Python','Power BI','Apache Superset','PostgreSQL','Docker','n8n','RAG','ETL','Agile','Scrum','Analytics','Data','BI','Pipeline','Dashboard','Product Owner','MOA','AMOA','Roadmap','Backlog','KPI','API','Git'];

function extractTags(text) {
  return KEYWORDS.filter(k => text && text.toLowerCase().includes(k.toLowerCase())).slice(0, 8);
}

function calcScore(title, desc) {
  const text = (title + ' ' + (desc||'')).toLowerCase();
  let score = 30;
  ['product owner','moa','amoa','data product','analytics','chef de projet','business analyst','scrum master','it product manager'].forEach(m => { if(text.includes(m)) score += 12; });
  ['sql','python','power bi','agile','scrum','data','bi','etl','api','kpi','roadmap','backlog'].forEach(c => { if(text.includes(c)) score += 3; });
  if(text.includes('paris')||text.includes('92)')||text.includes('91)')||text.includes('92 -')||text.includes('75 -')) score += 8;
  if(text.includes('senior')||text.includes('confirmé')) score += 5;
  if(text.includes('junior')||text.includes('alternance')||text.includes('stage')) score -= 30;
  return Math.min(Math.max(score, 1), 99);
}

// Offres Indeed récupérées manuellement depuis la recherche
const INDEED_JOBS = [
  { title: 'Product Owner Data & IA H/F', company: 'Danem People France', location: 'Paris (75)', url: 'https://fr.indeed.com/q-product-owner-data-ia-l-paris-emplois.html', desc: 'Recueillir et analyser les besoins à travers des ateliers fonctionnels. Product Owner Data & IA. SQL, Python, Agile, Scrum, Data, BI, Roadmap, Backlog.' },
  { title: 'Product Owner Data & IA Senior H/F', company: 'ALTEN', location: 'Boulogne-Billancourt (92)', url: 'https://fr.indeed.com/cmp/Alten/jobs', desc: 'Connaissance des principes fondamentaux du data engineering. Maîtrise des principes du Product Management appliqués à la data. SQL, Python, Power BI, Agile, Scrum.' },
  { title: 'CDI - Product Owner Data Retail H/F', company: 'Hermès Paris', location: 'Pantin (93)', url: 'https://fr.indeed.com/cmp/Hermes/jobs', desc: 'Master 2 Bac+5 en ingénierie, informatique, management, data management. Travailler étroitement avec les équipes de développement, architectes. Data, Product Owner, Analytics, Pipeline.' },
  { title: 'CDI - Product Owner Data Finance H/F', company: 'Hermès Paris', location: 'Pantin (93)', url: 'https://fr.indeed.com/cmp/Hermes/jobs', desc: 'Product Owner Data Finance. Pilotage roadmap produit data. SQL, Python, Power BI, Agile, Scrum, KPI, Dashboard, Data.' },
  { title: 'PO DATA F/H', company: 'ASTRELYA', location: 'Paris (75)', url: 'https://fr.indeed.com/q-po-data-l-paris-emplois.html', desc: 'En tant que PO Data, vous piloterez des projets de transformation sur des produits Data et IA dans des contextes Marketing, CRM, KYC. Data, Product Owner, BI, Analytics, Roadmap, Backlog, Agile.' },
  { title: 'Product Owner Data RH H/F', company: 'NEXTON', location: 'Paris (75)', url: 'https://fr.indeed.com/q-product-owner-data-rh-l-paris-emplois.html', desc: 'CDI direct chez un acteur tech en croissance, basé à Paris centre SaaS. Product Owner Data RH. SQL, Python, Agile, Scrum, Backlog, User Stories, KPI.' },
  { title: 'Data Product Owner / Chef de Projet Data & IA', company: 'OPUS NUMERIS', location: 'Paris (75)', url: 'https://fr.indeed.com/cmp/Opus-Numeris/jobs', desc: 'Projets de transformation menés par Opus. Data Product Owner Chef de Projet Data IA. SQL, Python, Power BI, Agile, Scrum, Pipeline, Dashboard, Analytics.' },
  { title: 'Product Owner / Proxy Product Owner CDI H/F', company: 'Collective.work', location: 'Levallois-Perret (92)', url: 'https://fr.indeed.com/cmp/Collective.work/jobs', desc: 'Chef de Projet Product Owner technico-fonctionnel. Digital Factory. Agile, Scrum, Backlog, Sprint, User Stories, KPI, Roadmap, Product Owner.' },
  { title: 'Proxy Product Owner Senior Banque H/F', company: 'Collective.work', location: 'Paris (75)', url: 'https://fr.indeed.com/cmp/Collective.work/jobs_banque', desc: 'Proxy Product Owner Senior Banque Parcours Cartes Commerciales. Finance DSI. Agile, Scrum, SQL, Data, Product Owner, Backlog, Sprint.' },
  { title: 'Product Owner technique web Confirmé H/F', company: 'The One Studio', location: 'Paris (75)', url: 'https://fr.indeed.com/q-product-owner-web-l-paris-emplois.html', desc: 'CDI direct acteur tech croissance Paris centre SaaS. Product Owner web technique. API, Git, Agile, Scrum, Backlog, Roadmap, Dashboard, Analytics.' },
  { title: 'Product Owner IA', company: 'DATAMED RESEARCH', location: 'Paris (75)', url: 'https://fr.indeed.com/q-product-owner-ia-l-paris-emplois.html', desc: 'Suivre le développement des modèles IA ML NLP. Product Owner IA. Kanban Scrum. Python, SQL, Data, Analytics, BI, API, Git, Agile, Scrum, Roadmap.' },
  { title: 'Learning Management System Product Owner H/F', company: 'Geodis', location: 'Levallois-Perret (92)', url: 'https://fr.indeed.com/cmp/Geodis/jobs', desc: 'Implement and coordinate reports and dashboards for mandatory trainings. Product Owner LMS. Dashboard, KPI, Agile, Scrum, SQL, Data, Analytics.' },
  { title: 'Chef de projet MOA Data & IA', company: 'Mindset', location: 'Boulogne-Billancourt (92)', url: 'https://fr.indeed.com/q-chef-projet-moa-data-ia-l-paris-emplois.html', desc: 'Chef de projet MOA Data IA transformation SI. MOA, AMOA, SQL, Python, Power BI, Agile, Scrum, Roadmap, Backlog, KPI, Dashboard.' },
  { title: 'Product Owner Data & IA', company: 'SWOOD', location: 'Paris (75)', url: 'https://fr.indeed.com/q-product-owner-data-ia-l-paris-emplois.html', desc: 'Piloter de manière autonome des projets ou chantiers délégués. Réaliser la recette fonctionnelle et les tests. Suivre les KPIs produit. Product Owner, Data, IA, Agile, Scrum, KPI, Dashboard.' },
  { title: 'Product Owner Chaîne logistique', company: 'OCTOGONE', location: 'Massy (91)', url: 'https://fr.indeed.com/cmp/Octogone/jobs', desc: 'Formation supérieure école ingénieur université. Product Owner Chaîne logistique. SQL, Data, Analytics, Agile, Scrum, Backlog, Roadmap, KPI.' },
];

async function collectIndeed() {
  console.log('💼 Insertion offres Indeed...');
  let total = 0;

  for (const job of INDEED_JOBS) {
    try {
      const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1', [job.url]);
      if (exists.rows.length > 0) continue;

      const tags = extractTags(job.title + ' ' + job.desc);
      const score = calcScore(job.title, job.desc);

      await pool.query(
        'INSERT INTO ja_jobs (source,title,company,location,contract_type,published_at,url,description,tags,ia_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        ['Indeed', job.title, job.company, job.location, 'CDI', new Date(), job.url, job.desc, tags, score]
      );
      total++;
      console.log(`✅ ${job.title} - ${job.company} (${score}%)`);
    } catch(e) { console.error(`❌ ${job.title}:`, e.message); }
  }

  console.log(`\n📊 ${total} offres Indeed insérées`);
  await pool.end();
}

collectIndeed();

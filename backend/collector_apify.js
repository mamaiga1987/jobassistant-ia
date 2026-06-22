const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: 'superset-db', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const ACTOR_ID = 'openclawai~job-board-scraper';

const METIERS = [
  'Product Owner', 'Data Product Manager', 'IT Product Manager',
  'MOA AMOA chef de projet', 'Analytics Engineer', 'Data Engineer',
  'Business Analyst', 'Chef de projet Data', 'Data Manager',
  'Data Scientist', 'Développeur IA', 'AI Engineer'
];

function callApify(input) {
  return new Promise((resolve) => {
    const body = JSON.stringify(input);
    const path = `/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`;
    const options = {
      hostname: 'api.apify.com', path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve([]); } });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(130000, () => { req.destroy(); resolve([]); });
    req.write(body); req.end();
  });
}

async function insertJob(job) {
  const url = job.job_url || job.url || '';
  const title = job.title || '';
  if (!title || !url) return false;
  try {
    const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1', [url]);
    if (exists.rows.length > 0) return false;
    await pool.query(
      `INSERT INTO ja_jobs (title, company, location, description, url, source, contract_type, published_at, tags, ia_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0)`,
      [
        title,
        job.company || '',
        job.location || 'Île-de-France',
        job.description || job.job_description || '',
        url,
        job.site || job.source || 'Apify',
        job.job_type || job.jobType || 'CDI',
        job.date_posted ? new Date(job.date_posted) : new Date(),
        job.skills && job.skills.length > 0 ? job.skills : []
      ]
    );
    return true;
  } catch(e) { return false; }
}

async function main() {
  console.log(`Collecte Apify démarrée — ${METIERS.length} métiers`);
  let totalNew = 0;

  for (const metier of METIERS) {
    try {
      console.log(`  Métier: ${metier}...`);
      const input = {
        searchTerm: metier,
        location: 'Île-de-France, France',
        maxResults: 25,
        site: ['linkedin', 'indeed'],
        country: 'france',
        hoursOld: 72
      };

      const items = await callApify(input);
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`    -> 0 offres ou erreur:`, JSON.stringify(items).slice(0, 100));
        continue;
      }

      let newCount = 0;
      for (const item of items) {
        const inserted = await insertJob(item);
        if (inserted) newCount++;
      }
      totalNew += newCount;
      console.log(`    -> ${items.length} offres trouvées, ${newCount} nouvelles`);
      await new Promise(r => setTimeout(r, 3000));
    } catch(e) {
      console.log(`    -> Erreur: ${e.message}`);
    }
  }

  console.log(`\n✅ TOTAL Apify: ${totalNew} nouvelles offres collectées`);
  await pool.end();
}

main().catch(console.error);

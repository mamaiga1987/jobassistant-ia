const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: 'superset-db', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const ACTOR_ID = 'curious_coder~linkedin-jobs-scraper';

const METIERS = [
  'Product Owner', 'Data Product Manager', 'IT Product Manager',
  'MOA AMOA chef de projet', 'Analytics Engineer', 'Data Engineer',
  'Business Analyst', 'Chef de projet Data', 'Data Manager',
  'Data Scientist', 'Développeur IA', 'AI Engineer'
];

function callApify(urls, maxItems) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ urls, maxItems });
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

async function insertJob(item) {
  const url = item.applyUrl || item.link || '';
  const title = item.title || '';
  if (!title || !url) return false;
  try {
    const exists = await pool.query('SELECT id FROM ja_jobs WHERE url=$1', [url]);
    if (exists.rows.length > 0) return false;
    const description = item.descriptionText || item.descriptionHtml?.replace(/<[^>]*>/g,'') || '';
    const company = item.companyName || '';
    const location = item.location || 'Île-de-France';
    const publishedAt = item.postedAt ? new Date(item.postedAt) : new Date();
    await pool.query(
      `INSERT INTO ja_jobs (title, company, location, description, url, source, contract_type, published_at, tags, ia_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0)`,
      [title, company, location, description, url, 'LinkedIn',
       item.employmentType || 'CDI', publishedAt, []]
    );
    return true;
  } catch(e) { return false; }
}

async function main() {
  console.log(`Collecte Apify LinkedIn démarrée — ${METIERS.length} métiers`);
  let totalNew = 0;

  for (const metier of METIERS) {
    try {
      console.log(`  Métier: ${metier}...`);
      const keyword = encodeURIComponent(metier);
      const urls = [
        `https://www.linkedin.com/jobs/search/?keywords=${keyword}&location=Ile-de-France&f_TPR=r259200`
      ];
      const items = await callApify(urls, 25);
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`    -> 0 offres`);
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

  console.log(`\n✅ TOTAL Apify LinkedIn: ${totalNew} nouvelles offres collectées`);
  await pool.end();
}

main().catch(console.error);

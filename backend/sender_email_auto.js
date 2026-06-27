const { Pool } = require('pg');
const https = require('https');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const pool = new Pool({
  host: 'superset-db', port: 5432,
  database: 'jobassistant', user: 'jobassistant', password: 'jobassistant2026'
});

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_PASS = process.env.GMAIL_PASS;
const MON_EMAIL = 'mmohamedassalia6@gmail.com';

function callClaude(prompt, maxTokens) {
  return new Promise((resolve) => {
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTokens,messages:[{role:'user',content:prompt}]});
    const req = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text);}catch(e){resolve(null);}});});
    req.on('error',()=>resolve(null));
    req.write(body);req.end();
  });
}

async function genererPDF(cvData) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({margin:50, size:'A4'});
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const d = cvData;
    doc.fontSize(22).fillColor('#1e3a5f').text(d.nom||'Mohamed Assalia Maiga', {align:'center'});
    doc.fontSize(13).fillColor('#2d6a9f').text(d.titre_accroche||'', {align:'left'});
    doc.fontSize(10).fillColor('#64748b').text('Longjumeau (91) · +33 778 501 767 · mmohamedassalia6@gmail.com · Disponible immédiatement');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('PROFIL');
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f');
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(d.resume||'', {align:'justify'});
    doc.moveDown(0.5);
    if((d.certifications||[]).length > 0) {
      doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('CERTIFICATIONS');
      doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#333').font('Helvetica').text((d.certifications||[]).join(' · '), {align:'justify'});
      doc.moveDown(0.5);
    }
    if((d.competences_ordonnees||[]).length > 0) {
      doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('COMPÉTENCES TECHNIQUES');
      doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#333').font('Helvetica').text((d.competences_ordonnees||[]).join(', '), {align:'justify'});
      doc.moveDown(0.5);
    }
    doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('EXPÉRIENCES PROFESSIONNELLES');
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f');
    doc.moveDown(0.2);
    (d.experiences||[]).forEach(e => {
      doc.fontSize(10).fillColor('#1e3a5f').font('Helvetica-Bold').text((e.titre||'')+(e.entreprise?' — '+e.entreprise:''));
      doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(e.periode||'');
      doc.fontSize(10).fillColor('#333').font('Helvetica').text((e.description||'').replace(/[●%Ï]/g,'-').replace(/\uFFFD+/g,''), {align:'justify'});
      doc.moveDown(0.3);
    });
    if(d.formation) {
      doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('FORMATION');
      doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#333').font('Helvetica').text(d.formation, {align:'justify'});
    }
    doc.end();
  });
}

async function main() {
  console.log('=== Envoi automatique candidatures email ===');

  // Récupérer le CV réel
  const { execSync } = require('child_process');
  const profilRow = await pool.query('SELECT cv_path FROM ja_profil LIMIT 1');
  const cvPath = profilRow.rows[0]?.cv_path || '';
  let cvText = '';
  if(cvPath) {
    try { cvText = execSync(`pdftotext "${cvPath}" -`, {encoding:'utf8', timeout:15000}); } catch(e) {}
  }

  // Sélectionner offres avec email + score ≥60% + 7 derniers jours + jamais envoyées
  await pool.query(`CREATE TABLE IF NOT EXISTS ja_emails_envoyes (
    id SERIAL PRIMARY KEY, job_id INTEGER UNIQUE, email_contact VARCHAR(255),
    cv_optimise_id INTEGER, envoye_le TIMESTAMP DEFAULT NOW()
  )`);

  const offres = await pool.query(`
    SELECT j.* FROM ja_jobs j
    LEFT JOIN ja_emails_envoyes e ON e.job_id = j.id
    WHERE j.email_contact IS NOT NULL
    AND j.ia_score >= 60
    AND j.published_at >= NOW() - INTERVAL '7 days'
    AND e.id IS NULL
    AND j.email_contact NOT IN (
      SELECT email_contact FROM ja_emails_envoyes
      WHERE envoye_le >= NOW() - INTERVAL '7 days'
    )
    ORDER BY j.ia_score DESC
    LIMIT 5
  `);

  console.log(`${offres.rows.length} offres à traiter`);
  if(offres.rows.length === 0) { await pool.end(); return; }

  const envoyes = [];

  for(const job of offres.rows) {
    try {
      console.log(`  Traitement: ${job.title} → ${job.email_contact}`);

      // Générer CV optimisé
      const extractPrompt = `Liste de manière EXHAUSTIVE toutes les expériences du CV:\n${cvText.slice(0,12000)}\nRetourne UNIQUEMENT: {"experiences_brutes":[{"titre":"...","entreprise":"...","periode":"...","description_brute":"..."}]}`;
      const extractResult = await callClaude(extractPrompt, 3000);
      const experiencesBrutes = (JSON.parse((extractResult||'{}').replace(/```json|```/g,'').trim())).experiences_brutes || [];

      const cvPrompt = `Reecris ce CV pour l'offre "${job.title}" (${(job.description||'').slice(0,1000)}).
Experiences a reprendre (${experiencesBrutes.length} au total): ${JSON.stringify(experiencesBrutes)}
CV contexte: ${cvText.slice(0,6000)}
Retourne JSON: {"nom":"...","titre_accroche":"...","resume":"...","competences_ordonnees":[...],"experiences":[{"titre":"...","periode":"...","entreprise":"...","description":"..."}],"certifications":[...],"formation":"..."}
EXACTEMENT ${experiencesBrutes.length} experiences. UNIQUEMENT le JSON.`;
      const cvResult = await callClaude(cvPrompt, 4000);
      const cvData = JSON.parse((cvResult||'{}').replace(/```json|```/g,'').trim());

      // Sauvegarder CV
      const savedCv = await pool.query(
        'INSERT INTO ja_cv_optimises (job_id, data, status, offre_titre) VALUES ($1,$2,$3,$4) RETURNING id',
        [job.id, JSON.stringify(cvData), 'done', job.title]
      );
      const cvOptimiseId = savedCv.rows[0].id;

      // Générer lettre
      const today = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
      const lettrePrompt = `Redige une lettre de motivation professionnelle (250-300 mots, français) pour ${job.title} chez ${job.company||'?'}.
Candidat: ${cvData.nom}, ${cvData.titre_accroche}. Resume: ${cvData.resume}.
Offre: ${(job.description||'').slice(0,1500)}
REGLES IMPORTANTES:
- Ne pas mettre de date, ni d'en-tete, ni de coordonnees - juste le corps de la lettre
- Commencer directement par "Madame, Monsieur,"
- Terminer par "Cordialement," suivi du nom
- AUCUN markdown, AUCUN asterisque, AUCUN crochet
- Texte brut uniquement
Retourne UNIQUEMENT le texte de la lettre.`;
      const lettre = await callClaude(lettrePrompt, 800);

      // Générer PDF
      const pdfBuffer = await genererPDF(cvData);

      // Envoyer email
      const transporter = nodemailer.createTransport({service:'gmail',auth:{user:MON_EMAIL,pass:GMAIL_PASS}});
      // Nettoyer le Markdown
      const lettreClean = (lettre||'')
        .replace(/\*\*(.*?)\*\*/g, '$1')  // supprimer **gras**
        .replace(/\*(.*?)\*/g, '$1')        // supprimer *italique*
        .replace(/\[.*?\]/g, '')            // supprimer [coordonnées]
        .replace(/^Paris.*\d{4}\s*/m, '')   // supprimer date fictive
        .trim();
      const html = `<h2 style="color:#1e3a5f">Candidature — ${job.title}</h2>
<p style="white-space:pre-wrap;line-height:1.8;font-family:Arial,sans-serif;font-size:14px">${lettreClean}</p>
`; 

      await transporter.sendMail({
        from: `Mohamed Assalia Maiga <${MON_EMAIL}>`,
        to: job.email_contact,
        cc: MON_EMAIL,
        subject: `Candidature — ${job.title} — Mohamed Assalia Maiga`,
        html,
        attachments:[{
          filename: `CV_Mohamed_Assalia_Maiga_${job.title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      // Marquer comme envoyé
      await pool.query(
        'INSERT INTO ja_emails_envoyes (job_id, email_contact, cv_optimise_id) VALUES ($1,$2,$3) ON CONFLICT (job_id) DO NOTHING',
        [job.id, job.email_contact, cvOptimiseId]
      );

      envoyes.push({ job, cvOptimiseId, lettre });
      console.log(`  ✅ Envoyé à ${job.email_contact}`);
      await new Promise(r => setTimeout(r, 5000));
    } catch(e) {
      console.log(`  ❌ Erreur ${job.title}: ${e.message}`);
    }
  }

  // Email récapitulatif
  if(envoyes.length > 0) {
    const transporter = nodemailer.createTransport({service:'gmail',auth:{user:MON_EMAIL,pass:GMAIL_PASS}});
    const lignes = envoyes.map(r=>`<li><b>${r.job.title}</b> — ${r.job.company||'?'} → <a href="mailto:${r.job.email_contact}">${r.job.email_contact}</a> (Score: ${r.job.ia_score}%)</li>`).join('');
    await transporter.sendMail({
      from: `JobAssistant IA <${MON_EMAIL}>`,
      to: MON_EMAIL,
      subject: `📧 ${envoyes.length} candidature(s) envoyée(s) automatiquement`,
      html: `<h2>📧 ${envoyes.length} candidature(s) envoyée(s)</h2><ul>${lignes}</ul><p>CV optimisé joint à chaque email.</p>`
    });
    console.log(`✅ Récapitulatif envoyé — ${envoyes.length} candidatures`);
  }

  await pool.end();
}

main().catch(console.error);

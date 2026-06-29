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
const HUNTER_KEY = process.env.HUNTER_API_KEY;
const MON_EMAIL = 'mmohamedassalia6@gmail.com';

// Trouver email via Hunter.io
async function findEmailHunter(entreprise, siteWeb) {
  return new Promise((resolve) => {
    const domain = siteWeb ? siteWeb.replace(/https?:\/\//,'').replace(/\/.*/,'') : '';
    if(!domain) { resolve(null); return; }
    const url = `/v2/domain-search?domain=${domain}&api_key=${HUNTER_KEY}&limit=1&type=personal&seniority=senior,executive`;
    const req = https.request({hostname:'api.hunter.io',path:url,method:'GET'}, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const data = JSON.parse(d);
          const emails = data.data?.emails || [];
          // Priorité : RH, recrutement, talent
          const rhEmail = emails.find(e => /rh|recrutement|talent|hr|recruit/i.test(e.value));
          const firstEmail = emails[0]?.value;
          resolve(rhEmail?.value || firstEmail || null);
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// Trouver email via Hunter domain-search par nom d'entreprise
async function findEmailByName(entreprise, siteWeb) {
  try {
    const { execSync } = require('child_process');
    let domain = '';
    if(siteWeb) {
      domain = siteWeb.replace(/https?:\/\//,'').replace(/\/.*/,'').replace(/^www\./,'');
    } else {
      domain = entreprise.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/\s/g,'') + '.com';
    }
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_KEY}&limit=5`;
    const result = execSync(`wget -qO- "${url}"`, {encoding:'utf8', timeout:15000});
    const data = JSON.parse(result);
    const emails = data.data?.emails || [];
    const rhEmail = emails.find(e => /rh|recrutement|talent|hr|recruit|career/i.test(e.value));
    return { email: rhEmail?.value || emails[0]?.value || null, domain: data.data?.domain || domain };
  } catch(e) {
    console.log('Hunter erreur:', e.message);
    return { email: null, domain: null };
  }
}

function callClaude(prompt, maxTokens) {
  return new Promise((resolve) => {
    const body = JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTokens||1000,messages:[{role:'user',content:prompt}]});
    const req = https.request({hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{resolve(JSON.parse(d).content[0].text);}catch(e){resolve(null);}});});
    req.on('error',()=>resolve(null));
    req.write(body); req.end();
  });
}

async function genererPDF(d) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({margin:50,size:'A4'});
    const chunks = [];
    doc.on('data',c=>chunks.push(c));
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    doc.fontSize(22).fillColor('#1e3a5f').text(d.nom||'Mohamed Assalia Maiga',{align:'center'});
    doc.fontSize(13).fillColor('#2d6a9f').text(d.titre_accroche||'');
    doc.fontSize(10).fillColor('#64748b').text('Longjumeau (91) · +33 778 501 767 · mmohamedassalia6@gmail.com');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('PROFIL');
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f'); doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(d.resume||'',{align:'justify'});
    doc.moveDown(0.5);
    if((d.competences_ordonnees||[]).length>0){
      doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('COMPÉTENCES');
      doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f'); doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#333').font('Helvetica').text((d.competences_ordonnees||[]).join(', '),{align:'justify'});
      doc.moveDown(0.5);
    }
    doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('EXPÉRIENCES');
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f'); doc.moveDown(0.2);
    (d.experiences||[]).forEach(e=>{
      doc.fontSize(10).fillColor('#1e3a5f').font('Helvetica-Bold').text((e.titre||'')+(e.entreprise?' — '+e.entreprise:''));
      doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(e.periode||'');
      doc.fontSize(10).fillColor('#333').font('Helvetica').text((e.description||'').replace(/[●%Ï]/g,'-').replace(/\uFFFD+/g,''),{align:'justify'});
      doc.moveDown(0.3);
    });
    if(d.formation){
      doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text('FORMATION');
      doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke('#1e3a5f'); doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#333').font('Helvetica').text(d.formation,{align:'justify'});
    }
    doc.end();
  });
}

async function main() {
  console.log('=== Envoi automatique candidatures spontanées ===');

  // Récupérer CV texte
  const profilRow = await pool.query('SELECT cv_path FROM ja_profil LIMIT 1');
  const cvPath = profilRow.rows[0]?.cv_path || '';
  let cvText = '';
  if(cvPath) {
    try { const {execSync} = require('child_process'); cvText = execSync(`pdftotext "${cvPath}" -`,{encoding:'utf8',timeout:15000}); } catch(e) {}
  }

  // Vérifier combien ont été envoyées cette semaine
  const semaineCount = await pool.query(`
    SELECT COUNT(*) as total FROM ja_cibles_spontanees
    WHERE statut IN ('envoyée', 'relancée', 'entretien')
    AND envoye_le >= NOW() - INTERVAL '7 days'
  `);
  const dejaSemaineCount = parseInt(semaineCount.rows[0].total);
  const restant = 10 - dejaSemaineCount;
  console.log(dejaSemaineCount + " envoyées cette semaine, " + restant + " restantes");

  if(restant <= 0) {
    console.log('Limite de 10 candidatures/semaine atteinte - arret');
    await pool.end(); return;
  }

  // Récupérer cibles à envoyer - anti-doublon par entreprise
  const cibles = await pool.query(`
    SELECT * FROM ja_cibles_spontanees
    WHERE statut IN ('à envoyer', 'a envoyer')
    AND entreprise NOT IN (
      SELECT entreprise FROM ja_cibles_spontanees
      WHERE statut IN ('envoyée', 'relancée', 'entretien')
      AND envoye_le >= NOW() - INTERVAL '7 days'
    )
    ORDER BY created_at ASC
    LIMIT ${restant}
  `);

  console.log(`${cibles.rows.length} cible(s) à traiter`);
  if(cibles.rows.length === 0) { await pool.end(); return; }

  const envoyes = [];

  for(const c of cibles.rows) {
    try {
      console.log(`  Traitement: ${c.entreprise}`);

      // 1. Trouver email si absent
      let emailContact = c.email_contact;
      if(!emailContact) {
        console.log(`    Recherche email Hunter.io pour ${c.entreprise}...`);
        const hunterResult = await findEmailByName(c.entreprise, c.site_web);
        emailContact = hunterResult.email;
        if(emailContact) {
          await pool.query('UPDATE ja_cibles_spontanees SET email_contact=$1 WHERE id=$2', [emailContact, c.id]);
          console.log(`    Email trouvé: ${emailContact}`);
        } else {
          console.log(`    Aucun email trouvé pour ${c.entreprise} — passage à la suivante`);
          continue;
        }
      }

      // 2. Générer CV repositionné
      const cvPrompt = `Reecris ce CV pour une candidature spontanee chez ${c.entreprise} (secteur: ${c.secteur||'Data & IA'}).
Raison: ${c.pourquoi||'Intérêt fort pour cette entreprise'}.
CV: ${cvText.slice(0,10000)}
Retourne JSON: {"nom":"...","titre_accroche":"...","resume":"...","competences_ordonnees":[...],"experiences":[{"titre":"...","periode":"...","entreprise":"...","description":"..."}],"certifications":[...],"formation":"...","points_cles_mis_en_avant":[...]}
UNIQUEMENT le JSON.`;
      const cvResult = await callClaude(cvPrompt, 4000);
      const cvData = JSON.parse((cvResult||'{}').replace(/```json|```/g,'').trim());

      const savedCv = await pool.query(
        'INSERT INTO ja_cv_optimises (job_id, data, status, offre_titre) VALUES ($1,$2,$3,$4) RETURNING id',
        [null, JSON.stringify(cvData), 'done', 'Candidature spontanée — '+c.entreprise]
      );
      const cvOptimiseId = savedCv.rows[0].id;

      // 3. Générer lettre
      const lettrePrompt = `Redige une lettre de candidature spontanee professionnelle (250-300 mots, français) pour ${c.entreprise} (secteur: ${c.secteur||'Data & IA'}).
Candidat: ${cvData.nom}, ${cvData.titre_accroche}. Resume: ${cvData.resume}.
Raison de cibler cette entreprise: ${c.pourquoi||'Forte attractivité et culture data'}
REGLES ABSOLUES: commencer par "Madame, Monsieur,", terminer par "Cordialement," + nom, AUCUNE date ni en-tete ni markdown.
Retourne UNIQUEMENT le texte de la lettre.`;
      const lettre = await callClaude(lettrePrompt, 800);
      const lettreClean = (lettre||'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/\[.*?\]/g,'').replace(/^Paris.*\d{4}\s*/m,'').trim();

      // 4. Générer PDF
      const pdfBuffer = await genererPDF(cvData);

      // 5. Envoyer email
      const transporter = nodemailer.createTransport({service:'gmail',auth:{user:MON_EMAIL,pass:GMAIL_PASS}});
      await transporter.sendMail({
        from: `${cvData.nom||'Mohamed Assalia Maiga'} <${MON_EMAIL}>`,
        to: emailContact,
        cc: MON_EMAIL,
        subject: `Candidature spontanée — ${cvData.titre_accroche||'Product Owner Data'} — ${cvData.nom||'Mohamed Assalia Maiga'}`,
        html: `<p style="white-space:pre-wrap;line-height:1.8;font-family:Arial,sans-serif;font-size:14px">${lettreClean}</p>`,
        attachments: [{
          filename: `CV_${(cvData.nom||'Mohamed').replace(/\s/g,'_')}_${c.entreprise.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      // 6. Mettre à jour statut
      await pool.query(
        'UPDATE ja_cibles_spontanees SET statut=$1, envoye_le=$2, cv_optimise_id=$3 WHERE id=$4',
        ['envoyée', new Date(), cvOptimiseId, c.id]
      );

      envoyes.push({c, emailContact});
      console.log(`  ✅ Envoyé à ${emailContact} (${c.entreprise})`);
      await new Promise(r=>setTimeout(r,5000));

    } catch(e) {
      console.log(`  ❌ Erreur ${c.entreprise}: ${e.message}`);
      await pool.query('UPDATE ja_cibles_spontanees SET statut=$1 WHERE id=$2', ['erreur', c.id]);
    }
  }

  // Email récapitulatif
  if(envoyes.length > 0) {
    const transporter = nodemailer.createTransport({service:'gmail',auth:{user:MON_EMAIL,pass:GMAIL_PASS}});
    const lignes = envoyes.map(r=>`<li><b>${r.c.entreprise}</b> → <a href="mailto:${r.emailContact}">${r.emailContact}</a></li>`).join('');
    await transporter.sendMail({
      from: `JobAssistant IA <${MON_EMAIL}>`,
      to: MON_EMAIL,
      subject: `📨 ${envoyes.length} candidature(s) spontanée(s) envoyée(s)`,
      html: `<h2>📨 ${envoyes.length} candidature(s) spontanée(s)</h2><ul>${lignes}</ul>`
    });
  }

  await pool.end();
  console.log(`✅ Terminé — ${envoyes.length} candidatures envoyées`);
}

main().catch(console.error);

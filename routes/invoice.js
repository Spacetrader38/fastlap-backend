const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const Order = require('../models/orders');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Envoi facture + setups
router.post('/', async (req, res) => {
  try {
    const { email, civilite, nom, prenom, adresse, ville, codePostal, telephone, commande } = req.body;
    console.log('Reçu côté backend :', req.body);
    if (!email || !nom || !prenom || !civilite || !commande) {
      return res.status(400).json({ error: 'Infos client ou commande manquantes' });
    }

    // ✅ Calculs précis : HT en 3 décimales, TVA et TTC en 2
    const totalHTBrut = commande.reduce((acc, item) => acc + (item.price || 0), 0);
    const totalHT = parseFloat(totalHTBrut.toFixed(3)); // HT en 3 décimales
    const totalTVA = parseFloat((totalHT * 0.2).toFixed(3)); // TVA en 2 décimales
    const totalTTC = parseFloat((totalHT + totalTVA).toFixed(2)); // TTC en 2 décimales

    const commandeTexte = commande.map(item => `${item.name} - ${item.price.toFixed(2)} €`).join('\n');

    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      const setupAttachments = commande.map(item => {
        const filePath = path.join(__dirname, '..', 'setups', `${item.name}.svm`);
        if (fs.existsSync(filePath)) {
          return {
            content: fs.readFileSync(filePath).toString('base64'),
            filename: `${item.name}.svm`,
            type: 'application/octet-stream',
            disposition: 'attachment',
          };
        } else {
          console.warn(`Setup manquant : ${filePath}`);
          return null;
        }
      }).filter(Boolean);

      const msg = {
        to: email,
        from: process.env.EMAIL_FROM || 'contact@fastlap-engineering.fr',
        subject: 'Votre facture FastLap Engineering',
        text: `Bonjour ${civilite} ${prenom} ${nom},\n\nMerci pour votre achat. Voici votre facture et votre/vos setup(s) en pièce jointe.\n\nCommande:\n${commandeTexte}\n\nTotal HT: ${totalHT.toFixed(3)} €\nTVA (20%): ${totalTVA.toFixed(2)} €\nTotal TTC: ${totalTTC.toFixed(2)} €\n\nCordialement,\nFastLap Engineering`,
        html: `<p>Bonjour <strong>${civilite} ${prenom} ${nom}</strong>,</p>
               <p>Merci pour votre achat. Voici votre facture et votre/vos setup(s) en pièce jointe.</p>
               <pre><strong>Commande :</strong><br/>${commandeTexte.replace(/\n/g, '<br/>')}</pre>
               <p>Total HT : ${totalHT.toFixed(3)} €<br/>
               TVA (20%) : ${totalTVA.toFixed(2)} €<br/>
               <strong>Total TTC : ${totalTTC.toFixed(2)} €</strong></p>
               <p>Cordialement,<br/>FastLap Engineering</p>`,
        attachments: [
          {
            content: pdfData.toString('base64'),
            filename: 'facture-fastlap.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
          },
          ...setupAttachments
        ],
      };

      await sgMail.send(msg);

      // Enregistrement MongoDB
      try {
        const orderToSave = new Order({
          date: new Date(),
          email,
          civilite,
          nom,
          prenom,
          adresse,
          ville,
          codePostal,
          telephone,
          commande,
          totalHT: totalHT.toFixed(3),
          tva: totalTVA.toFixed(2),
          totalTTC: totalTTC.toFixed(2),
        });

        await orderToSave.save();
        console.log('✅ Commande enregistrée dans MongoDB');
      } catch (err) {
        console.error('❌ Erreur MongoDB lors de l\'enregistrement de la commande :', err);
      }

      res.status(200).json({ message: 'Mail avec facture et setup(s) envoyé avec succès' });
    });

    doc.fontSize(20).text('Facture FastLap Engineering', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`${civilite} ${nom} ${prenom}`);
    doc.text(adresse);
    doc.text(`${codePostal}, ${ville}`);
    if (telephone) doc.text(`Téléphone : ${telephone}`);

    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.fontSize(12).text(`Date : ${dateStr}`, { align: 'right' });

    doc.moveDown();
    doc.text('Commande :', { underline: true });

    commande.forEach(item => {
      const prixHT = (item.price || 0).toFixed(2);
      doc.text(item.name, { continued: true });
      doc.text(` ${prixHT} €`, { align: 'right' });
    });

    doc.moveDown();
    doc.text(`Total HT : ${totalHT.toFixed(3)} €`);
    doc.text(`TVA (20%) : ${totalTVA.toFixed(2)} €`);
    doc.font('Helvetica-Bold').text(`Total TTC : ${totalTTC.toFixed(2)} €`, { align: 'right' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text(
      `Mentions légales : Service numérique livré immédiatement après paiement. En application de l’article L221-28 du Code de la consommation, aucun droit de rétractation ne peut être exercé. TVA applicable : 20 %.`,
      { align: 'center' }
    );

    doc.end();

  } catch (error) {
    console.error('Erreur envoi mail avec facture:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'envoi du mail' });
  }
});

module.exports = router;

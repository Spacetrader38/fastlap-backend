const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // ta clé SendGrid dans .env

// Génération PDF en mémoire et envoi mail
router.post('/', async (req, res) => {
  try {
    const { email, civilite, nom, prenom, adresse, ville, codePostal, telephone, commande } = req.body;
      console.log('Reçu côté backend :', req.body);
    console.log('Téléphone reçu :', telephone);
    if (!email || !nom || !prenom || !civilite || !commande) {
      return res.status(400).json({ error: 'Infos client ou commande manquantes' });
    }

    // Calculs pour facture
    const totalHT = commande.reduce((acc, item) => acc + (item.price || 0), 0);
    const tva = totalHT * 0.2;
    const totalTTC = totalHT + tva;

    // Format texte commande pour mail HTML
    const commandeTexte = commande
      .map(item => `${item.name} - ${item.price.toFixed(2)} €`)
      .join('\n');

    // Création du PDF en mémoire
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      // ---------- GESTION DES SETUPS EN PIECE JOINTE ----------
      const setupAttachments = commande.map(item => {
        console.log('item.name reçu du frontend =', item.name);
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
      // --------------------------------------------------------

      // Préparer mail avec pièce jointe PDF et setups
      const msg = {
        to: email,
        from: 'fastlap.engineering@gmail.com',
        subject: 'Votre facture FastLap Engineering',
        text: `Bonjour ${civilite} ${prenom} ${nom},\n\nMerci pour votre achat. Voici votre facture et votre/vos setup(s) en pièce jointe.\n\nCommande:\n${commandeTexte}\n\nTotal HT: ${totalHT.toFixed(2)} €\nTVA (20%): ${tva.toFixed(2)} €\nTotal TTC: ${totalTTC.toFixed(2)} €\n\nCordialement,\nFastLap Engineering`,
        html: `<p>Bonjour <strong>${civilite} ${prenom} ${nom}</strong>,</p>
               <p>Merci pour votre achat. Voici votre facture et votre/vos setup(s) en pièce jointe.</p>
               <pre><strong>Commande :</strong><br/>${commandeTexte.replace(/\n/g, '<br/>')}</pre>
               <p>Total HT : ${totalHT.toFixed(2)} €<br/>
               TVA (20%) : ${tva.toFixed(2)} €<br/>
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

      // ----------- HISTORIQUE COMMANDE (A + B) ------------
      try {
        const orderHistoryPath = path.join(__dirname, '..', 'orders-history.json');
        const orderToSave = {
          date: new Date().toISOString(),
          email,
          civilite,
          nom,
          prenom,
          adresse,
          ville,
          codePostal,
          telephone,
          commande,
          totalHT: totalHT.toFixed(2),
          tva: tva.toFixed(2),
          totalTTC: totalTTC.toFixed(2),
        };

        let allOrders = [];
        if (fs.existsSync(orderHistoryPath)) {
          allOrders = JSON.parse(fs.readFileSync(orderHistoryPath));
        }
        allOrders.push(orderToSave);
        fs.writeFileSync(orderHistoryPath, JSON.stringify(allOrders, null, 2));
      } catch (err) {
        console.error('Erreur lors de la sauvegarde de la commande dans l\'historique :', err);
      }
      // ----------------------------------------------------

      res.status(200).json({ message: 'Mail avec facture et setup(s) envoyé avec succès' });
    });

    // Contenu du PDF
    doc.fontSize(20).text('Facture FastLap Engineering', { align: 'center' });

    // En-tête client avec civilité, prénom, nom, adresse complète en haut à gauche
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`${civilite} ${prenom} ${nom}`);
    doc.text(adresse); 
    doc.text(`${ville} - ${codePostal}`);       
    if (telephone) {
    doc.text(`Téléphone : ${telephone}`);
    }

    // Date à droite en haut
    const dateStr = new Date().toLocaleDateString();
    doc.fontSize(12).text(`Date : ${dateStr}`, { align: 'right' });

    doc.moveDown();
    doc.text('Commande :', { underline: true });

    commande.forEach(item => {
      const prixHT = (item.price || 0).toFixed(2);
      doc.text(item.name, { continued: true });
      doc.text(` ${prixHT} €`, { align: 'right' });
    });

    doc.moveDown();
    doc.text(`Total HT : ${totalHT.toFixed(2)} €`);
    doc.text(`TVA (20%) : ${tva.toFixed(2)} €`);
    doc.font('Helvetica-Bold').text(`Total TTC : ${totalTTC.toFixed(2)} €`, { align: 'right' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text(
      `Mentions légales : Service numérique livré immédiatement après paiement. En application de l’article L221-28 du Code de la consommation, aucun droit de rétractation ne peut être exercé. TVA applicable : 20 %.`
      ,
      { align: 'center' }
    );

    doc.end();

  } catch (error) {
    console.error('Erreur envoi mail avec facture:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'envoi du mail' });
  }
});

// ----------- ROUTE LECTURE HISTORIQUE (C) ---------------
router.get('/history', (req, res) => {
  const orderHistoryPath = path.join(__dirname, '..', 'orders-history.json');
  if (!fs.existsSync(orderHistoryPath)) {
    return res.json([]);
  }
  const allOrders = JSON.parse(fs.readFileSync(orderHistoryPath));
  res.json(allOrders);
});
// --------------------------------------------------------

module.exports = router;

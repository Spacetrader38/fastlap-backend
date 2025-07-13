require('dotenv').config();
const mongoose = require('mongoose');
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const sgMail = require("@sendgrid/mail");

const app = express();
const paymentRoutes = require('./routes/payment');
const clientInfoRoutes = require('./routes/clientInfo');
const invoiceRoutes = require('./routes/invoice');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Clé SendGrid

app.use(cors());

// Webhook Stripe (doit être avant express.json)
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Erreur Webhook Stripe :", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const email = charge.billing_details.email || charge.receipt_email;
    const fullName = charge.billing_details.name || "Client";

    console.log(`💸 Remboursement détecté pour : ${fullName} (${email})`);

    if (email) {
      const msg = {
        to: email,
        from: "fastlap.engineering@gmail.com", // Adresse expéditeur confirmée
        subject: "Votre remboursement a été effectué – FastLap Engineering",
        text: `Bonjour ${fullName},\n\nNous vous confirmons que votre commande a été remboursée. Le montant sera recrédité sur votre compte sous quelques jours.\n\nMerci de votre compréhension.\n\n— L'équipe FastLap Engineering`,
        html: `
          <p>Bonjour ${fullName},</p>
          <p>Nous vous confirmons que votre commande a été remboursée. Le montant sera recrédité sur votre compte sous quelques jours.</p>
          <p>
            <a href="https://fastlap-engineering.netlify.app" 
               style="display:inline-block;padding:10px 20px;background-color:#ffcc00;color:#000;text-decoration:none;border-radius:5px;font-weight:bold;">
               Retour à la boutique
            </a>
          </p>
          <p>Merci de votre compréhension.</p>
          <p>— L'équipe FastLap Engineering</p>
        `,
      };

      sgMail
        .send(msg)
        .then(() => console.log(`✉️ Email de remboursement envoyé à ${email}`))
        .catch((error) =>
          console.error("❌ Erreur SendGrid :", error.response?.body || error.message)
        );
    }
  }

  res.status(200).json({ received: true });
});

app.use(express.json()); // après le webhook

app.use("/api/payment", paymentRoutes);
app.use('/api/clientInfo', clientInfoRoutes);
app.use('/api/invoice', invoiceRoutes);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connexion MongoDB réussie"))
.catch(err => console.error("❌ Erreur MongoDB :", err));

let files = [
  {
    name: "Ferrari 499P – Le Mans",
    url: "https://drive.google.com/file/d/1LS5XfrU_0AUe7WqMBAGsOpO614qiGLMq/view?usp=drive_link"
  },
  {
    name: "Porsche 992 – Nürburgring",
    url: "https://drive.google.com/file/d/1C4iSQ5R7BMfsIM6zShn_xXuwDpDKwrgo/view?usp=drive_link"
  }
];

app.get("/files", (req, res) => {
  res.json(files);
});

app.post("/files", (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Missing name or url" });
  }
  files.push({ name, url });
  res.status(201).json({ message: "File added" });
});

app.delete("/files/:index", (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= files.length) {
    return res.status(400).json({ error: "Invalid index" });
  }
  files.splice(index, 1);
  res.json({ message: "File deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend démarré sur le port ${PORT}`));

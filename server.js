require('dotenv').config();
const mongoose = require('mongoose');
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const sgMail = require("@sendgrid/mail");

const app = express();

// ✅ IMPORT DES ROUTES
const paymentRoutes = require('./routes/payment');
const clientInfoRoutes = require('./routes/clientInfo');
const invoiceRoutes = require('./routes/invoice');
const optimizeRoute = require('./routes/optimize'); // <-- AJOUTÉ

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(cors());

// ATTENTION : le webhook Stripe doit être défini AVANT express.json()
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
    const email = charge.receipt_email || charge.billing_details.email;
    const name = charge.billing_details.name || "";
    const nom = name.split(" ")[0] || "";
    const prenom = name.split(" ").slice(1).join(" ") || "";

    const capitalize = str =>
      typeof str === "string" && str.length
        ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
        : "";

    console.log(`💸 Remboursement détecté pour : ${email}`);

    if (email) {
      const msg = {
        to: email,
        from: process.env.EMAIL_FROM || "contact@fastlap-engineering.fr",
        subject: "Votre remboursement a été effectué – FastLap Engineering",
        html: `
          <p>Bonjour ${capitalize(prenom)} ${nom.toUpperCase()},</p>
          <p>Nous vous confirmons que votre commande a été remboursée.<br>
          Le montant sera crédité sur votre compte sous quelques jours.</p>

          <p>Merci de votre compréhension.</p>

          <p>— L'équipe FastLap Engineering</p>

          <p style="margin-top: 30px;">
            <a href="https://www.fastlap-engineering.fr/" 
               style="background-color:#ffc107; color:#000; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">
               Retour à la boutique
            </a>
          </p>
        `
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

app.use(express.json()); // Après le webhook

// ✅ ROUTES API
app.use("/api/payment", paymentRoutes);
app.use('/api/clientInfo', clientInfoRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/optimize', optimizeRoute); // <-- AJOUTÉ

// ✅ ROUTE DE MONITORING
app.get("/", (req, res) => {
  res.status(200).send("✅ FastLap backend is running");
});

// ✅ CONNEXION MONGODB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connexion MongoDB réussie"))
.catch(err => console.error("❌ Erreur MongoDB :", err));

// ✅ STOCKAGE TEMPORAIRE FICHIERS SETUP
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

// GET all files
app.get("/files", (req, res) => {
  res.json(files);
});

// POST new file
app.post("/files", (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Missing name or url" });
  }
  files.push({ name, url });
  res.status(201).json({ message: "File added" });
});

// DELETE file by index
app.delete("/files/:index", (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= files.length) {
    return res.status(400).json({ error: "Invalid index" });
  }
  files.splice(index, 1);
  res.json({ message: "File deleted" });
});

// ✅ LANCEMENT SERVEUR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend démarré sur le port ${PORT}`));

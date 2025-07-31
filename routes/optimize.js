const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");
const Client = require("../models/Client"); // <- modèle client
const fs = require("fs");
const path = require("path");
const sgMail = require("@sendgrid/mail");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // <- clé SendGrid

router.post("/", async (req, res) => {
  const {
    game,
    car,
    track,
    behavior,
    brakeBehavior,
    phase,
    weather,
    tempAir,
    tempTrack,
    sessionType,
    duration,
  } = req.body;

  if (!game || !car || !track || !weather || !sessionType) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  try {
    const format = game === "rFactor2" ? ".svm" : ".json";

    const prompt = `Optimise un setup pour ${game}.
Voiture : ${car}
Circuit : ${track}
Session : ${sessionType}${duration ? ` (${duration} min)` : ""}
Conditions : ${weather}${tempTrack ? `, Piste ${tempTrack}°C` : ""}${tempAir ? `, Air ${tempAir}°C` : ""}${behavior ? `, Comportement : ${behavior}` : ""}${brakeBehavior ? `, Freinage : ${brakeBehavior}` : ""}${phase ? `, Phase : ${phase}` : ""}

Génère un fichier complet de setup au format ${format}, prêt à être utilisé par le jeu ${game}.
Ne fournis aucun commentaire ni explication : uniquement le contenu brut du fichier.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const reply = completion.choices[0]?.message?.content || "Pas de réponse générée.";

    const folderPath = path.join(__dirname, "../setupsIA");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    const safeCar = car.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const safeTrack = track.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const timestamp = Date.now();
    const filename = `${safeCar}_${safeTrack}_${timestamp}${format}`;
    const filePath = path.join(folderPath, filename);

    fs.writeFileSync(filePath, reply, "utf-8");

    // 📩 Récupération du dernier client
    const lastClient = await Client.findOne().sort({ createdAt: -1 });

    if (lastClient?.email) {
      const msg = {
        to: lastClient.email,
        from: "contact@fastlap-engineering.fr",
        subject: "Votre setup personnalisé est prêt !",
        text: `Bonjour ${lastClient.prenom},\n\nVous trouverez ci-joint le fichier setup généré pour votre demande sur ${car} – ${track}.\n\nMerci pour votre confiance !`,
        attachments: [
          {
            content: Buffer.from(reply).toString("base64"),
            filename,
            type: "text/plain",
            disposition: "attachment",
          },
        ],
      };

      await sgMail.send(msg);
      console.log(`✅ Setup envoyé à ${lastClient.email}`);
    } else {
      console.warn("❌ Aucun client trouvé pour l'envoi du mail.");
    }

    await OptimizeRequest.create({
      game,
      car,
      track,
      handling: behavior || null,
      brakeBehavior: brakeBehavior || null,
      phase: phase || null,
      weather,
      tempAir: tempAir || null,
      tempTrack: tempTrack || null,
      sessionType,
      duration: duration || null,
      aiResponse: reply,
    });

    res.json({ reply, filename });
  } catch (err) {
    console.error("Erreur OpenAI, Mongo ou SendGrid :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

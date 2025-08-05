const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");
const Client = require("../models/Client");
const AccessToken = require("../models/AccessToken"); // ✅ nouveau modèle
const fs = require("fs");
const path = require("path");
const sgMail = require("@sendgrid/mail");
const injectModifications = require("../injectModifications");
const convertTxtToJson = require("../convertTxtToJson");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const {
    game,
    car,
    track,
    category,
    entryBehavior,
    behavior,
    brakeBehavior,
    curbBehavior,
    targetPressure,
    weather,
    tempAir,
    tempTrack,
    sessionType,
    duration,
    notes,
    email,
    token,
  } = req.body;

  // 🔒 VÉRIFICATION DU TOKEN D'ACCÈS
  if (!token || !email) {
    return res.status(403).json({ error: "Accès refusé : token ou email manquant" });
  }

  const tokenRecord = await AccessToken.findOne({ token });

  if (!tokenRecord || tokenRecord.email !== email) {
    return res.status(403).json({ error: "Accès refusé : token invalide ou non lié à cet email" });
  }

  // 🔁 GESTION DES ACCÈS
  if (tokenRecord.type === "unitaire") {
    await AccessToken.deleteOne({ token });
  } else if (tokenRecord.type === "pack5") {
    if (tokenRecord.remaining <= 0) {
      return res.status(403).json({ error: "Pack épuisé : plus d'accès restants" });
    }
    tokenRecord.remaining -= 1;
    await tokenRecord.save();
  } else if (tokenRecord.type === "illimité") {
    const now = new Date();
    if (tokenRecord.expiresAt && now > new Date(tokenRecord.expiresAt)) {
      return res.status(403).json({ error: "Abonnement expiré" });
    }
  }

  if (!game || !car || !track || !category || !weather || !sessionType || !email) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  try {
    const setupBasePath = path.join(__dirname, "../setupsIA", track, category, `setup_base_${car}.txt`);

    if (!fs.existsSync(setupBasePath)) {
      return res.status(404).json({ error: "Setup de base introuvable pour cette voiture et circuit" });
    }

    const baseSetup = fs.readFileSync(setupBasePath, "utf-8");

    const userPrompt = `...`; // inchangé pour le moment

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un ingénieur en sport automobile expert en setups pour Assetto Corsa Competizione et rFactor 2. Tu dois analyser un fichier texte de setup fourni et renvoyer uniquement les sections à modifier. Aucun commentaire. Si refus, indiquer clairement le motif.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content || "Pas de réponse générée.";

    console.log("🧠 Réponse OpenAI reçue :", reply);

    if (!reply || reply.includes("Refus de traitement")) {
      console.warn("⚠️ Réponse OpenAI vide ou refusée :", reply);
    }

    const safeCar = car.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const safeTrack = track.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const timestamp = Date.now();
    const extension = game === "Assetto Corsa Competizione" ? "json" : "svm";

    const modificationsFile = `modifications_${safeCar}_${safeTrack}_${timestamp}.txt`;
    const modificationsPath = path.join(__dirname, "../setupsIA", modificationsFile);
    let finalFileName = `setup_final_${safeCar}_${safeTrack}_${timestamp}.${extension}`;
    let finalFilePath = path.join(__dirname, "../setupsIA", finalFileName);

    try {
      fs.writeFileSync(modificationsPath, reply, "utf-8");
      console.log("📄 Fichier de modifications écrit :", modificationsPath);
    } catch (err) {
      console.error("❌ Erreur écriture fichier modifications :", err);
    }

    injectModifications(setupBasePath, modificationsPath, finalFilePath);

    if (extension === "json") {
      await convertTxtToJson(finalFilePath);
      finalFilePath = finalFilePath.replace(".txt", ".json");
      finalFileName = path.basename(finalFilePath);
    }

    await OptimizeRequest.create({
      game,
      car,
      track,
      category,
      handling: behavior || null,
      entryBehavior: entryBehavior || null,
      brakeBehavior: brakeBehavior || null,
      curbBehavior: curbBehavior || null,
      targetPressure: targetPressure || null,
      weather,
      tempAir: tempAir || null,
      tempTrack: tempTrack || null,
      sessionType,
      duration: duration || null,
      notes: notes || null,
      aiResponse: reply,
    });

    const client = await Client.findOne({ email });

    if (client) {
      const emailData = {
        to: client.email,
        from: "contact@fastlap-engineering.fr",
        subject: `Votre setup sur mesure pour ${car} – ${track}`,
        text: `Bonjour ${client.prenom} ${client.nom},\n\nVeuillez trouver ci-joint le setup final optimisé par notre outil de développement.\n\nSportivement,\nL'équipe FastLap Engineering`,
        attachments: [
          {
            content: fs.readFileSync(finalFilePath).toString("base64"),
            filename: finalFileName,
            type: "application/octet-stream",
            disposition: "attachment",
          },
        ],
      };

      await sgMail.send(emailData);
      console.log("📩 Setup IA envoyé à", client.email);
    } else {
      console.error("❌ Aucun client trouvé avec l'email :", email);
    }

    res.json({ reply, filename: finalFileName });
  } catch (err) {
    console.error("Erreur OpenAI, Mongo ou SendGrid :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

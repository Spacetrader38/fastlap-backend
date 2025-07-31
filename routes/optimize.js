const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");
const Client = require("../models/Client");
const fs = require("fs");
const path = require("path");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const userPrompt = `Optimise un setup pour ${game}.
Voiture : ${car}
Circuit : ${track}
Session : ${sessionType}${duration ? ` (${duration} min)` : ""}
Conditions : ${weather}${tempTrack ? `, Piste ${tempTrack}°C` : ""}${tempAir ? `, Air ${tempAir}°C` : ""}${behavior ? `, Comportement : ${behavior}` : ""}${brakeBehavior ? `, Freinage : ${brakeBehavior}` : ""}${phase ? `, Phase : ${phase}` : ""}

Ta tâche est de générer un fichier de setup complet au format ${format}, prêt à être utilisé directement dans ${game}.
Ne fournis aucun commentaire ni explication **si** tu génères le fichier.  
En revanche, si tu ne peux pas le générer (limite technique ou politique de contenu), explique brièvement pourquoi.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un ingénieur en sport automobile expert en jeux de simulation comme Assetto Corsa Competizione et rFactor 2. Si tu peux, tu dois générer un fichier de setup au format .json ou .svm. Si tu ne peux pas, explique clairement pourquoi, sans détour ni redirection vers des forums.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3,
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

    const client = await Client.findOne().sort({ _id: -1 });

    if (client) {
      const emailData = {
        to: client.email,
        from: "contact@fastlap-engineering.fr",
        subject: `Votre setup IA pour ${car} – ${track}`,
        text: `Bonjour ${client.prenom},\n\nVeuillez trouver ci-joint votre setup personnalisé généré par notre IA.\n\nSportivement,\nL'équipe FastLap Engineering`,
        attachments: [
          {
            content: fs.readFileSync(filePath).toString("base64"),
            filename: filename,
            type: "application/octet-stream",
            disposition: "attachment",
          },
        ],
      };

      await sgMail.send(emailData);
      console.log("📩 Mail setup IA envoyé à", client.email);
    } else {
      console.error("❌ Aucun client trouvé dans la base pour l’envoi du mail IA.");
    }

    res.json({ reply, filename });
  } catch (err) {
    console.error("Erreur OpenAI, Mongo ou SendGrid :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

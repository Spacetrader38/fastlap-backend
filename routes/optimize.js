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
    category,
    behavior,
    brakeBehavior,
    phase,
    weather,
    tempAir,
    tempTrack,
    sessionType,
    duration,
  } = req.body;

  if (!game || !car || !track || !category || !weather || !sessionType) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  try {
    const setupBasePath = path.join(
      __dirname,
      "../setupsIA",
      track,
      category,
      `setup_base_${car}.txt`
    );

    if (!fs.existsSync(setupBasePath)) {
      return res.status(404).json({ error: "Setup de base introuvable pour cette voiture et circuit" });
    }

    const baseSetup = fs.readFileSync(setupBasePath, "utf-8");

    const userPrompt = `Tu dois modifier le fichier de setup ci-dessous pour le jeu ${game}.

Voiture : ${car}
Circuit : ${track}
Session : ${sessionType}${duration ? ` (${duration} min)` : ""}
Conditions : ${weather}${tempTrack ? `, Piste ${tempTrack}°C` : ""}${tempAir ? `, Air ${tempAir}°C` : ""}${behavior ? `, Comportement : ${behavior}` : ""}${brakeBehavior ? `, Freinage : ${brakeBehavior}` : ""}${phase ? `, Phase : ${phase}` : ""}

Voici le fichier de setup de base au format texte :

\`\`\`
${baseSetup}
\`\`\`

Merci de modifier ce fichier uniquement en fonction des contraintes indiquées ci-dessus.  
Renvoie-moi **uniquement le contenu du nouveau fichier .txt modifié**, sans le réencapsuler dans du markdown (\`\`\`) ni ajouter de texte explicatif **si la génération réussit**.

❗ En revanche, si tu ne peux pas le faire (limite technique ou politique de contenu), **explique clairement pourquoi.**`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un ingénieur en sport automobile expert en setups pour Assetto Corsa Competizione et rFactor 2. Tu dois modifier un fichier texte de setup fourni, selon des contraintes, et renvoyer uniquement la version modifiée. Si tu ne peux pas, explique clairement pourquoi.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content || "Pas de réponse générée.";

    const safeCar = car.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const safeTrack = track.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const timestamp = Date.now();
    const filename = `${safeCar}_${safeTrack}_${timestamp}.txt`;
    const outputPath = path.join(__dirname, "../setupsIA", filename);

    fs.writeFileSync(outputPath, reply, "utf-8");

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
            content: fs.readFileSync(outputPath).toString("base64"),
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

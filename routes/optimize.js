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
    notes,
    email, // ✅ récupéré dans le body
  } = req.body;

  if (!game || !car || !track || !category || !weather || !sessionType || !email) {
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

    const userPrompt = `Tu es un ingénieur en sport automobile expert des setups dans ${game}.

Tu dois analyser le fichier de setup de base ci-dessous (au format texte brut) et identifier **les paramètres exacts à modifier**, section par section, en fonction des contraintes suivantes.

---

📄 Fichier de setup de base :

${baseSetup}

---

🎯 Contraintes à appliquer :
- Comportement : ${behavior || "non précisé"}
- Phase du virage : ${phase || "non précisée"}
- Freinage : ${brakeBehavior || "non précisé"}
- Session : ${sessionType}${duration ? ` (${duration} min)` : ""}
- Conditions météo : ${weather}${tempTrack ? `, piste ${tempTrack}°C` : ""}${tempAir ? `, air ${tempAir}°C` : ""}
${notes ? `- Remarques personnalisées : ${notes}` : ""}

---

📦 Format de réponse obligatoire :

Section : <nom_de_section>
- <paramètre> : <valeur>
- <paramètre> : <valeur>

Section : <autre_section>
- etc.

⚠️ Ne renvoie que les paramètres à modifier.
⚠️ Aucune explication, aucun commentaire, aucun texte introductif, aucun markdown.

❌ Si tu ne peux pas traiter cette demande pour une raison précise (limite technique, sécurité, etc.), indique uniquement : "Refus de traitement : <motif>". Tout autre comportement est interdit.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un ingénieur en sport automobile expert en setups pour Assetto Corsa Competizione et rFactor 2. Tu dois analyser un fichier texte de setup fourni et renvoyer uniquement les sections à modifier. Aucun commentaire. Si refus, indiquer clairement le motif.",
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
    const modificationsFile = `modifications_${safeCar}_${safeTrack}_${timestamp}.txt`;
    const modificationsPath = path.join(__dirname, "../setupsIA", modificationsFile);

    fs.writeFileSync(modificationsPath, reply, "utf-8");

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
      notes: notes || null,
      aiResponse: reply,
    });

    // ✅ Recherche du client par son email (plus fiable que .sort)
    const client = await Client.findOne({ email });

    if (client) {
      const emailData = {
        to: client.email,
        from: "contact@fastlap-engineering.fr",
        subject: `Votre setup IA pour ${car} – ${track}`,
        text: `Bonjour ${client.prenom},\n\nVeuillez trouver ci-joint les modifications recommandées par notre IA pour votre setup personnalisé.\n\nSportivement,\nL'équipe FastLap Engineering`,
        attachments: [
          {
            content: fs.readFileSync(modificationsPath).toString("base64"),
            filename: modificationsFile,
            type: "text/plain",
            disposition: "attachment",
          },
        ],
      };

      await sgMail.send(emailData);
      console.log("📩 Mail modifications IA envoyé à", client.email);
    } else {
      console.error("❌ Aucun client trouvé avec l'email :", email);
    }

    res.json({ reply, filename: modificationsFile });
  } catch (err) {
    console.error("Erreur OpenAI, Mongo ou SendGrid :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

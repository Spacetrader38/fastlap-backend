const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");
const Client = require("../models/Client");
const fs = require("fs");
const path = require("path");
const sgMail = require("@sendgrid/mail");
const injectModifications = require("../injectModifications");

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
- Comportement en entrée de virage : ${entryBehavior || "non précisé"}
- Comportement en sortie de virage : ${behavior || "non précisé"}
- Comportement au freinage : ${brakeBehavior || "non précisé"}
- Comportement sur les vibreurs : ${curbBehavior || "non précisé"}
- Objectif de pression à chaud : ${targetPressure ? targetPressure + " PSI" : "non précisé"}
- Session : ${sessionType}${duration ? ` (${duration} min)` : ""}
- Conditions météo : ${weather}${tempTrack ? `, piste ${tempTrack}°C` : ""}${tempAir ? `, air ${tempAir}°C` : ""}
${notes ? `- Remarques personnalisées : ${notes}` : ""}

---

💡 Instructions obligatoires :
- Ajuste avec précision les suspensions : amortisseurs, ressorts, barres anti-roulis, bumpstops, hauteurs de caisse.
- Adapte la balance aérodynamique (aileron avant/arrière + hauteurs de caisse) en fonction du tracé du circuit et des conditions météo.
- Déduis les pressions à froid nécessaires pour atteindre la pression cible à chaud.
- Calcule automatiquement la quantité d’essence nécessaire pour la durée de la session.
- Ne modifie que les paramètres nécessaires à ces ajustements.

---

📦 Format de réponse obligatoire :

Section : <nom_de_section>
- <paramètre> : <valeur>
- <paramètre> : <valeur>

Section : <autre_section>
- etc.

⚠️ Ne renvoie que les paramètres à modifier.
⚠️ Aucune explication, aucun commentaire, aucun texte introductif, aucun markdown.

❌ Si tu ne peux pas traiter cette demande pour une raison précise (limite technique, sécurité, etc.), indique uniquement : "Refus de traitement : <motif>"`;

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

    const safeCar = car.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const safeTrack = track.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
    const timestamp = Date.now();
    const extension = game === "Assetto Corsa Competizione" ? "json" : "svm";

    const modificationsFile = `modifications_${safeCar}_${safeTrack}_${timestamp}.txt`;
    const modificationsPath = path.join(__dirname, "../setupsIA", modificationsFile);
    const finalFileName = `setup_final_${safeCar}_${safeTrack}_${timestamp}.${extension}`;
    const finalFilePath = path.join(__dirname, "../setupsIA", finalFileName);

    fs.writeFileSync(modificationsPath, reply, "utf-8");

    injectModifications(setupBasePath, modificationsPath, finalFilePath);

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
        subject: `Votre setup IA pour ${car} – ${track}`,
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

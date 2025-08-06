const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");
const Client = require("../models/Client");
const fs = require("fs");
const path = require("path");
const sgMail = require("@sendgrid/mail");
const injectModifications = require("../injectModifications");
const convertTxtToJson = require("../convertTxtToJson"); // ✅ Fonction importée

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const {
    game,
    car,
    track,
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

  try {
    const safeCar = car.replace(/ /g, "_").replace(/-/g, "_");
    const basePath = path.join(__dirname, `../setupsIA/Zandvoort/GT3/setup_base_${safeCar}.txt`);
    const prompt = fs.readFileSync(basePath, "utf-8");

    const fullPrompt = `
Tu es un ingénieur de course spécialisé en setup dans le simulateur ${game}.
Voici un setup de base pour la voiture ${car} sur le circuit ${track} :

${prompt}

Modifie uniquement les paramètres nécessaires en fonction des éléments suivants :
- Comportement en entrée de virage : ${entryBehavior}
- Comportement en sortie de virage : ${behavior}
- Comportement au freinage : ${brakeBehavior}
- Comportement sur les vibreurs : ${curbBehavior}
- Pression cible à chaud : ${targetPressure} psi
- Météo : ${weather}, Température air : ${tempAir}°C, piste : ${tempTrack}°C
- Type de session : ${sessionType}, durée : ${duration} minutes

Explique uniquement les paramètres à modifier, section par section.
Renvoie les modifications dans ce format exact :

Section : nom_section
- nomParamètre : valeur
- autreParamètre : [valeurs]...

Ne renvoie rien d'autre que les modifications.

Informations supplémentaires données par le client : ${notes || "Aucune"}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Tu es un ingénieur setup ACC/rFactor2." },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.7,
    });

    const modifTxt = completion.choices[0].message.content;
    const timestamp = Date.now();
    const modifPath = path.join(__dirname, `../setupsIA/${track}/modif_${car}_${timestamp}.txt`);
    const finalTxtPath = path.join(__dirname, `../setupsIA/${track}/setup_final_${car}_${track}_${timestamp}.txt`);

    fs.writeFileSync(modifPath, modifTxt, "utf-8");
    injectModifications(basePath, modifPath, finalTxtPath);

    if (game === "Assetto Corsa Competizione") {
      convertTxtToJson(finalTxtPath); // ⬅️ Génère le fichier .json final
    }

    // Sauvegarde en base
    const optimizeReq = new OptimizeRequest({
      game,
      car,
      track,
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
      result: modifTxt,
    });

    await optimizeReq.save();

    // Mail avec le fichier en PJ
    const fileName = `setup_final_${car}_${track}_${timestamp}.${game === "Assetto Corsa Competizione" ? "json" : "svm"}`;
    const filePath = finalTxtPath.replace(".txt", `.${game === "Assetto Corsa Competizione" ? "json" : "svm"}`);

    const client = await Client.findOne({ email });

    const msg = {
      to: email,
      from: "contact@fastlap-engineering.fr",
      subject: "Votre setup personnalisé FastLap",
      html: `
        <p>Bonjour ${client?.civilite || ""} ${client?.prenom || ""} ${client?.nom || ""},</p>
        <p>Voici votre setup personnalisé pour ${car} sur ${track} dans ${game}.</p>
        <p>Merci pour votre confiance !</p>
        <a href="https://www.fastlap-engineering.fr">← Retour à la boutique</a>
      `,
      attachments: [
        {
          content: fs.readFileSync(filePath).toString("base64"),
          filename: fileName,
          type: "text/plain",
          disposition: "attachment",
        },
      ],
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Setup généré et envoyé." });
  } catch (err) {
    console.error("Erreur optimize.js :", err);
    res.status(500).json({ error: "Échec génération setup." });
  }
});

module.exports = router;

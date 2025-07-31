const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const OptimizeRequest = require("../models/OptimizeRequest");

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

    res.json({ reply });
  } catch (err) {
    console.error("Erreur OpenAI :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

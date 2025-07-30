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
    handling,
    brakeBehavior,
    phase,
    weather,
    tempAir,
    tempTrack,
    sessionType,
    duration
  } = req.body;

  // Vérification des champs obligatoires
  if (!game || !car || !track || !handling || !brakeBehavior || !phase || !weather || !tempAir || !tempTrack || !sessionType || !duration) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  try {
    const prompt = `
Tu es un ingénieur en sport automobile expert en ${game}.
Optimise le setup de la voiture ${car} sur le circuit ${track} pour une session de type "${sessionType}" de ${duration} minutes.
Conditions météo : ${weather}, Température air : ${tempAir}°C, piste : ${tempTrack}°C.
Le pilote signale un comportement "${handling}" en "${phase}" de virage, et un comportement "${brakeBehavior}" au freinage.
Fournis des recommandations concrètes et techniques sur les réglages à ajuster (aérodynamique, suspension, pression, différentiel, etc), avec justifications claires.

Réponse concise, directe et sans bavardages inutiles.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const reply = completion.choices[0]?.message?.content || "Pas de réponse générée.";

    // Sauvegarde MongoDB
    await OptimizeRequest.create({
      game,
      car,
      track,
      handling,
      brakeBehavior,
      phase,
      weather,
      tempAir,
      tempTrack,
      sessionType,
      duration,
      aiResponse: reply,
    });

    res.json({ reply });
  } catch (err) {
    console.error("Erreur OpenAI :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const AccessToken = require("../models/AccessToken");
const crypto = require("crypto");

// Route POST /api/access/create
router.post("/create", async (req, res) => {
  const { email, type } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: "Email ou type manquant" });
  }

  if (!["unitaire", "pack5", "illimité"].includes(type)) {
    return res.status(400).json({ error: "Type d'accès invalide" });
  }

  const token = crypto.randomBytes(16).toString("hex");

  let expiresAt = null;
  let remaining = null;

  if (type === "pack5") {
    remaining = 5;
  } else if (type === "illimité") {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
  }

  try {
    const newToken = new AccessToken({
      email,
      token,
      type,
      remaining,
      expiresAt,
    });

    await newToken.save();
    console.log(`✅ Token ${type} généré pour ${email} : ${token}`);

    res.json({ token });
  } catch (err) {
    console.error("❌ Erreur création token :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

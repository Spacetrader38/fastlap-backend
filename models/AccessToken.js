const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  type: { type: String, enum: ['unitaire', 'pack5', 'illimité'], required: true },
  remaining: { type: Number, default: null }, // ex: 5 pour un pack
  expiresAt: { type: Date, default: null },   // ex: pour l’abonnement
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AccessToken', accessTokenSchema);

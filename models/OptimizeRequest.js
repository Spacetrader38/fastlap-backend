const mongoose = require('mongoose');

const OptimizeRequestSchema = new mongoose.Schema({
  game: { type: String, required: true },
  car: { type: String, required: true },
  track: { type: String, required: true },
  behavior: { type: String, required: false },        // Comportement du véhicule
  brakeBehavior: { type: String, required: false },   // Comportement au freinage
  phase: { type: String, required: false },           // Phase du virage concernée
  weather: { type: String, required: true },         // Conditions météo
  tempAir: { type: Number, required: false },         // Température air (°C)
  tempTrack: { type: Number, required: true },       // Température piste (°C)
  sessionType: { type: String, required: true },     // Type de session (qualif/course)
  duration: { type: Number, required: false },        // Durée de session en minutes
  aiResponse: { type: String, required: true },      // Réponse IA
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OptimizeRequest', OptimizeRequestSchema);

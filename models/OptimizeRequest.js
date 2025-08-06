const mongoose = require('mongoose');

const OptimizeRequestSchema = new mongoose.Schema({
  game: { type: String, required: true },
  car: { type: String, required: true },
  track: { type: String, required: true },
  entryBehavior: { type: String, required: false },    // ✅ à ajouter
  behavior: { type: String, required: false },
  brakeBehavior: { type: String, required: false },
  curbBehavior: { type: String, required: false },     // ✅ à ajouter
  targetPressure: { type: String, required: false },   // ✅ à ajouter
  weather: { type: String, required: true },
  tempAir: { type: Number, required: false },
  tempTrack: { type: Number, required: false },
  sessionType: { type: String, required: true },
  duration: { type: Number, required: false },
  notes: { type: String, required: false },            // ✅ à ajouter
  email: { type: String, required: false },            // ✅ à ajouter
  aiResponse: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OptimizeRequest', OptimizeRequestSchema);

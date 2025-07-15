const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cgvAccepted: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);

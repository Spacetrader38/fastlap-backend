const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  date: Date,
  email: String,
  civilite: String,
  nom: String,
  prenom: String,
  adresse: String,
  ville: String,
  codePostal: String,
  telephone: String,
  commande: Array,
  totalHT: String,
  tva: String,
  totalTTC: String
});

module.exports = mongoose.model('Order', orderSchema);

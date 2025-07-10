const Order = require('../models/Order');

await Order.create({
  email,
  civilite,
  nom,
  prenom,
  adresse,
  ville,
  codePostal,
  telephone,
  commande,
  totalHT: totalHT.toFixed(2),
  tva: tva.toFixed(2),
  totalTTC: totalTTC.toFixed(2)
});

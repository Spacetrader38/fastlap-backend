const express = require('express');
const router = express.Router();

let clients = []; // stockage en mémoire, à remplacer par une vraie base plus tard

router.post('/', (req, res) => {
  console.log('Requête POST /api/clientInfo reçue avec body:', req.body);

  try {
    const clientData = req.body;

    // Validation simple des champs obligatoires
    if (!clientData.email) {
      return res.status(400).json({ error: "Email requis" });
    }
    if (!clientData.nom || !clientData.prenom) {
      return res.status(400).json({ error: "Nom et prénom requis" });
    }

    // On peut vérifier que le client n'est pas déjà enregistré (optionnel)
    const exists = clients.some(c => c.email === clientData.email);
    if (exists) {
      return res.status(409).json({ error: "Client déjà enregistré" });
    }

    clients.push(clientData); // sauvegarde en mémoire
    console.log('Client enregistré:', clientData);

    return res.status(201).json({ message: "Infos client enregistrées" });

  } catch (error) {
    console.error('Erreur dans /api/clientInfo:', error);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
});

module.exports = router;

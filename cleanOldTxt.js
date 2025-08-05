const fs = require("fs");
const path = require("path");

// 🔁 Adapter ici si tu changes d’arborescence
const dir = path.join(__dirname, "setupsIA", "Zandvoort", "GT3");

function deleteBadTxtFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      deleteBadTxtFiles(fullPath); // récursif (utile si tu ajoutes GT4, etc.)
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".txt") &&
      entry.name.includes(" ")
    ) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Supprimé : ${entry.name}`);
    }
  }
}

deleteBadTxtFiles(dir);

const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "setupsIA");

function slugifyFileName(name) {
  return name
    .replace(".json", "")            // retirer extension
    .replace(/\s+/g, "_")            // espaces → underscores
    .toLowerCase();                  // tout en minuscule
}

// 🔁 Étape 1 : supprimer tous les anciens .txt
function cleanOldTxtFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanOldTxtFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".txt")) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Supprimé : ${entry.name}`);
    }
  }
}

// 🔁 Étape 2 : convertir tous les .json → .txt à plat avec noms slugifiés
function convertJsonToTxt(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      convertJsonToTxt(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const content = fs.readFileSync(fullPath, "utf-8");

      const baseName = slugifyFileName(entry.name);
      const txtFileName = `${baseName}.txt`;
      const txtPath = path.join(dir, txtFileName);

      fs.writeFileSync(txtPath, content, "utf-8");
      console.log(`✅ Converti : ${entry.name} → ${txtFileName}`);
    }
  }
}

// Exécution
cleanOldTxtFiles(baseDir);
convertJsonToTxt(baseDir);

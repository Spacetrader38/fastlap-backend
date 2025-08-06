const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "setupsIA", "Zandvoort", "GT3");

// 🔁 Fonction récursive pour aplatir un objet JSON
function flattenObject(obj, prefix = "") {
  let result = "";

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === "object" && !Array.isArray(value)) {
      result += `\nSection : ${prefix}${key}\n`;
      result += flattenObject(value, "");
    } else if (Array.isArray(value)) {
      result += `- ${key} : ${value.join(", ")}\n`;
    } else {
      result += `- ${key} : ${value}\n`;
    }
  }

  return result;
}

// 🧹 Supprime tous les .txt existants dans le dossier
function clearTxtFiles() {
  const files = fs.readdirSync(baseDir);
  files.forEach(file => {
    if (file.endsWith(".txt")) {
      fs.unlinkSync(path.join(baseDir, file));
      console.log(`🗑️ Supprimé : ${file}`);
    }
  });
}

// 🔁 Convertit chaque .json en .txt à plat avec noms normalisés
function convertAllSetups() {
  const files = fs.readdirSync(baseDir);

  files.forEach(file => {
    if (file.endsWith(".json")) {
      const jsonPath = path.join(baseDir, file);
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const flatText = flattenObject(data);

      const nameWithoutExt = path.basename(file, ".json");
      const normalizedName = nameWithoutExt.replace(/\s+/g, "_") + ".txt";
      const txtPath = path.join(baseDir, normalizedName);

      fs.writeFileSync(txtPath, flatText, "utf-8");
      console.log(`✅ Converti : ${file} → ${normalizedName}`);
    }
  });
}

// ▶️ Exécution
console.log("🔄 Nettoyage des anciens fichiers .txt...");
clearTxtFiles();

console.log("📄 Conversion des fichiers .json vers .txt à plat...");
convertAllSetups();

console.log("✅ Terminé !");

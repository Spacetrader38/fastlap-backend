const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  let baseData;
  try {
    baseData = JSON.parse(fs.readFileSync(basePath, "utf-8"));
  } catch (err) {
    console.error("❌ Erreur de parsing du setup de base :", err.message);
    throw new Error("Fichier de base illisible ou mal formaté (attendu JSON brut)." );
  }

  const rawModifs = fs.readFileSync(modifsPath, "utf-8");

  // 🔁 Étape 1 : Parser les modifications reçues d’OpenAI
  let currentSection = "";
  const modifications = {};

  rawModifs.split("\n").forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith("Section")) {
      currentSection = line.split(":")[1]?.trim();
      if (currentSection) {
        modifications[currentSection] = {};
      }
    } else if (line.startsWith("-") && currentSection) {
      const content = line.substring(1).split(":");
      if (content.length >= 2) {
        const key = content[0].trim();
        const valueRaw = content.slice(1).join(":").trim();
        try {
          modifications[currentSection][key] = JSON.parse(valueRaw);
        } catch {
          modifications[currentSection][key] = valueRaw;
        }
      }
    }
  });

  // 🔁 Étape 2 : Fusion complète avec le setup de base
  for (const section in modifications) {
    const sectionModifs = modifications[section];

    // Cible dans basicSetup ou advancedSetup
    const target =
      baseData.basicSetup?.[section] !== undefined ? baseData.basicSetup :
      baseData.advancedSetup?.[section] !== undefined ? baseData.advancedSetup :
      baseData.basicSetup;

    if (!target[section]) target[section] = {};

    for (const key in sectionModifs) {
      target[section][key] = sectionModifs[key];
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(baseData, null, 2), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

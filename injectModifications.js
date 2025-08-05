const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  const baseData = JSON.parse(fs.readFileSync(basePath, "utf-8"));
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

  // 🔁 Étape 2 : Injecter les modifications dans la structure JSON
  for (const section in modifications) {
    const sectionModifs = modifications[section];

    // Si la section existe déjà dans baseData, on modifie ses clés
    if (baseData.basicSetup?.[section]) {
      Object.assign(baseData.basicSetup[section], sectionModifs);
    } else if (baseData.advancedSetup?.[section]) {
      Object.assign(baseData.advancedSetup[section], sectionModifs);
    } else {
      // Sinon on ajoute la section dans basicSetup si elle n’existe pas
      if (!baseData.basicSetup) baseData.basicSetup = {};
      baseData.basicSetup[section] = sectionModifs;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(baseData, null, 2), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

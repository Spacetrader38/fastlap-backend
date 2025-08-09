const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  let baseData;
  try {
    const rawBase = fs.readFileSync(basePath, "utf-8").trim();
    baseData = JSON.parse(rawBase);
  } catch (err) {
    console.error("❌ Erreur de parsing du setup de base :", err.message);
    throw new Error("Fichier de base illisible ou mal formaté.");
  }

  const rawModifs = fs.readFileSync(modifsPath, "utf-8");
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

  // Injection dans baseData
  for (const section in modifications) {
    const modifs = modifications[section];
    const target =
      baseData.basicSetup?.[section] !== undefined
        ? baseData.basicSetup
        : baseData.advancedSetup?.[section] !== undefined
        ? baseData.advancedSetup
        : baseData.basicSetup;

    if (!target[section]) target[section] = {};
    Object.assign(target[section], modifs);
  }

  fs.writeFileSync(outputPath, JSON.stringify(baseData, null, 2), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

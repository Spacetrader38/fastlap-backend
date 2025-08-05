const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  const baseLines = fs.readFileSync(basePath, "utf-8").split("\n");
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

  // 🔁 Étape 2 : Injection dans les sections du setup de base
  const sectionRegex = /^\[(.+)]$/;
  let currentSectionName = "";
  const outputLines = [];

  for (let line of baseLines) {
    const match = line.match(sectionRegex);
    if (match) {
      currentSectionName = match[1];
      outputLines.push(line);
      continue;
    }

    const keyValMatch = line.match(/^(\s*"?.+?"?)\s*=\s*(.+)$/); // clé = valeur
    if (
      keyValMatch &&
      currentSectionName &&
      modifications[currentSectionName] &&
      modifications[currentSectionName].hasOwnProperty(keyValMatch[1].trim())
    ) {
      const key = keyValMatch[1].trim();
      const newVal = modifications[currentSectionName][key];
      const formatted = Array.isArray(newVal)
        ? `[ ${newVal.join(", ")} ]`
        : newVal;
      outputLines.push(`${key} = ${formatted}`);
    } else {
      outputLines.push(line); // conserve ligne inchangée
    }
  }

  // 🔁 Étape 3 : Ajoute les sections absentes du fichier de base
  Object.entries(modifications).forEach(([section, params]) => {
    const header = `[${section}]`;
    const alreadyExists = outputLines.some(line => line.trim() === header);
    if (!alreadyExists) {
      outputLines.push(`\n${header}`);
      Object.entries(params).forEach(([key, value]) => {
        const formatted = Array.isArray(value)
          ? `[ ${value.join(", ")} ]`
          : value;
        outputLines.push(`${key} = ${formatted}`);
      });
    }
  });

  fs.writeFileSync(outputPath, outputLines.join("\n"), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

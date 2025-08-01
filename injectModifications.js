const fs = require("fs");
const path = require("path");

// Chemins des fichiers (à adapter selon ton dossier réel)
const baseSetupPath = path.join(__dirname, "setupsIA/Zandvoort/GT3/setup_base_Aston Martin.txt");
const modificationsPath = path.join(__dirname, "modifications_ia.txt");
const outputPath = path.join(__dirname, "setupsIA/Zandvoort/GT3/setup_modified_Aston Martin.txt");

// Charger le fichier de base
let lines = fs.readFileSync(baseSetupPath, "utf-8").split("\n");

// Charger les modifications IA
const rawModifs = fs.readFileSync(modificationsPath, "utf-8");

// Parser les modifications IA
let currentSection = "";
let modifications = {};

rawModifs.split("\n").forEach(line => {
  if (line.startsWith("Section")) {
    currentSection = line.split(":")[1].trim();
    modifications[currentSection] = {};
  } else if (line.startsWith("-")) {
    const [key, value] = line.substring(2).split(":").map(s => s.trim());
    try {
      modifications[currentSection][key] = JSON.parse(value);
    } catch (err) {
      modifications[currentSection][key] = value; // fallback si ce n’est pas un array
    }
  }
});

// Injecter les modifications dans le fichier de base
const sectionRegex = /^\[(.+)]$/;
let currentSectionName = "";
let outputLines = [];

for (let line of lines) {
  const sectionMatch = line.match(sectionRegex);
  if (sectionMatch) {
    currentSectionName = sectionMatch[1];
    outputLines.push(line);
    continue;
  }

  const keyMatch = line.split("=");
  if (keyMatch.length === 2 && modifications[currentSectionName]?.hasOwnProperty(keyMatch[0].trim())) {
    const newVal = modifications[currentSectionName][keyMatch[0].trim()];
    outputLines.push(`${keyMatch[0].trim()} = ${Array.isArray(newVal) ? `[ ${newVal.join(", ")} ]` : newVal}`);
  } else {
    outputLines.push(line);
  }
}

// Sauvegarder le fichier modifié
fs.writeFileSync(outputPath, outputLines.join("\n"), "utf-8");

console.log("✅ Modifications injectées avec succès dans :", outputPath);

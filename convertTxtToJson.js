const fs = require("fs");
const path = require("path");

const txtInputPath = path.join(__dirname, "setupsIA/Zandvoort/GT3/setup_modified_Aston Martin.txt");
const jsonOutputPath = path.join(__dirname, "setupsIA/Zandvoort/GT3/setup_modified_Aston Martin.json");

// Lire le fichier .txt
const lines = fs.readFileSync(txtInputPath, "utf-8").split("\n");

// Préparer l’objet JSON final
let jsonResult = {
  carName: "amr_v8_vantage_gt3", // à adapter dynamiquement plus tard
  basicSetup: {},
  advancedSetup: {},
  trackBopType: 9
};

let currentSection = "";
let targetRef = jsonResult.basicSetup; // on commence par basicSetup
const advancedSections = ["mechanicalBalance", "dampers", "aeroBalance", "drivetrain"]; // sections avancées

for (let line of lines) {
  line = line.trim();

  // Sauter les lignes vides
  if (!line || line.startsWith("#")) continue;

  // Section détectée : [tyres], [alignment], etc.
  const sectionMatch = line.match(/^\[(.+)]$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1];

    // Basculer vers advancedSetup si nécessaire
    if (advancedSections.includes(currentSection)) {
      targetRef = jsonResult.advancedSetup;
    } else {
      targetRef = jsonResult.basicSetup;
    }

    if (!targetRef[currentSection]) targetRef[currentSection] = {};
    continue;
  }

  // Ligne de type clé = valeur
  const [keyRaw, valueRaw] = line.split("=");
  if (!keyRaw || !valueRaw) continue;

  const key = keyRaw.trim();
  let valueStr = valueRaw.trim();

  // Gérer les tableaux (ex: [ 51, 52, 53 ])
  let value;
  if (valueStr.startsWith("[")) {
    try {
      value = JSON.parse(valueStr.replace(/([0-9])\s*,/g, "$1,").replace(/,\s*]/, "]"));
    } catch {
      value = valueStr;
    }
  } else if (!isNaN(valueStr)) {
    value = parseFloat(valueStr);
  } else {
    value = valueStr;
  }

  if (targetRef[currentSection]) {
    targetRef[currentSection][key] = value;
  }
}

// Sauvegarder en .json
fs.writeFileSync(jsonOutputPath, JSON.stringify(jsonResult, null, 2), "utf-8");

console.log("✅ Fichier .json généré :", jsonOutputPath);

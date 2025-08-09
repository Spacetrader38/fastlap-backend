const fs = require("fs");
const path = require("path");

// Dictionnaire de correspondance voiture → carName officiel ACC
const carMap = {
  "Aston Martin": "amr_v8_vantage_gt3",
  "Audi R8 LMS Evo": "audi_r8_lms_evo",
  "Bentley Continentale": "bentley_continental_gt3",
  "BMW M6 GT3": "bmw_m6_gt3",
  "Ferrari 488 GT3 Evo": "ferrari_488_gt3_evo",
  "Ferrari 488 GT3": "ferrari_488_gt3",
  "Honda NSX GT3 Evo": "honda_nsx_gt3_evo",
  "Lamborghini Hura Evo": "lamborghini_huracan_gt3_evo",
  "Lamborghini Huracan": "lamborghini_huracan_gt3",
  "Lexus GT3": "lexus_rc_f_gt3",
  "Mc Laren 720S GT3": "mclaren_720s_gt3",
  "Mercedes AMG GT3 2020": "mercedes_amg_gt3_2020",
  "Mercedes AMG GT3": "mercedes_amg_gt3",
  "Nissan GTR GT3": "nissan_gt_r_nismo_gt3",
  "Porsche 991 GT3 R": "porsche_991_gt3_r",
  "Porsche II 991 GT3 R": "porsche_991_ii_gt3_r"
};

function parseArray(value) {
  return value
    .replace(/\[|\]/g, "")
    .split(",")
    .map(v => {
      const num = parseFloat(v.trim());
      return isNaN(num) ? v.trim() : num;
    });
}

function convertTxtToJson(txtPath) {
  const jsonPath = txtPath.replace(".txt", ".json");

  // Lire le contenu brut du fichier txt
  const rawContent = fs.readFileSync(txtPath, "utf-8").trim();

  // ✅ Si le contenu est déjà un JSON complet, on le garde tel quel
  if (rawContent.startsWith("{") && rawContent.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawContent);
      fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2), "utf-8");
      console.log("✅ Fichier .json généré (déjà complet) :", jsonPath);
      return;
    } catch {
      console.warn("⚠️ Contenu JSON invalide, tentative de parsing TXT...");
    }
  }

  // 🔄 Sinon, on utilise l'ancienne logique pour parser le .txt à plat
  const fileNameParts = path.basename(txtPath, ".txt").split("_");
  const carRaw = fileNameParts.slice(2).join(" ");
  const carKey = Object.keys(carMap).find(name => carRaw.includes(name));
  const carName = carMap[carKey] || "car_unknown";

  const lines = rawContent.split("\n");

  let jsonResult = {
    carName,
    basicSetup: {},
    advancedSetup: {},
    trackBopType: 9
  };

  let currentTopLevel = "";
  let currentSection = "";
  let targetRef = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      if (sectionName === "basicSetup" || sectionName === "advancedSetup") {
        currentTopLevel = sectionName;
        targetRef = jsonResult[currentTopLevel];
        continue;
      } else {
        currentSection = sectionName;
        if (targetRef && !targetRef[currentSection]) {
          targetRef[currentSection] = {};
        }
        continue;
      }
    }

    const [keyRaw, valueRaw] = line.split("=");
    if (!keyRaw || !valueRaw || !currentSection || !targetRef) continue;

    const key = keyRaw.trim();
    const valStr = valueRaw.trim();
    let value;

    if (valStr.startsWith("[")) {
      value = parseArray(valStr);
    } else {
      const parsed = parseFloat(valStr);
      value = isNaN(parsed) ? valStr : parsed;
    }

    if (!targetRef[currentSection]) {
      targetRef[currentSection] = {};
    }
    targetRef[currentSection][key] = value;
  }

  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), "utf-8");
  console.log("✅ Fichier .json généré (converti depuis TXT) :", jsonPath);
}

module.exports = convertTxtToJson;

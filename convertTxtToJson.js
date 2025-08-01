const fs = require("fs");
const path = require("path");

const txtInputPath = path.join(__dirname, "setupsIA/Zandvoort/GT3/setup_modified_Audi R8 LMS Evo.txt");
const jsonOutputPath = txtInputPath.replace(".txt", ".json");

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

// Fonction principale encapsulée
function convertTxtToJson(txtPath) {
  const jsonPath = txtPath.replace(".txt", ".json");

  const fileNameParts = path.basename(txtPath, ".txt").split("_");
  const carRaw = fileNameParts.slice(2).join(" ");
  const carKey = Object.keys(carMap).find(name => carRaw.includes(name));
  const carName = carMap[carKey] || "car_unknown";

  const lines = fs.readFileSync(txtPath, "utf-8").split("\n");

  let jsonResult = {
    carName,
    basicSetup: {},
    advancedSetup: {},
    trackBopType: 9
  };

  let currentSection = "";
  let targetRef = jsonResult.basicSetup;
  const advancedSections = ["mechanicalBalance", "dampers", "aeroBalance", "drivetrain"];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      targetRef = advancedSections.includes(currentSection) ? jsonResult.advancedSetup : jsonResult.basicSetup;
      if (!targetRef[currentSection]) targetRef[currentSection] = {};
      continue;
    }

    const [keyRaw, valueRaw] = line.split("=");
    if (!keyRaw || !valueRaw) continue;

    const key = keyRaw.trim();
    const valStr = valueRaw.trim();
    let value;

    if (valStr.startsWith("[")) {
      try {
        value = JSON.parse(valStr.replace(/([0-9])\s*,/g, "$1,").replace(/,\s*]/, "]"));
      } catch {
        value = valStr;
      }
    } else if (!isNaN(valStr)) {
      value = parseFloat(valStr);
    } else {
      value = valStr;
    }

    if (targetRef[currentSection]) {
      targetRef[currentSection][key] = value;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), "utf-8");
  console.log("✅ Fichier .json généré :", jsonPath);
}

// ⛔ Ne s'exécute que si lancé directement (pas au démarrage Render)
if (require.main === module) {
  convertTxtToJson(txtInputPath);
}
module.exports = convertTxtToJson; // ✅ À AJOUTER
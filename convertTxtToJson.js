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

  const fileNameParts = path.basename(txtPath, ".txt").split("_");
  const carRaw = fileNameParts.slice(2).join(" ");
  const carKey = Object.keys(carMap).find(name => carRaw.includes(name));
  const carName = carMap[carKey] || "car_unknown";

  let jsonResult = {
    carName,
    basicSetup: {},
    advancedSetup: {},
    trackBopType: 9
  };

  const parseFileToJson = (lines, overwrite = true) => {
    let currentSection = "";
    let targetRef = jsonResult.basicSetup;

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;

      const sectionMatch = line.match(/^\[(.+)]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        const isAdvanced = ["mechanicalBalance", "dampers", "aeroBalance", "drivetrain"].includes(currentSection);
        if (isAdvanced) {
          if (!jsonResult.advancedSetup[currentSection]) jsonResult.advancedSetup[currentSection] = {};
          targetRef = jsonResult.advancedSetup[currentSection];
        } else {
          if (!jsonResult.basicSetup[currentSection]) jsonResult.basicSetup[currentSection] = {};
          targetRef = jsonResult.basicSetup[currentSection];
        }
        continue;
      }

      const [keyRaw, valueRaw] = line.split("=");
      if (!keyRaw || !valueRaw || !currentSection || !targetRef) continue;

      const key = keyRaw.trim();
      const valStr = valueRaw.trim();
      let value = valStr.startsWith("[") ? parseArray(valStr) : (isNaN(parseFloat(valStr)) ? valStr : parseFloat(valStr));

      // N'écrase pas les modifs si overwrite = false
      if (!overwrite && targetRef[key] !== undefined) continue;

      targetRef[key] = value;
    }
  };

  // 1️⃣ On parse le fichier modifié (avec overwrite = true)
  const linesMod = fs.readFileSync(txtPath, "utf-8").split("\n");
  parseFileToJson(linesMod, true);

  // 2️⃣ On parse ensuite le fichier setup_base_xxx.txt (avec overwrite = false)
  const basePath = path.join(__dirname, "setupsIA", "Zandvoort", "GT3", `setup_base_${carRaw}.txt`);
  if (fs.existsSync(basePath)) {
    const linesBase = fs.readFileSync(basePath, "utf-8").split("\n");
    parseFileToJson(linesBase, false);
  } else {
    console.warn("⚠️ Fichier de base introuvable :", basePath);
  }

  // 3️⃣ Écriture du fichier final
  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), "utf-8");
  console.log("✅ Fichier .json généré :", jsonPath);
}

if (require.main === module) {
  convertTxtToJson(txtInputPath);
}

module.exports = convertTxtToJson;

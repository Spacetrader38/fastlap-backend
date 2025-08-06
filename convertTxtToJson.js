const fs = require("fs");
const path = require("path");

function convertTxtToJson(txtInputPath, jsonOutputPath) {
  const lines = fs.readFileSync(txtInputPath, "utf-8").split("\n");

  let jsonResult = {
    carName: "amr_v8_vantage_gt3", // tu peux adapter dynamiquement plus tard
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
    let valueStr = valueRaw.trim();
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

  // ✅ Sécurité pression pneus
  try {
    const p = jsonResult.basicSetup?.tyres?.tyrePressure;
    if (Array.isArray(p) && p.some(v => v > 35 || v < 18)) {
      console.warn("🚨 Pression pneus hors plage autorisée. Valeurs ajustées à 27 par défaut.");
      jsonResult.basicSetup.tyres.tyrePressure = [27, 27, 27, 27];
    }
  } catch (e) {
    console.error("Erreur lors du contrôle des pressions pneus :", e);
  }

  fs.writeFileSync(jsonOutputPath, JSON.stringify(jsonResult, null, 2), "utf-8");
  return jsonOutputPath;
}

module.exports = convertTxtToJson;

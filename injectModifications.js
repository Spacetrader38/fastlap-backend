const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  // --- Lecture du fichier de base (format .txt à plat) ---
  const rawBase = fs.readFileSync(basePath, "utf-8").trim();
  const baseLines = rawBase.split("\n");

  let baseData = {};
  let currentTopLevel = "";
  let currentSection = "";

  baseLines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      if (sectionName === "basicSetup" || sectionName === "advancedSetup") {
        currentTopLevel = sectionName;
        if (!baseData[currentTopLevel]) baseData[currentTopLevel] = {};
      } else {
        currentSection = sectionName;
        if (currentTopLevel && !baseData[currentTopLevel][currentSection]) {
          baseData[currentTopLevel][currentSection] = {};
        }
      }
      return;
    }

    const [keyRaw, valueRaw] = line.split("=");
    if (!keyRaw || !valueRaw || !currentSection || !currentTopLevel) return;

    let value;
    const valStr = valueRaw.trim();
    if (valStr.startsWith("[")) {
      value = valStr.replace(/\[|\]/g, "").split(",").map(v => {
        const num = parseFloat(v.trim());
        return isNaN(num) ? v.trim() : num;
      });
    } else {
      const parsed = parseFloat(valStr);
      value = isNaN(parsed) ? valStr : parsed;
    }

    baseData[currentTopLevel][currentSection][keyRaw.trim()] = value;
  });

  // --- Lecture du fichier de modifications OpenAI ---
  const rawModifs = fs.readFileSync(modifsPath, "utf-8");
  let currentModSection = "";
  const modifications = {};

  rawModifs.split("\n").forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith("Section")) {
      currentModSection = line.split(":")[1]?.trim();
      if (currentModSection) modifications[currentModSection] = {};
    } else if (line.startsWith("-") && currentModSection) {
      const content = line.substring(1).split(":");
      if (content.length >= 2) {
        const key = content[0].trim();
        const valueRaw = content.slice(1).join(":").trim();
        try {
          modifications[currentModSection][key] = JSON.parse(valueRaw);
        } catch {
          modifications[currentModSection][key] = valueRaw;
        }
      }
    }
  });

  // --- Injection dans baseData ---
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

  // --- Écriture du fichier final en .txt à plat ---
  let outputTxt = "";
  for (const topLevel of ["basicSetup", "advancedSetup"]) {
    if (!baseData[topLevel]) continue;
    outputTxt += `[${topLevel}]\n`;
    for (const section in baseData[topLevel]) {
      outputTxt += `[${section}]\n`;
      for (const key in baseData[topLevel][section]) {
        let val = baseData[topLevel][section][key];
        if (Array.isArray(val)) {
          val = `[${val.join(", ")}]`;
        }
        outputTxt += `${key}=${val}\n`;
      }
    }
  }

  fs.writeFileSync(outputPath, outputTxt, "utf-8");
  return outputPath;
}

module.exports = injectModifications;

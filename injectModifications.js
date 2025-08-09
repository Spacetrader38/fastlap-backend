const fs = require("fs");
const path = require("path");

function parseValue(valStr) {
  const s = valStr.trim();
  if (s.startsWith("[") && s.endsWith("]")) {
    return s
      .slice(1, -1)
      .split(",")
      .map(v => {
        const t = v.trim();
        const num = Number(t);
        return Number.isNaN(num) ? t : num;
      });
  }
  const num = Number(s);
  return Number.isNaN(num) ? s : num;
}

function parseFlatTxtToObject(txt) {
  const baseData = { basicSetup: {}, advancedSetup: {} };
  let currentTop = "";
  let currentSection = "";

  const lines = txt.split("\n");
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const m = line.match(/^\[(.+)]$/);
    if (m) {
      const name = m[1];
      if (name === "basicSetup" || name === "advancedSetup") {
        currentTop = name;
        if (!baseData[currentTop]) baseData[currentTop] = {};
        currentSection = "";
      } else {
        currentSection = name;
        if (currentTop && !baseData[currentTop][currentSection]) {
          baseData[currentTop][currentSection] = {};
        }
      }
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1 || !currentTop || !currentSection) continue;

    const key = line.slice(0, eq).trim();
    const valStr = line.slice(eq + 1).trim();

    if (key.includes(".")) {
      const [k1, k2] = key.split(".");
      if (!baseData[currentTop][currentSection][k1] || typeof baseData[currentTop][currentSection][k1] !== "object") {
        baseData[currentTop][currentSection][k1] = {};
      }
      baseData[currentTop][currentSection][k1][k2] = parseValue(valStr);
    } else {
      baseData[currentTop][currentSection][key] = parseValue(valStr);
    }
  }

  return baseData;
}

function parseBaseSetupFlexible(rawBase) {
  const trimmed = rawBase.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // si JSON invalide, on tombe sur parsing TXT
    }
  }
  return parseFlatTxtToObject(trimmed);
}

function parseModifications(rawModifs) {
  const modifications = {};
  let currentSection = "";

  rawModifs.split("\n").forEach(line0 => {
    const line = line0.trim();
    if (!line) return;

    if (/^Section\s*:/.test(line)) {
      currentSection = line.split(":")[1]?.trim();
      if (currentSection) modifications[currentSection] = {};
    } else if (line.startsWith("-") && currentSection) {
      const content = line.substring(1).split(":");
      if (content.length >= 2) {
        const key = content[0].trim();
        const valueRaw = content.slice(1).join(":").trim();

        try {
          modifications[currentSection][key] = JSON.parse(valueRaw);
        } catch {
          modifications[currentSection][key] = parseValue(valueRaw);
        }
      }
    }
  });

  return modifications;
}

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  // 1) Lire la base (JSON ou TXT à plat)
  const rawBase = fs.readFileSync(basePath, "utf-8");
  let baseData = parseBaseSetupFlexible(rawBase);

  console.log("[injectModifications] Base setup sections:",
    Object.keys(baseData.basicSetup || {}),
    Object.keys(baseData.advancedSetup || {})
  );

  if (!baseData.basicSetup) baseData.basicSetup = {};
  if (!baseData.advancedSetup) baseData.advancedSetup = {};

  // 2) Lire les modifs OpenAI
  const rawModifs = fs.readFileSync(modifsPath, "utf-8");
  const modifications = parseModifications(rawModifs);

  console.log("[injectModifications] Modifications sections:",
    Object.keys(modifications)
  );

  // 3) Injection
  for (const section in modifications) {
    const modifs = modifications[section];

    const target =
      Object.prototype.hasOwnProperty.call(baseData.basicSetup, section)
        ? baseData.basicSetup
        : Object.prototype.hasOwnProperty.call(baseData.advancedSetup, section)
        ? baseData.advancedSetup
        : baseData.basicSetup;

    if (!target[section]) target[section] = {};
    Object.assign(target[section], modifs);
  }

  // 4) Log final complet avant sauvegarde
  console.log("[injectModifications] Final setup JSON complet:");
  console.log(JSON.stringify(baseData, null, 2));

  // 5) Écrire le résultat final
  fs.writeFileSync(outputPath, JSON.stringify(baseData, null, 2), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

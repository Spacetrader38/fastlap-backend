const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "setupsIA", "Zandvoort", "GT3");

function slugifyFileName(name) {
  return name.replace(".json", "").replace(/\s+/g, "_").toLowerCase();
}

function flattenObject(obj, prefix = "") {
  const lines = [];
  for (const key in obj) {
    const value = obj[key];
    if (Array.isArray(value)) {
      lines.push(`${key} = [ ${value.join(", ")} ]`);
    } else if (typeof value === "object" && value !== null) {
      lines.push(`[${key}]`);
      lines.push(...flattenObject(value, key));
    } else {
      lines.push(`${key} = ${value}`);
    }
  }
  return lines;
}

function deleteOldTxtFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      deleteOldTxtFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".txt")) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Supprimé : ${entry.name}`);
    }
  }
}

function convertJsonToFlatTxtRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      convertJsonToFlatTxtRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const jsonRaw = fs.readFileSync(fullPath, "utf-8");
      let json;
      try {
        json = JSON.parse(jsonRaw);
      } catch (err) {
        console.error(`❌ Erreur de parsing : ${entry.name}`);
        continue;
      }

      const flatLines = [];

      if (json.basicSetup) {
        flatLines.push(`[basicSetup]`);
        flatLines.push(...flattenObject(json.basicSetup));
      }
      if (json.advancedSetup) {
        flatLines.push(`[advancedSetup]`);
        flatLines.push(...flattenObject(json.advancedSetup));
      }
      if (json.trackBopType !== undefined) {
        flatLines.push(`trackBopType = ${json.trackBopType}`);
      }

      const baseName = slugifyFileName(entry.name);
      const txtFileName = `${baseName}.txt`;
      const txtPath = path.join(dir, txtFileName);

      fs.writeFileSync(txtPath, flatLines.join("\n"), "utf-8");
      console.log(`✅ Converti (à plat) : ${entry.name} → ${txtFileName}`);
    }
  }
}

// 🧹 Supprime les anciens .txt avant conversion
deleteOldTxtFiles(baseDir);

// 🚀 Lance la conversion
convertJsonToFlatTxtRecursively(baseDir);

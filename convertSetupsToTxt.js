const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "setupsIA");

function slugifyFileName(name) {
  return name
    .replace(".json", "")            // retirer extension
    .replace(/\s+/g, "_")            // espaces → underscores
    .toLowerCase();                  // tout en minuscule
}

function convertToTxtRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      convertToTxtRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Renommage avec format slugifié
      const baseName = slugifyFileName(entry.name);
      const txtFileName = `${baseName}.txt`;
      const txtPath = path.join(dir, txtFileName);

      fs.writeFileSync(txtPath, content, "utf-8");
      console.log(`✅ Converti : ${entry.name} → ${txtFileName}`);
    }
  }
}

convertToTxtRecursively(baseDir);

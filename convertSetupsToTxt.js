const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "setupsIA");

function convertToTxtRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      convertToTxtRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const txtPath = fullPath.replace(".json", ".txt");
      const content = fs.readFileSync(fullPath, "utf-8");
      fs.writeFileSync(txtPath, content, "utf-8");
      console.log(`✅ Converti : ${entry.name} → ${path.basename(txtPath)}`);
    }
  }
}

convertToTxtRecursively(baseDir);

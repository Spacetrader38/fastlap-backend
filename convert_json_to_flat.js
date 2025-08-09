const fs = require("fs");
const path = require("path");

// Dossier cible
const TARGET_DIR = path.resolve(__dirname, "setupsIA/Zandvoort/GT3");

// Convertit un objet JS (setup ACC) -> texte "à plat"
function toFlatTxt(setupObj) {
  let out = "";

  const writeTop = (topKey) => {
    const top = setupObj[topKey];
    if (!top || typeof top !== "object") return;
    out += `[${topKey}]\n`;

    for (const section of Object.keys(top)) {
      const secVal = top[section];
      if (!secVal || typeof secVal !== "object") continue;

      out += `[${section}]\n`;
      for (const key of Object.keys(secVal)) {
        const v = secVal[key];
        if (Array.isArray(v)) {
          out += `${key}=[${v.join(", ")}]\n`;
        } else if (v !== null && typeof v === "object") {
          for (const subKey of Object.keys(v)) {
            const sv = v[subKey];
            out += `${key}.${subKey}=${Array.isArray(sv) ? `[${sv.join(", ")}]` : sv}\n`;
          }
        } else {
          out += `${key}=${v}\n`;
        }
      }
    }
    out += `\n`;
  };

  writeTop("basicSetup");
  writeTop("advancedSetup");
  return out.trim() + "\n";
}

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error("Dossier introuvable :", TARGET_DIR);
    process.exit(1);
  }

  const all = fs.readdirSync(TARGET_DIR);

  // 1) Supprimer TOUS les .txt
  for (const name of all) {
    if (path.extname(name).toLowerCase() === ".txt") {
      fs.unlinkSync(path.join(TARGET_DIR, name));
    }
  }
  console.log("🧹 Tous les fichiers .txt ont été supprimés.");

  // 2) Lister UNIQUEMENT les .json
  const jsonFiles = fs.readdirSync(TARGET_DIR)
    .filter((n) => path.extname(n).toLowerCase() === ".json");

  if (jsonFiles.length === 0) {
    console.log("Aucun .json trouvé. Rien à convertir.");
    return;
  }

  // 3) Convertir chaque .json -> .txt à plat
  for (const name of jsonFiles) {
    const abs = path.join(TARGET_DIR, name);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(abs, "utf-8"));
    } catch (e) {
      console.warn("⚠️ JSON invalide, ignoré :", name);
      continue;
    }

    // Forcer les underscores dans le nom de sortie
    const baseNoExt = path
      .basename(name, path.extname(name))
      .replace(/\s+/g, "_");

    const outPath = path.join(TARGET_DIR, `${baseNoExt}.txt`);

    const flat = toFlatTxt(data);
    fs.writeFileSync(outPath, flat, "utf-8");
    console.log("✅ Généré :", path.basename(outPath));
  }

  console.log("✨ Conversion terminée.");
}

main();

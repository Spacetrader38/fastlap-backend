// backend/scripts/convert_json_to_flat.js
const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.resolve(__dirname, "../setupsIA/Zandvoort/GT3");

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
          // Sous-objets profonds non attendus en ACC -> on tente un aplatissement simple clé=val
          // (peu probable, mais sécurise le script)
          for (const subKey of Object.keys(v)) {
            const sv = v[subKey];
            out += `${key}.${subKey}=${Array.isArray(sv) ? `[${sv.join(", ")}]` : sv}\n`;
          }
        } else {
          out += `${key}=${v}\n`;
        }
      }
    }
    // ligne vide pour lisibilité entre top-levels
    out += `\n`;
  };

  writeTop("basicSetup");
  writeTop("advancedSetup");
  return out.trim() + "\n";
}

// Détecte si un contenu texte est JSON
function looksLikeJson(txt) {
  const t = txt.trim();
  return t.startsWith("{") && t.endsWith("}");
}

// Lit un fichier en essayant JSON si besoin
function readSetupAsJson(absPath) {
  const raw = fs.readFileSync(absPath, "utf-8");
  if (!looksLikeJson(raw)) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error("Dossier introuvable :", TARGET_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(TARGET_DIR);
  const sources = [];

  // 1) Collecter les sources JSON (fichiers .json OU .txt contenant du JSON)
  for (const name of files) {
    const abs = path.join(TARGET_DIR, name);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    if (ext === ".json" || ext === ".txt") {
      const asJson = readSetupAsJson(abs);
      if (asJson) {
        sources.push({ name, abs, json: asJson });
      }
    }
  }

  if (sources.length === 0) {
    console.log("Aucune source JSON trouvée (.json ou .txt contenant du JSON). Rien à faire.");
    return;
  }

  // 2) Supprimer tous les anciens .txt du dossier
  for (const name of files) {
    if (path.extname(name).toLowerCase() === ".txt") {
      fs.unlinkSync(path.join(TARGET_DIR, name));
    }
  }
  console.log("🧹 Anciens .txt supprimés.");

  // 3) Générer les .txt à plat
  for (const src of sources) {
    // Nom de sortie : conserve le basename mais force l'extension .txt
    const baseNoExt = path.basename(src.name, path.extname(src.name));
    const outName = `${baseNoExt}.txt`;
    const outPath = path.join(TARGET_DIR, outName);

    const flat = toFlatTxt(src.json);
    fs.writeFileSync(outPath, flat, "utf-8");
    console.log("✅ Généré :", outName);
  }

  console.log("✨ Conversion terminée.");
}

main();

const fs = require("fs");
const path = require("path");

function injectModifications(basePath, modifsPath, outputPath) {
  if (!fs.existsSync(basePath) || !fs.existsSync(modifsPath)) {
    throw new Error("Fichier de base ou de modifications manquant.");
  }

  const baseLines = fs.readFileSync(basePath, "utf-8").split("\n");
  const rawModifs = fs.readFileSync(modifsPath, "utf-8");

  let currentSection = "";
  const modifications = {};

  rawModifs.split("\n").forEach(line => {
    if (line.startsWith("Section")) {
      currentSection = line.split(":")[1]?.trim();
      if (currentSection) {
        modifications[currentSection] = {};
      }
    } else if (line.startsWith("-") && currentSection) {
      const content = line.substring(2).split(":");
      if (content.length >= 2) {
        const key = content[0].trim();
        const value = content.slice(1).join(":").trim();
        try {
          modifications[currentSection][key] = JSON.parse(value);
        } catch {
          modifications[currentSection][key] = value;
        }
      }
    }
  });

  const sectionRegex = /^\[(.+)]$/;
  let currentSectionName = "";
  const outputLines = [];

  for (let line of baseLines) {
    const match = line.match(sectionRegex);
    if (match) {
      currentSectionName = match[1];
      outputLines.push(line);
      continue;
    }

    const [key, val] = line.split("=");
    if (
      key &&
      modifications[currentSectionName] &&
      modifications[currentSectionName].hasOwnProperty(key.trim())
    ) {
      const newVal = modifications[currentSectionName][key.trim()];
      outputLines.push(
        `${key.trim()} = ${Array.isArray(newVal) ? `[ ${newVal.join(", ")} ]` : newVal}`
      );
    } else {
      outputLines.push(line);
    }
  }

  fs.writeFileSync(outputPath, outputLines.join("\n"), "utf-8");
  return outputPath;
}

module.exports = injectModifications;

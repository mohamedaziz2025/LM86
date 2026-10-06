#!/usr/bin/env node
// Cree ou remplace le compte admin (data/admin.json).
// Usage interactif : npm run create-admin
// Usage "seed" non-interactif (utile en script/CI/deploiement) :
//   ADMIN_USER=admin ADMIN_PASSWORD=motdepasse npm run create-admin
"use strict";
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const FICHIER_ADMIN = path.join(__dirname, "..", "data", "admin.json");

function demander(rl, question, { masque = false } = {}) {
  return new Promise((resolve) => {
    if (!masque) {
      rl.question(question, resolve);
      return;
    }
    // saisie masquee pour le mot de passe (mode "raw" sur stdin)
    const stdin = process.stdin;
    process.stdout.write(question);
    let saisie = "";
    const onData = (buf) => {
      const char = buf.toString("utf8");
      if (char === "\n" || char === "\r") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(saisie);
        return;
      }
      if (char === "\u0003") { process.exit(1); } // Ctrl+C
      if (char === "\u007f" || char === "\b") { saisie = saisie.slice(0, -1); return; } // backspace
      saisie += char;
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function enregistrer(identifiant, motDePasse) {
  if (!motDePasse || motDePasse.length < 8) {
    console.error("\nMot de passe trop court (8 caracteres minimum). Annule.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(motDePasse, 12);
  fs.mkdirSync(path.dirname(FICHIER_ADMIN), { recursive: true });
  fs.writeFileSync(FICHIER_ADMIN, JSON.stringify({ identifiant, motDePasseHash: hash }, null, 2));
  console.log(`\nCompte admin enregistre dans ${path.relative(process.cwd(), FICHIER_ADMIN)}`);
}

(async () => {
  // mode "seed" non-interactif si les variables d'environnement sont fournies
  if (process.env.ADMIN_PASSWORD) {
    const identifiant = process.env.ADMIN_USER || "admin";
    await enregistrer(identifiant, process.env.ADMIN_PASSWORD);
    console.log("Tu peux maintenant lancer le serveur avec: npm start");
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("=== Creation du compte admin LM86 Services ===\n");
  const identifiant = (await demander(rl, "Identifiant admin (defaut: admin) : ")) || "admin";
  const motDePasse = await demander(rl, "Mot de passe (min. 8 caracteres) : ", { masque: true });

  await enregistrer(identifiant, motDePasse);
  console.log("Tu peux maintenant lancer le serveur avec: npm start");
  rl.close();
  process.exit(0);
})();

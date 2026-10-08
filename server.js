#!/usr/bin/env node
// Serveur LM86 Services : sert le site public + une API de contenu +
// un back-office admin protege par mot de passe (session cookie).
"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const bcrypt = require("bcryptjs");
const multer = require("multer");

const RACINE = __dirname;
const FICHIER_CONTENU = path.join(RACINE, "data", "content.json");
const FICHIER_ADMIN = path.join(RACINE, "data", "admin.json");
const DOSSIER_SESSIONS = path.join(RACINE, "data", "sessions");
const DOSSIER_IMAGES = path.join(RACINE, "public", "images");
const PORT = process.env.PORT || 3000;

fs.mkdirSync(DOSSIER_SESSIONS, { recursive: true });
fs.mkdirSync(DOSSIER_IMAGES, { recursive: true });

// ------------------------------------------------------------------
// petites aides fichier
// ------------------------------------------------------------------
function lireJSON(fichier, defaut) {
  try {
    return JSON.parse(fs.readFileSync(fichier, "utf8"));
  } catch (e) {
    return defaut;
  }
}

function ecrireJSONAtomique(fichier, donnees) {
  const tmp = fichier + ".tmp-" + crypto.randomBytes(4).toString("hex");
  fs.writeFileSync(tmp, JSON.stringify(donnees, null, 2));
  fs.renameSync(tmp, fichier);
}

function admin() {
  return lireJSON(FICHIER_ADMIN, null);
}

// ------------------------------------------------------------------
// app
// ------------------------------------------------------------------
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));

const secretSession =
  process.env.SESSION_SECRET ||
  (() => {
    // secret genere une fois et persiste sur disque (dev local uniquement)
    const f = path.join(RACINE, "data", "session-secret.txt");
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
    const s = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(f, s);
    return s;
  })();

app.use(
  session({
    store: new FileStore({ path: DOSSIER_SESSIONS, logFn: () => {} }),
    secret: secretSession,
    name: "lm86.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

// limiteur de tentatives de connexion tres simple (anti brute-force local)
const tentatives = new Map(); // ip -> { n, depuis }
function trouveTropDeTentatives(ip) {
  const e = tentatives.get(ip);
  if (!e) return false;
  if (Date.now() - e.depuis > 15 * 60 * 1000) { tentatives.delete(ip); return false; }
  return e.n >= 8;
}
function enregistrerEchec(ip) {
  const e = tentatives.get(ip) || { n: 0, depuis: Date.now() };
  e.n += 1;
  tentatives.set(ip, e);
}
function reinitialiserTentatives(ip) {
  tentatives.delete(ip);
}

function exigerAuth(req, res, next) {
  if (req.session && req.session.connecte) return next();
  return res.status(401).json({ erreur: "Non authentifie." });
}

// variante pour une navigation de page (pas un appel fetch/API) :
// on redirige vers l'ecran de connexion plutot que de renvoyer du JSON brut.
function exigerAuthPage(req, res, next) {
  if (req.session && req.session.connecte) return next();
  return res.redirect("/admin/index.html");
}

// ------------------------------------------------------------------
// API contenu (public en lecture, protege en ecriture)
// ------------------------------------------------------------------
app.get("/api/content", (req, res) => {
  const contenu = lireJSON(FICHIER_CONTENU, {});
  res.set("Cache-Control", "no-store");
  res.json(contenu);
});

app.put("/api/content", exigerAuth, (req, res) => {
  const corps = req.body;
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) {
    return res.status(400).json({ erreur: "Contenu invalide." });
  }
  try {
    ecrireJSONAtomique(FICHIER_CONTENU, corps);
    res.json({ ok: true, contenu: corps });
  } catch (e) {
    res.status(500).json({ erreur: "Echec de l'enregistrement." });
  }
});

// ------------------------------------------------------------------
// API auth
// ------------------------------------------------------------------
app.get("/api/session", (req, res) => {
  res.json({ connecte: !!(req.session && req.session.connecte), identifiant: req.session?.identifiant || null });
});

app.post("/api/login", async (req, res) => {
  const ip = req.ip;
  if (trouveTropDeTentatives(ip)) {
    return res.status(429).json({ erreur: "Trop de tentatives. Reessaie dans quelques minutes." });
  }

  const compte = admin();
  if (!compte) {
    return res.status(400).json({ erreur: "Aucun compte admin configure. Lance: npm run create-admin" });
  }

  const { identifiant, motDePasse } = req.body || {};
  if (typeof identifiant !== "string" || typeof motDePasse !== "string") {
    return res.status(400).json({ erreur: "Identifiant et mot de passe requis." });
  }

  const identifiantOk = identifiant === compte.identifiant;
  const motDePasseOk = await bcrypt.compare(motDePasse, compte.motDePasseHash).catch(() => false);

  if (!identifiantOk || !motDePasseOk) {
    enregistrerEchec(ip);
    return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect." });
  }

  reinitialiserTentatives(ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ erreur: "Erreur serveur." });
    req.session.connecte = true;
    req.session.identifiant = compte.identifiant;
    res.json({ ok: true });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ------------------------------------------------------------------
// upload d'images (admin uniquement)
// ------------------------------------------------------------------
const stockageUpload = multer.diskStorage({
  destination: DOSSIER_IMAGES,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extsAutorisees = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
    if (!extsAutorisees.includes(ext)) return cb(new Error("Format d'image non autorise."));
    const nom = "photo-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext;
    cb(null, nom);
  },
});
const upload = multer({
  storage: stockageUpload,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Fichier non image refuse."));
    cb(null, true);
  },
});

// accepte un ou plusieurs fichiers sous le meme champ "image"
// (input multiple -> une seule requete, reponse avec la liste des chemins)
const MESSAGES_MULTER = {
  LIMIT_FILE_COUNT: "Trop de fichiers : 20 photos maximum par envoi.",
  LIMIT_UNEXPECTED_FILE: "Trop de fichiers : 20 photos maximum par envoi.",
  LIMIT_FILE_SIZE: "Image trop volumineuse : 8 Mo maximum par photo.",
  LIMIT_PART_COUNT: "Requete d'envoi invalide.",
  LIMIT_FIELD_COUNT: "Requete d'envoi invalide.",
  LIMIT_FIELD_VALUE: "Requete d'envoi invalide.",
  LIMIT_FIELD_SIZE: "Requete d'envoi invalide.",
};
app.post("/api/upload", exigerAuth, (req, res) => {
  upload.array("image", 20)(req, res, (err) => {
    if (err) return res.status(400).json({ erreur: MESSAGES_MULTER[err.code] || err.message });
    const fichiers = req.files || [];
    if (!fichiers.length) return res.status(400).json({ erreur: "Aucun fichier recu." });
    const chemins = fichiers.map((f) => "images/" + f.filename);
    res.json({ ok: true, chemin: chemins[0], chemins: chemins });
  });
});

// ------------------------------------------------------------------
// fichiers statiques
// ------------------------------------------------------------------
// le dossier admin/ n'est jamais servi sans verification de session pour
// dashboard.html (la page de login, elle, reste publique).
app.get("/admin/dashboard.html", exigerAuthPage, (req, res) => {
  res.sendFile(path.join(RACINE, "admin", "dashboard.html"));
});
// jamais de cache sur l'admin : un admin.js rafraichi apres un correctif
// doit etre recharge sans rechargement force du navigateur.
app.use("/admin", express.static(path.join(RACINE, "admin"), {
  setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
}));
app.use(express.static(path.join(RACINE, "public")));

// ------------------------------------------------------------------
// erreurs -> TOUJOURS du JSON pour l'API.
// Sans ca, Express renvoie une page HTML (text/html) et le front plante
// sur r.json() avec "The string did not match the expected pattern".
// ------------------------------------------------------------------
app.use("/api", (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  let message;
  if (err.type === "entity.too.large") message = "Contenu trop volumineux.";
  else if (err.type === "entity.parse.failed") message = "Corps JSON invalide.";
  else if (status >= 500) message = "Erreur interne du serveur.";
  else message = err.message || "Requete invalide.";
  res.status(status).json({ erreur: message });
});

app.listen(PORT, () => {
  console.log(`LM86 Services en ligne sur http://localhost:${PORT}`);
  console.log(`Admin : http://localhost:${PORT}/admin`);
  if (!admin()) {
    console.log("\n⚠️  Aucun compte admin trouve. Lance d'abord: npm run create-admin\n");
  }
});

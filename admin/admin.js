/* ==================================================================
   Tableau de bord admin — sidebar + pages, formulaire genere a partir
   de la forme de data/content.json, modifications envoyees via l'API.
   ================================================================== */
(function () {
  "use strict";

  var contenuCourant = null;
  var lecteursSection = {};

  // ordre d'affichage dans la sidebar (independant de l'ordre des cles
  // dans le JSON, pour suivre l'ordre logique des sections de la page)
  var ORDRE_SECTIONS = ["hero", "badges", "garanties", "services", "tarifs", "apropos", "avis", "urgence", "footer", "telephone", "galerie", "images"];

  var LIBELLES_SECTION = {
    telephone: "Téléphone",
    hero: "Hero (bandeau principal)",
    badges: "Badges & accroches",
    garanties: "Garanties",
    services: "Services proposés",
    tarifs: "Prestations & tarifs",
    apropos: "À propos",
    avis: "Avis clients",
    urgence: "Bloc urgence",
    footer: "Pied de page",
    galerie: "Galerie complète",
    images: "Photos du site",
  };

  var LIBELLES_CHAMP = {
    eyebrow: "Petit texte au-dessus du titre",
    titre: "Titre",
    accent: "Mot mis en couleur",
    sousTitre: "Sous-titre",
    intro: "Texte d'introduction",
    items: "Liste des prestations",
    paragraphe1: "1er paragraphe",
    paragraphe2: "2e paragraphe",
    valeurs: "Arguments (liste)",
    stats: "Chiffres clés",
    chiffre: "Chiffre",
    unite: "Unité (ex: j/7, h/24)",
    legende: "Légende",
    etoiles: "Étoiles (1 à 5)",
    texte: "Texte de l'avis",
    auteur: "Auteur",
    exemple: "Avis d'exemple (a decocher pour un vrai avis)",
    image: "Image",
    categorie: "Catégorie",
    copyright: "Texte de copyright",
    tce: "Texte badge « Corps d'état »",
    d48h: "Texte badge « Devis 48h »",
    tceTitre: "Titre garantie corps d'état",
    tceTexte: "Texte garantie corps d'état",
    devisTitre: "Titre garantie devis",
    devisTexte: "Texte garantie devis",
    nom: "Nom / titre",
    prefixe: "Texte avant le prix",
    prix: "Prix",
    duree: "Durée estimée",
    badge: "Badge (ex: LE PLUS DEMANDÉ)",
    disponible: "Disponible",
    ordre: "Ordre d'affichage",
    actif: "Actif",
    icone: "Icône",
  };

  function libelle(cle) {
    return LIBELLES_CHAMP[cle] || cle;
  }

  // ------------------------------------------------------------------
  // lecture de reponse : on lit le texte puis on parse a la main, car
  // r.json() sur une reponse non-JSON (HTML d'erreur, 413 proxied...)
  // leve "The string did not match the expected pattern" sur Safari.
  // ------------------------------------------------------------------
  function lireReponse(r) {
    return r.text().then(function (txt) {
      var d = null;
      try { d = JSON.parse(txt); } catch (e) { d = null; }
      return { ok: r.ok, status: r.status, d: d };
    });
  }

  function messageErreur(res, defaut) {
    if (res.d && typeof res.d.erreur === "string") return res.d.erreur;
    if (res.status === 401) return "Session expirée, reconnecte-toi.";
    if (res.status === 413) return "Fichiers trop volumineux pour le serveur (HTTP 413).";
    if (res.status >= 500) return "Erreur serveur (HTTP " + res.status + ").";
    if (res.status) return defaut + " (HTTP " + res.status + ")";
    return defaut;
  }

  // ------------------------------------------------------------------
  // session
  // ------------------------------------------------------------------
  fetch("/api/session")
    .then(lireReponse)
    .then(function (s) {
      if (!s.ok || !s.d || !s.d.connecte) { window.location.href = "index.html"; return; }
      charger();
    })
    .catch(function () { window.location.href = "index.html"; });

  document.getElementById("boutonDeconnexion").addEventListener("click", function () {
    fetch("/api/logout", { method: "POST" }).then(function () {
      window.location.href = "index.html";
    });
  });

  // ------------------------------------------------------------------
  // menu burger (mobile) : ouvre/ferme le tiroir logo -> onglets + deconnexion
  // ------------------------------------------------------------------
  (function menuBurger() {
    var burger = document.getElementById("sideBurger");
    var tiroir = document.getElementById("sideDrawer");
    if (!burger || !tiroir) return;
    function fermer() {
      tiroir.classList.remove("ouvert");
      burger.setAttribute("aria-expanded", "false");
    }
    burger.addEventListener("click", function () {
      var ouvert = tiroir.classList.toggle("ouvert");
      burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
    });
    // ferme le tiroir des qu'on choisit une section (delegation, car les
    // boutons de #sideNav sont generes dynamiquement plus tard)
    tiroir.addEventListener("click", function (e) {
      if (e.target.closest("#sideNav button")) fermer();
    });
  })();

  function charger() {
    fetch("/api/content")
      .then(lireReponse)
      .then(function (res) {
        if (!res.ok || !res.d) throw new Error(messageErreur(res, "Chargement impossible."));
        contenuCourant = res.d;
        construireFormulaire(res.d);
      })
      .catch(function (err) {
        afficherStatut("Erreur : " + (err.message || "chargement impossible."), "erreur");
      });
  }

  // ------------------------------------------------------------------
  // sidebar + pages
  // ------------------------------------------------------------------
  function construireFormulaire(d) {
    var sideNav = document.getElementById("sideNav");
    var conteneur = document.getElementById("conteneur");
    sideNav.innerHTML = "";
    conteneur.innerHTML = "";
    lecteursSection = {};

    var cles = ORDRE_SECTIONS.filter(function (c) { return c in d || c === "images"; });

    cles.forEach(function (cle) {
      // bouton de la sidebar
      var bouton = document.createElement("button");
      bouton.type = "button";
      bouton.dataset.page = cle;
      bouton.textContent = LIBELLES_SECTION[cle] || cle;
      bouton.addEventListener("click", function () { activerPage(cle); });
      sideNav.appendChild(bouton);

      // section de contenu correspondante
      var page = document.createElement("section");
      page.className = "page-section carte-admin";
      page.dataset.page = cle;

      if (cle === "galerie") {
        var controleGalerie = construireSectionGalerie(page, d.galerie || []);
        page.appendChild(controleGalerie.el);
        lecteursSection[cle] = controleGalerie.lire;
      } else if (cle === "images") {
        construireSectionImages(page, d.images || {});
      } else {
        var pasAjoutSuppression = false;
        var controle = creerControle(d[cle], cle, { editable: !pasAjoutSuppression });
        page.appendChild(controle.el);
        lecteursSection[cle] = controle.lire;
      }
      conteneur.appendChild(page);
    });

    var depart = localStorage.getItem("lm86AdminPage");
    if (!depart || cles.indexOf(depart) === -1) depart = cles[0];
    activerPage(depart);
  }

  function activerPage(cle) {
    document.querySelectorAll(".side-nav button").forEach(function (b) {
      b.classList.toggle("actif", b.dataset.page === cle);
    });
    document.querySelectorAll(".page-section").forEach(function (s) {
      s.classList.toggle("actif", s.dataset.page === cle);
    });
    document.getElementById("titrePage").textContent = LIBELLES_SECTION[cle] || cle;
    localStorage.setItem("lm86AdminPage", cle);
  }

  function creerControle(valeur, cle, opts) {
    opts = opts || {};
    var editable = opts.editable !== false;

    if (typeof valeur === "string") {
      var multiligne = valeur.length > 70 || valeur.indexOf("<br>") !== -1;

      if (cle === "icone") {
        var sel = document.createElement("select");
        sel.className = "champ";
        [["eau", "Plomberie (eau)"], ["elec", "Électricité (elec)"], ["autre", "Autre"]].forEach(function (o) {
          var opt = document.createElement("option");
          opt.value = o[0]; opt.textContent = o[1];
          if (valeur === o[0]) opt.selected = true;
          sel.appendChild(opt);
        });
        return envelopperChamp(cle, sel, function () { return sel.value; });
      }

      var champ = document.createElement(multiligne ? "textarea" : "input");
      if (!multiligne) champ.type = "text";
      champ.className = "champ";
      champ.value = valeur;
      return envelopperChamp(cle, champ, function () { return champ.value; });
    }

    if (typeof valeur === "number") {
      var champN = document.createElement("input");
      champN.type = "number";
      champN.className = "champ champ-nombre";
      champN.value = valeur;
      return envelopperChamp(cle, champN, function () { return Number(champN.value) || 0; });
    }

    if (typeof valeur === "boolean") {
      var wrap = document.createElement("label");
      wrap.className = "case-a-cocher";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = valeur;
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(" " + libelle(cle)));
      return { el: wrap, lire: function () { return cb.checked; } };
    }

    if (Array.isArray(valeur)) {
      return creerControleListe(valeur, cle, editable);
    }

    if (valeur && typeof valeur === "object") {
      return creerControleObjet(valeur);
    }

    var champF = document.createElement("input");
    champF.className = "champ";
    champF.value = String(valeur == null ? "" : valeur);
    return envelopperChamp(cle, champF, function () { return champF.value; });
  }

  function envelopperChamp(cle, champEl, lireFn) {
    var conteneur = document.createElement("div");
    conteneur.className = "ligne-champ";
    var label = document.createElement("label");
    label.textContent = libelle(cle);
    conteneur.appendChild(label);
    conteneur.appendChild(champEl);
    return { el: conteneur, lire: lireFn };
  }

  function creerControleObjet(obj) {
    var conteneur = document.createElement("div");
    conteneur.className = "groupe-objet";
    var lecteurs = {};
    Object.keys(obj).forEach(function (sousCle) {
      var c = creerControle(obj[sousCle], sousCle, {});
      conteneur.appendChild(c.el);
      lecteurs[sousCle] = c.lire;
    });
    return {
      el: conteneur,
      lire: function () {
        var res = {};
        Object.keys(lecteurs).forEach(function (k) { res[k] = lecteurs[k](); });
        return res;
      },
    };
  }

  function valeurVideCommeItem(liste) {
    if (!liste.length) return "";
    var ex = liste[0];
    if (typeof ex === "object" && ex !== null && !Array.isArray(ex)) {
      var vide = {};
      Object.keys(ex).forEach(function (k) {
        var t = typeof ex[k];
        vide[k] = t === "number" ? 0 : t === "boolean" ? false : "";
      });
      return vide;
    }
    if (typeof ex === "number") return 0;
    return "";
  }

  function creerControleListe(liste, cle, editable) {
    var conteneur = document.createElement("div");
    var itemsWrap = document.createElement("div");
    conteneur.appendChild(itemsWrap);
    var lecteursItems = [];

    function ajouterItem(valeurItem) {
      var interieur = creerControle(valeurItem, cle, {});
      var bloc = document.createElement("div");
      bloc.className = "item-liste";
      bloc.appendChild(interieur.el);

      if (editable) {
        var boutonSupprimer = document.createElement("button");
        boutonSupprimer.type = "button";
        boutonSupprimer.className = "bouton-mini danger bouton-supprimer";
        boutonSupprimer.textContent = "Supprimer";
        boutonSupprimer.addEventListener("click", function () {
          if (!confirm("Supprimer cet élément ?")) return;
          var idx = lecteursItems.indexOf(entree);
          if (idx > -1) lecteursItems.splice(idx, 1);
          bloc.remove();
        });
        bloc.appendChild(boutonSupprimer);
      }

      var entree = interieur.lire;
      lecteursItems.push(entree);
      itemsWrap.appendChild(bloc);
    }

    liste.forEach(ajouterItem);

    if (editable) {
      var boutonAjouter = document.createElement("button");
      boutonAjouter.type = "button";
      boutonAjouter.className = "bouton-mini bouton-ajouter";
      boutonAjouter.textContent = "+ Ajouter";
      boutonAjouter.addEventListener("click", function () {
        ajouterItem(valeurVideCommeItem(liste));
      });
      conteneur.appendChild(boutonAjouter);
    }

    return {
      el: conteneur,
      lire: function () { return lecteursItems.map(function (f) { return f(); }); },
    };
  }

  // ------------------------------------------------------------------
  // envoi d'images — conversion en WebP avant envoi + reessai automatique
  // en cas de 413 (proxy qui limite la taille du corps de requete) :
  // on decoupe le lot puis on recomprime plus fort en dernier recours.
  // ------------------------------------------------------------------
  function versWebP(fichier, compact) {
    return new Promise(function (resolve) {
      if (!fichier || !/^image\//.test(fichier.type) || fichier.type === "image/svg+xml") {
        return resolve(fichier);
      }
      if (fichier.type === "image/webp" && !compact) return resolve(fichier);

      var max = compact ? 1280 : 1920;
      var qualite = compact ? 0.62 : 0.82;
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      var fini = false;
      function terminer(f) {
        if (fini) return;
        fini = true;
        URL.revokeObjectURL(url);
        resolve(f);
      }
      img.onload = function () {
        try {
          var l = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (!l || !h) return terminer(fichier);
          var ratio = Math.min(1, max / Math.max(l, h));
          var cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(l * ratio));
          cv.height = Math.max(1, Math.round(h * ratio));
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob(function (blob) {
            if (!blob) return terminer(fichier);
            if (!compact && blob.size >= fichier.size && /\.webp$/i.test(fichier.name)) return terminer(fichier);
            var ext = blob.type === "image/webp" ? ".webp" : ".jpg";
            var nom = fichier.name.replace(/\.[^.]+$/, "") + ext;
            terminer(new File([blob], nom, { type: blob.type, lastModified: Date.now() }));
          }, "image/webp", qualite);
        } catch (e) {
          terminer(fichier);
        }
      };
      img.onerror = function () { terminer(fichier); };
      img.src = url;
    });
  }

  function envoyerUnLot(fichiers) {
    var donnees = new FormData();
    fichiers.forEach(function (f) { donnees.append("image", f); });

    return fetch("/api/upload", { method: "POST", body: donnees })
      .then(lireReponse)
      .then(function (res) {
        if (res.status === 413) {
          var e = new Error("Requete trop volumineuse.");
          e.tropVolumineux = true;
          throw e;
        }
        if (!res.ok || !res.d) throw new Error(messageErreur(res, "Echec de l'envoi."));
        if (res.d.chemins && res.d.chemins.length) return res.d.chemins;
        if (res.d.chemin) return [res.d.chemin];
        throw new Error("Echec de l'envoi.");
      });
  }

  function envoyerEnLots(fichiers, compact) {
    return envoyerUnLot(fichiers).catch(function (err) {
      if (!err.tropVolumineux) throw err;
      // 1) le lot est trop gros : on renvoie par moities jusqu'a passer
      if (fichiers.length > 1) {
        var milieu = Math.ceil(fichiers.length / 2);
        return envoyerEnLots(fichiers.slice(0, milieu), compact).then(function (premiers) {
          return envoyerEnLots(fichiers.slice(milieu), compact).then(function (autres) {
            return premiers.concat(autres);
          });
        });
      }
      // 2) meme une seule photo est refusee : on recomprime plus fort, une fois
      if (!compact) {
        return versWebP(fichiers[0], true).then(function (reduite) {
          if (reduite === fichiers[0]) {
            throw new Error("Photo trop volumineuse pour le serveur (HTTP 413).");
          }
          return envoyerEnLots([reduite], true);
        });
      }
      throw new Error("Photo trop volumineuse pour le serveur (HTTP 413).");
    });
  }

  function envoyerFichiers(fichiers) {
    return Promise.all(fichiers.map(function (f) { return versWebP(f, false); })).then(function (prets) {
      return envoyerEnLots(prets, false);
    });
  }

  // ------------------------------------------------------------------
  // page "Galerie complète" (liste editable + upload direct)
  // ------------------------------------------------------------------
  function construireSectionGalerie(page, galerie) {
    var wrapper = document.createElement("div");
    wrapper.className = "section-galerie-admin";

    var titre = document.createElement("h2");
    titre.textContent = "Photos de la galerie";
    wrapper.appendChild(titre);

    var intro = document.createElement("p");
    intro.className = "texte-aide";
    intro.textContent = "Ajoute ici les photos visibles sur la page galerie. Chaque fiche peut contenir plusieurs photos (20 max) : la photo n°1 est celle affichée en avant sur le site. Clique sur une vignette puis utilise « Déplacer avant / après », « Mettre en avant » ou « Retirer ».";
    wrapper.appendChild(intro);

    var itemsWrap = document.createElement("div");
    itemsWrap.className = "galerie-admin-liste";
    wrapper.appendChild(itemsWrap);

    var lecteursItems = [];
    var LIMITE_PHOTOS = 20;

    function valeurVideGalerie() {
      return { images: [], categorie: "plomberie", titre: "", texte: "" };
    }

    function normaliserItem(item) {
      item = item && typeof item === "object" ? item : valeurVideGalerie();
      var images = [];
      if (Array.isArray(item.images)) {
        item.images.forEach(function (i) {
          if (typeof i === "string" && i && images.indexOf(i) === -1) images.push(i);
        });
      }
      if (!images.length && typeof item.image === "string" && item.image) images.push(item.image);
      return {
        images: images,
        categorie: typeof item.categorie === "string" ? item.categorie : "plomberie",
        titre: typeof item.titre === "string" ? item.titre : "",
        texte: typeof item.texte === "string" ? item.texte : "",
      };
    }

    function ajouterItem(valeurItem) {
      var item = normaliserItem(valeurItem);
      var selection = 0;
      var bloc = document.createElement("div");
      bloc.className = "item-liste bloc-galerie";

      // colonne gauche : apercu de la photo en avant + compteur
      var colonne = document.createElement("div");
      colonne.className = "galerie-preview-col";

      var apercu = document.createElement("img");
      apercu.className = "galerie-preview";
      apercu.alt = item.titre || "Aperçu photo";
      colonne.appendChild(apercu);

      var compteur = document.createElement("div");
      compteur.className = "galerie-compteur";
      colonne.appendChild(compteur);
      bloc.appendChild(colonne);

      var champs = document.createElement("div");
      champs.className = "galerie-champs";

      function ajouterChampLabel(texte, element) {
        var ligne = document.createElement("div");
        ligne.className = "ligne-champ";
        var label = document.createElement("label");
        label.textContent = texte;
        ligne.appendChild(label);
        ligne.appendChild(element);
        champs.appendChild(ligne);
      }

      var titreInput = document.createElement("input");
      titreInput.type = "text";
      titreInput.className = "champ";
      titreInput.value = item.titre;
      ajouterChampLabel("Titre", titreInput);

      var categorieInput = document.createElement("select");
      categorieInput.className = "champ";
      [
        ["plomberie", "Plomberie"],
        ["electricite", "Électricité"],
        ["mixte", "Tout corps d’état"],
        ["renovation", "Rénovation"],
      ].forEach(function (option) {
        var opt = document.createElement("option");
        opt.value = option[0];
        opt.textContent = option[1];
        if (item.categorie === option[0]) opt.selected = true;
        categorieInput.appendChild(opt);
      });
      ajouterChampLabel("Catégorie", categorieInput);

      var texteInput = document.createElement("textarea");
      texteInput.className = "champ";
      texteInput.value = item.texte;
      texteInput.rows = 4;
      ajouterChampLabel("Description", texteInput);

      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.multiple = true;
      ajouterChampLabel("Photos (plusieurs à la fois, 20 max)", fileInput);

      var statut = document.createElement("div");
      statut.className = "statut-enregistrement";
      champs.appendChild(statut);

      // vignettes : clique pour selectionner, puis boutons d'ordre
      var vignettesWrap = document.createElement("div");
      vignettesWrap.className = "galerie-vignettes-admin";
      champs.appendChild(vignettesWrap);

      var actionsWrap = document.createElement("div");
      actionsWrap.className = "galerie-actions-vignettes";
      champs.appendChild(actionsWrap);

      function echanger(a, b) {
        var tmp = item.images[a];
        item.images[a] = item.images[b];
        item.images[b] = tmp;
      }

      function sauverImages(message) {
        statut.textContent = "Enregistrement...";
        statut.className = "statut-enregistrement";
        enregistrerContenu(true)
          .then(function () {
            statut.textContent = message + " ✓";
            statut.className = "statut-enregistrement ok";
          })
          .catch(function (err) {
            statut.textContent = err.message || "Erreur.";
            statut.className = "statut-enregistrement erreur";
          });
      }

      function boutonAction(texte, action) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "bouton-mini";
        b.textContent = texte;
        b.addEventListener("click", function () {
          action();
          dessinerImages();
        });
        actionsWrap.appendChild(b);
        return b;
      }

      var bAvant = boutonAction("◀ Déplacer avant", function () {
        if (selection <= 0) return;
        echanger(selection, selection - 1);
        selection -= 1;
        sauverImages("Ordre des photos mis à jour");
      });

      var bApres = boutonAction("Déplacer après ▶", function () {
        if (selection >= item.images.length - 1) return;
        echanger(selection, selection + 1);
        selection += 1;
        sauverImages("Ordre des photos mis à jour");
      });

      var bEnAvant = boutonAction("★ Mettre en avant", function () {
        if (selection <= 0) return;
        var src = item.images.splice(selection, 1)[0];
        item.images.unshift(src);
        selection = 0;
        sauverImages("Photo en avant mise à jour");
      });

      var bRetirer = boutonAction("✖ Retirer", function () {
        if (!item.images.length) return;
        if (!confirm("Retirer cette photo de la fiche ?")) return;
        item.images.splice(selection, 1);
        if (selection >= item.images.length) selection = item.images.length - 1;
        if (selection < 0) selection = 0;
        sauverImages("Photo retirée de la fiche");
      });

      function dessinerImages() {
        if (selection >= item.images.length) selection = item.images.length - 1;
        if (selection < 0) selection = 0;

        apercu.src = item.images.length ? "/" + item.images[0] : "/images/favicon.svg";
        apercu.alt = titreInput.value || "Aperçu photo";
        compteur.textContent = item.images.length
          ? item.images.length + " photo(s) · n°1 affichée en avant"
          : "Aucune photo";

        vignettesWrap.innerHTML = "";
        item.images.forEach(function (src, i) {
          var v = document.createElement("button");
          v.type = "button";
          v.className = "galerie-vignette-admin" + (i === selection ? " actif" : "") + (i === 0 ? " principale" : "");
          v.title = i === 0 ? "Photo en avant (affichée en premier sur le site)" : "Photo " + (i + 1);
          var vim = document.createElement("img");
          vim.src = "/" + src;
          vim.alt = "";
          v.appendChild(vim);
          var num = document.createElement("span");
          num.className = "num";
          num.textContent = String(i + 1);
          v.appendChild(num);
          v.addEventListener("click", function () {
            selection = i;
            dessinerImages();
          });
          vignettesWrap.appendChild(v);
        });

        var n = item.images.length;
        bAvant.disabled = n < 2 || selection <= 0;
        bApres.disabled = n < 2 || selection >= n - 1;
        bEnAvant.disabled = n < 2 || selection === 0;
        bRetirer.disabled = n === 0;
        actionsWrap.style.display = n ? "" : "none";
      }

      fileInput.addEventListener("change", function () {
        var fichiers = Array.prototype.slice.call(fileInput.files || []);
        if (!fichiers.length) return;

        var restant = LIMITE_PHOTOS - item.images.length;
        if (restant <= 0) {
          statut.textContent = "Maximum " + LIMITE_PHOTOS + " photos par fiche.";
          statut.className = "statut-enregistrement erreur";
          fileInput.value = "";
          return;
        }
        var retenus = fichiers.slice(0, restant);
        var ignores = fichiers.length - retenus.length;

        statut.textContent = "Conversion en WebP + envoi de " + retenus.length + " image(s)...";
        statut.className = "statut-enregistrement";

        envoyerFichiers(retenus)
          .then(function (chemins) {
            item.images = item.images.concat(chemins).slice(0, LIMITE_PHOTOS);
            fileInput.value = "";
            dessinerImages();
            return enregistrerContenu(true);
          })
          .then(function () {
            var msg = retenus.length > 1
              ? retenus.length + " photos ajoutées à la fiche ✓ (" + item.images.length + "/" + LIMITE_PHOTOS + ")"
              : "Photo ajoutée à la fiche ✓ (" + item.images.length + "/" + LIMITE_PHOTOS + ")";
            if (ignores) msg += " — " + ignores + " ignorée(s)";
            statut.textContent = msg;
            statut.className = "statut-enregistrement ok";
          })
          .catch(function (err) {
            statut.textContent = err.message || "Erreur.";
            statut.className = "statut-enregistrement erreur";
          });
      });

      titreInput.addEventListener("input", function () {
        apercu.alt = titreInput.value || "Aperçu photo";
      });

      bloc.appendChild(champs);
      dessinerImages();

      var boutonSupprimer = document.createElement("button");
      boutonSupprimer.type = "button";
      boutonSupprimer.className = "bouton-mini danger bouton-supprimer";
      boutonSupprimer.textContent = "Supprimer";
      boutonSupprimer.addEventListener("click", function () {
        if (!confirm("Supprimer cette fiche ?")) return;
        var idx = lecteursItems.indexOf(entree);
        if (idx > -1) lecteursItems.splice(idx, 1);
        bloc.remove();
      });
      bloc.appendChild(boutonSupprimer);

      var entree = function () {
        return {
          image: item.images[0] || "",
          images: item.images.slice(),
          categorie: categorieInput.value,
          titre: titreInput.value,
          texte: texteInput.value,
        };
      };
      lecteursItems.push(entree);

      itemsWrap.appendChild(bloc);
    }

    galerie.forEach(ajouterItem);

    // import en masse : toutes les photos choisies partent dans une seule fiche
    var fichiersBulk = document.createElement("input");
    fichiersBulk.type = "file";
    fichiersBulk.accept = "image/*";
    fichiersBulk.multiple = true;
    fichiersBulk.style.display = "none";
    wrapper.appendChild(fichiersBulk);

    var boutonBulk = document.createElement("button");
    boutonBulk.type = "button";
    boutonBulk.className = "bouton-mini bouton-ajouter";
    boutonBulk.textContent = "+ Ajouter plusieurs photos (nouvelle fiche)";
    boutonBulk.addEventListener("click", function () { fichiersBulk.click(); });
    wrapper.appendChild(boutonBulk);

    fichiersBulk.addEventListener("change", function () {
      var fichiers = Array.prototype.slice.call(fichiersBulk.files || []);
      if (!fichiers.length) return;
      var retenus = fichiers.slice(0, LIMITE_PHOTOS);
      afficherStatut("Conversion en WebP + envoi de " + retenus.length + " photos...", "");
      envoyerFichiers(retenus)
        .then(function (chemins) {
          ajouterItem({ images: chemins, categorie: "plomberie", titre: "", texte: "" });
          fichiersBulk.value = "";
          return enregistrerContenu(true);
        })
        .then(function () {
          var msg = retenus.length + " photos ajoutées dans une nouvelle fiche ✓ (donne-lui un titre puis Enregistrer)";
          if (fichiers.length > retenus.length) msg += " — " + (fichiers.length - retenus.length) + " ignorée(s)";
          afficherStatut(msg, "ok");
        })
        .catch(function (err) {
          afficherStatut("Erreur : " + (err.message || "echec de l'envoi."), "erreur");
        });
    });

    var boutonAjouter = document.createElement("button");
    boutonAjouter.type = "button";
    boutonAjouter.className = "bouton-mini bouton-ajouter";
    boutonAjouter.textContent = "+ Ajouter une fiche";
    boutonAjouter.addEventListener("click", function () {
      ajouterItem(valeurVideGalerie());
    });
    wrapper.appendChild(boutonAjouter);

    return {
      el: wrapper,
      lire: function () { return lecteursItems.map(function (f) { return f(); }); },
    };
  }

  // ------------------------------------------------------------------
  // page "Photos du site" (upload direct, sauvegarde immediate)
  // ------------------------------------------------------------------
  function construireSectionImages(page, images) {
    var slots = [
      { cle: "hero", label: "Photo du hero (bandeau principal)" },
      { cle: "servicePlomberie", label: "Photo — carte « Plomberie »" },
      { cle: "serviceElectricite", label: "Photo — carte « Électricité »" },
    ];

    slots.forEach(function (slot) {
      var bloc = document.createElement("div");
      bloc.className = "bloc-image";

      var img = document.createElement("img");
      img.src = "/" + (images[slot.cle] || "");
      bloc.appendChild(img);

      var infos = document.createElement("div");
      infos.className = "infos";
      var label = document.createElement("div");
      label.className = "label";
      label.textContent = slot.label;
      infos.appendChild(label);

      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      infos.appendChild(fileInput);

      var statut = document.createElement("div");
      statut.className = "statut-enregistrement";
      infos.appendChild(statut);

      fileInput.addEventListener("change", function () {
        var fichier = fileInput.files[0];
        if (!fichier) return;
        statut.textContent = "Conversion en WebP + envoi...";
        statut.className = "statut-enregistrement";

        envoyerFichiers([fichier])
          .then(function (chemins) {
            var chemin = chemins[0];
            contenuCourant.images = contenuCourant.images || {};
            contenuCourant.images[slot.cle] = chemin;
            img.src = "/" + chemin + "?t=" + Date.now();
            return enregistrerContenu(true);
          })
          .then(function () {
            statut.textContent = "Image mise à jour et enregistrée ✓";
            statut.className = "statut-enregistrement ok";
          })
          .catch(function (err) {
            statut.textContent = err.message || "Erreur.";
            statut.className = "statut-enregistrement erreur";
          });
      });

      bloc.appendChild(infos);
      page.appendChild(bloc);
    });
  }

  // ------------------------------------------------------------------
  // enregistrement
  // ------------------------------------------------------------------
  function construireContenuDepuisFormulaire() {
    var res = {};
    Object.keys(lecteursSection).forEach(function (cle) {
      res[cle] = lecteursSection[cle]();
    });
    res.images = (contenuCourant && contenuCourant.images) || {};
    return res;
  }

  function enregistrerContenu(silencieux) {
    var nouveauContenu = construireContenuDepuisFormulaire();
    return fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauContenu),
    })
      .then(lireReponse)
      .then(function (res) {
        if (!res.ok || !res.d) throw new Error(messageErreur(res, "Echec de l'enregistrement."));
        contenuCourant = res.d.contenu;
        if (!silencieux) afficherStatut("Modifications enregistrées ✓", "ok");
      })
      .catch(function (err) {
        if (!silencieux) afficherStatut("Erreur : " + err.message, "erreur");
        throw err;
      });
  }

  function afficherStatut(texte, type) {
    var statut = document.getElementById("statutEnregistrement");
    statut.textContent = texte;
    statut.className = "statut-enregistrement" + (type ? " " + type : "");
    if (type === "ok") setTimeout(function () { statut.textContent = ""; }, 3500);
  }

  document.getElementById("boutonEnregistrer").addEventListener("click", function () {
    afficherStatut("Enregistrement...", "");
    enregistrerContenu(false).catch(function () {});
  });
})();

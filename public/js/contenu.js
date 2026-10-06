/* ==================================================================
   HYDRATATION DEPUIS L'API
   ================================================================== */
(function () {
  "use strict";

  var TARIFS_PAR_DEFAUT = [
    {
      nom: "Diagnostic plomberie",
      prix: "65 €",
      description: "Evaluation technique sur place avant intervention.",
      badge: ""
    },
    {
      nom: "Depannage electrique",
      prix: "90 €",
      description: "Diagnostic rapide, mise en securite et remise en service.",
      badge: "LE PLUS DEMANDE"
    },
    {
      nom: "Debouchage",
      prix: "105 €",
      description: "Intervention sur canalisations, WC, lavabos et evier.",
      badge: ""
    },
    {
      nom: "Chauffe-eau",
      prix: "120 €",
      description: "Depannage, verification et remplacement si necessaire.",
      badge: ""
    }
  ];

  function echapper(valeur) {
    var div = document.createElement("div");
    div.textContent = String(valeur == null ? "" : valeur);
    return div.innerHTML;
  }

  function definirTexte(selecteur, valeur) {
    if (typeof valeur !== "string") return;
    var el = document.querySelector(selecteur);
    if (el) el.textContent = valeur;
  }

  function definirHTML(selecteur, valeur) {
    if (typeof valeur !== "string") return;
    var el = document.querySelector(selecteur);
    if (el) el.innerHTML = valeur;
  }

  function definirSrc(selecteur, valeur) {
    if (!valeur) return;
    var el = document.querySelector(selecteur);
    if (el) el.setAttribute("src", valeur);
  }

  function appliquerBadges(badges) {
    if (!badges || typeof badges !== "object") return;
    if (typeof badges.tce === "string") {
      document.querySelectorAll('[data-f-badge="tce"]').forEach(function (el) {
        el.textContent = badges.tce;
      });
    }
    if (typeof badges.d48h === "string") {
      document.querySelectorAll('[data-f-badge="d48h"]').forEach(function (el) {
        el.textContent = badges.d48h;
      });
    }
  }

  function appliquerGaranties(garanties) {
    if (!garanties) return;
    definirTexte('[data-f="garanties.tceTexte"]', garanties.tceTexte);
    definirTexte('[data-f="garanties.devisTexte"]', garanties.devisTexte);
  }

  var LIBELLES_GALERIE = {
    plomberie: "Plomberie",
    electricite: "Electricite",
    mixte: "Tout corps d'etat",
    renovation: "Renovation"
  };

  function libelleCategorie(categorie) {
    return LIBELLES_GALERIE[categorie] || (categorie ? categorie.charAt(0).toUpperCase() + categorie.slice(1) : "Photo");
  }

  function appliquerTelephone(tel) {
    if (!tel || typeof tel !== "string") return;

    var href = "tel:" + tel.replace(/[^\d+]/g, "");
    document.querySelectorAll("[data-tel-href]").forEach(function (a) {
      a.setAttribute("href", href);
    });

    document.querySelectorAll("[data-tel-text]").forEach(function (el) {
      el.textContent = tel;
    });
  }

  function creerLigneService(texte) {
    return "<li>" + echapper(texte) + "</li>";
  }

  function appliquerServices(services) {
    if (!Array.isArray(services)) return;

    document.querySelectorAll("[data-f-service]").forEach(function (carte) {
      var index = Number(carte.getAttribute("data-f-service"));
      var service = services[index];
      if (!service) return;

      var h3 = carte.querySelector("h3");
      if (h3 && service.titre) h3.textContent = service.titre;

      var ul = carte.querySelector("ul");
      if (ul && Array.isArray(service.items)) {
        ul.innerHTML = service.items.map(creerLigneService).join("");
      }
    });
  }

  function appliquerApropos(apropos) {
    if (!apropos) return;

    definirTexte('[data-f="apropos.paragraphe1"]', apropos.paragraphe1);
    definirTexte('[data-f="apropos.paragraphe2"]', apropos.paragraphe2);

    if (Array.isArray(apropos.valeurs)) {
      var valeurs = document.querySelector('[data-f-liste="apropos.valeurs"]');
      if (valeurs) {
        valeurs.innerHTML = apropos.valeurs.map(function (texte) {
          return '<div class="valeur">' + echapper(texte) + "</div>";
        }).join("");
      }
    }

    if (Array.isArray(apropos.stats)) {
      var stats = document.querySelector('[data-f-liste="apropos.stats"]');
      if (stats) {
        stats.innerHTML = apropos.stats.map(function (item) {
          var cible = Number(item.chiffre) || 0;
          return (
            '<div class="stat"><span class="chiffre" data-cible="' + cible + '">' +
            cible +
            '</span><span class="unite">' +
            echapper(item.unite || "") +
            "</span><p>" +
            (item.legende || "") +
            "</p></div>"
          );
        }).join("");
      }
    }
  }

  function extraireAuteur(auteurBrut) {
    if (typeof auteurBrut !== "string") return "Client - [Ville]";
    return auteurBrut.replace(" à ", " - ");
  }

  function appliquerAvis(avis) {
    if (!Array.isArray(avis)) return;

    var conteneur = document.querySelector('[data-f-liste="avis"]');
    if (!conteneur) return;

    conteneur.innerHTML = avis.map(function (item, index) {
      var etoiles = Math.max(0, Math.min(5, Number(item.etoiles) || 5));
      return (
        '<article class="avis-carte reveal" style="--d:' +
        (0.06 + index * 0.04).toFixed(2) +
        's">' +
        (item.exemple ? '<span class="tag-exemple">Exemple</span>' : "") +
        '<div class="etoiles" aria-hidden="true">' +
        "★".repeat(etoiles) +
        '</div><span class="avis-label">avis</span><p>« ' +
        echapper(item.texte || "") +
        ' »</p><div class="auteur">' +
        echapper(extraireAuteur(item.auteur)) +
        "</div></article>"
      );
    }).join("");
  }

  function appliquerImages(images) {
    if (!images) return;
    definirSrc('[data-f-img="hero"]', images.hero);
  }

  function creerCarteGalerie(item, index) {
    var image = item.image || "images/hero.jpg";
    var categorie = item.categorie || item.category || "";
    var titre = item.titre || item.title || "";
    var texte = item.texte || item.description || "";
    var etiquette = item.categorieLabel || libelleCategorie(categorie);

    return (
      '<article class="galerie-carte reveal" data-galerie-item data-category="' +
      echapper(categorie) +
      '" style="--d:' +
      (0.06 + index * 0.04).toFixed(2) +
      's">' +
      '<img src="' +
      echapper(image) +
      '" width="1376" height="768" loading="lazy" alt="' +
      echapper(titre || etiquette) +
      '">' +
      '<div class="galerie-contenu"><span class="tag">' +
      echapper(etiquette) +
      '</span><h3>' +
      echapper(titre) +
      '</h3><p>' +
      echapper(texte) +
      '</p><span class="fleche-carte" aria-hidden="true">→</span></div></article>'
    );
  }

  function appliquerGalerie(galerie) {
    if (!Array.isArray(galerie)) return;

    var conteneur = document.querySelector("[data-galerie-grille]");
    if (!conteneur) return;

    var pageComplete = !!document.querySelector("#galerie-complete");
    var limite = pageComplete ? galerie.length : Math.min(3, galerie.length);

    conteneur.innerHTML = galerie.slice(0, limite).map(function (item, index) {
      return creerCarteGalerie(item, index);
    }).join("");
  }

  function normaliserTarifs(tarifs) {
    if (!Array.isArray(tarifs) || !tarifs.length) return TARIFS_PAR_DEFAUT;
    return tarifs.map(function (item, index) {
      return {
        nom: item.nom || item.titre || TARIFS_PAR_DEFAUT[index % TARIFS_PAR_DEFAUT.length].nom,
        description: item.description || item.texte || "",
        prix: item.prix || "65 €",
        prefixe: item.prefixe || "À partir de",
        duree: item.duree || "",
        categorie: item.categorie || "",
        badge: item.badge || "",
        disponible: item.disponible !== false,
        actif: item.actif !== false
      };
    });
  }

  function libelleCategorieTarif(categorie) {
    var LABELS = {
      plomberie: "Plomberie",
      electricite: "Électricité",
      canalisation: "Canalisation",
      "chauffe-eau": "Chauffe-eau",
      depannage: "Dépannage",
      urgence: "Urgence"
    };
    return LABELS[categorie] || (categorie ? categorie.charAt(0).toUpperCase() + categorie.slice(1) : "");
  }

  function iconeTarif(texte) {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
  }

  function appliquerTarifs(tarifs) {
    var conteneur = document.querySelector('[data-f-liste="tarifs"]');
    if (!conteneur) return;

    var source = normaliserTarifs(tarifs);

    conteneur.innerHTML = source.map(function (item, index) {
      if (!item.actif) return "";
      var classes = "tarif-carte reveal" + (item.badge ? " tarif-populaire" : "");
      var categorie =
        item.categorie ?
        '<p class="tarif-meta">' + echapper(libelleCategorieTarif(item.categorie)) + "</p>" :
        "";
      var pied = [];
      if (item.duree) {
        pied.push('<span class="tarif-chip">' + iconeTarif() + "Durée estimée : " + echapper(item.duree) + "</span>");
      }
      if (item.disponible) {
        pied.push('<span class="tarif-chip"><span class="voyant" style="background:#3FA34D"></span>Disponible</span>');
      }
      return (
        '<article class="' + classes + '" data-tarif-item style="--d:' +
        (0.06 + index * 0.04).toFixed(2) +
        's">' +
        (item.badge ? '<span class="badge-pop">' + echapper(item.badge) + "</span>" : "") +
        "<h3>" +
        echapper(item.nom) +
        "</h3>" +
        categorie +
        '<p class="prix-prefix">' +
        echapper(item.prefixe) +
        '</p><p class="prix">' +
        echapper(item.prix) +
        '</p><p class="tarif-desc">' +
        echapper(item.description) +
        "</p>" +
        (pied.length ? '<div class="tarif-pied">' + pied.join("") + "</div>" : "") +
        "</article>"
      );
    }).join("");
  }

  function appliquerContenu(data) {
    if (!data || typeof data !== "object") return;

    appliquerTelephone(data.telephone);
    appliquerImages(data.images);
    appliquerGalerie(data.galerie);
    appliquerTarifs(data.tarifs);

    if (data.hero) {
      definirTexte('[data-f="hero.titre"]', data.hero.titre);
      definirTexte('[data-f="hero.accent"]', data.hero.accent);
      definirHTML('[data-f="hero.sousTitre"]', data.hero.sousTitre);
      definirTexte('[data-f="hero.intro"]', data.hero.intro);
    }

    appliquerBadges(data.badges);
    appliquerGaranties(data.garanties);
    appliquerServices(data.services);
    appliquerApropos(data.apropos);
    appliquerAvis(data.avis);

    if (data.urgence) {
      definirHTML('[data-f="urgence.titre"]', data.urgence.titre);
      definirTexte('[data-f="urgence.texte"]', data.urgence.texte);
    }

    if (data.footer) {
      definirTexte('[data-f="footer.copyright"]', data.footer.copyright);
    }
  }

  fetch("/api/content", { cache: "no-store" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (data) appliquerContenu(data);
    })
    .catch(function () {
      appliquerTarifs(null);
    });
})();

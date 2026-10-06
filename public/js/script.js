/* ==================================================================
   LM86 SERVICES — INTERACTIONS LEGÈRES (mode application)
   ================================================================== */
(function () {
  "use strict";

  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var OBSERVABLE = ".reveal, .reveal-left, .reveal-right, .reveal-zoom";

  if (!reduit && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
  }

  function estObservable(node) {
    return node.matches && node.matches(OBSERVABLE);
  }

  function revelerEnPlace() {
    document.querySelectorAll(OBSERVABLE).forEach(function (el) {
      el.classList.add("vu");
    });
  }

  // ------------------------------------------------------------------
  // animations d'apparition au scroll (contenu visible sans JS)
  // ------------------------------------------------------------------
  function observerReveal() {
    var elements = document.querySelectorAll(OBSERVABLE);

    if (!elements.length || reduit || !("IntersectionObserver" in window)) {
      revelerEnPlace();
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("vu");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    elements.forEach(function (el) { obs.observe(el); });

    // observé les éléments injectés par contenu.js (tarifs, galerie, avis...)
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (!m.addedNodes) return;
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (estObservable(node)) obs.observe(node);
          if (node.querySelectorAll) {
            node.querySelectorAll(OBSERVABLE).forEach(function (el) { obs.observe(el); });
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------------
  // header : ombre + blur au scroll
  // ------------------------------------------------------------------
  function navScroll() {
    var nav = document.querySelector("nav");
    if (!nav) return;
    function update() {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  // ------------------------------------------------------------------
  // menu mobile : tiroir latéral + scrim + blocage du scroll
  // ------------------------------------------------------------------
  function mobileMenu() {
    var burger = document.getElementById("burger");
    var menu = document.getElementById("menu-mobile");
    var scrim = document.getElementById("menu-scrim");
    var fermer = document.getElementById("menuFermer");
    if (!burger || !menu) return;

    function ouvrir() {
      menu.classList.add("ouvert");
      if (scrim) scrim.classList.add("ouvert");
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      if (fermer) fermer.focus();
    }

    function fermerMenu() {
      menu.classList.remove("ouvert");
      if (scrim) scrim.classList.remove("ouvert");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    burger.addEventListener("click", function () {
      if (menu.classList.contains("ouvert")) fermerMenu();
      else ouvrir();
    });

    if (fermer) fermer.addEventListener("click", fermerMenu);
    if (scrim) scrim.addEventListener("click", fermerMenu);

    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", fermerMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fermerMenu();
    });
  }

  // ------------------------------------------------------------------
  // compteur (les chiffres restent visibles avant l'animation)
  // ------------------------------------------------------------------
  function counterAnimation() {
    var counters = document.querySelectorAll(".chiffre[data-cible]");
    if (!counters.length) return;

    counters.forEach(function (el) {
      var v = parseInt(el.getAttribute("data-cible"), 10);
      if (Number.isFinite(v)) el.textContent = String(v);
    });

    if (reduit || !("IntersectionObserver" in window)) return;

    function animateCounter(el) {
      var cible = parseInt(el.getAttribute("data-cible"), 10);
      if (!Number.isFinite(cible)) return;
      var start = Math.max(0, cible - Math.max(1, Math.round(cible * 0.18)));
      var startTime = null;
      var duration = 360;

      function step(ts) {
        if (startTime === null) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(start + (cible - start) * eased));
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { obs.observe(el); });
  }

  // ------------------------------------------------------------------
  // accordéon FAQ
  // ------------------------------------------------------------------
  function faqAccordion() {
    var root = document.querySelector("[data-faq]");
    if (!root) return;

    var buttons = root.querySelectorAll(".faq-q");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".faq-item");
        if (!item) return;

        var opened = item.classList.contains("ouvert");
        var panel = item.querySelector(".faq-a");
        if (!panel) return;

        buttons.forEach(function (otherBtn) {
          var otherItem = otherBtn.closest(".faq-item");
          var otherPanel = otherItem && otherItem.querySelector(".faq-a");
          if (!otherItem || !otherPanel) return;
          otherItem.classList.remove("ouvert");
          otherBtn.setAttribute("aria-expanded", "false");
          otherPanel.hidden = true;
        });

        if (!opened) {
          item.classList.add("ouvert");
          btn.setAttribute("aria-expanded", "true");
          panel.hidden = false;
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // ancres douces : scroller meme si le hash est deja en cours d'usage
  // ------------------------------------------------------------------
  function ancresDouces() {
    var larges = window.matchMedia("(min-width:901px)");
    var liens = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));
    liens.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var hash = a.getAttribute("href");
        if (hash === "#" || !hash) return;

        if (hash === "#top") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
          if (history.replaceState) history.replaceState(null, "", window.location.pathname + window.location.search);
          return;
        }

        var cible = document.querySelector(hash);
        if (!cible) return;

        if (!larges.matches) {
          e.preventDefault();
          var enTete = document.querySelector(".site-header");
          var hauteur = (enTete && enTete.getBoundingClientRect().height) || 64;
          var pos = cible.getBoundingClientRect().top + window.scrollY - hauteur + 10;
          window.scrollTo({ top: Math.max(0, pos), behavior: reduit ? "auto" : "smooth" });
        }
      });
    });
  }

  observerReveal();
  navScroll();
  mobileMenu();
  ancresDouces();
  counterAnimation();
  faqAccordion();
})();
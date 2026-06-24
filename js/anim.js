/* =====================================================================
   ВЕДУЩИЙ — движок анимаций на GSAP + ScrollTrigger (с нуля)
   Анимируется ВСЁ: текст (слова/буквы), плашки, кнопки, фото.
   Есть НАСТОЯЩАЯ скролл-анимация МЕЖДУ блоками:
     • каждая секция «въезжает»/собирается по мере скролла (scrub-таймлайн);
     • контент и фото идут с параллаксом → переходы между блоками живые,
       а не «два блока и всё».
   Стиль выбирается <html data-anim="cinematic|kinetic|editorial">.
   GSAP/ScrollTrigger/Lenis грузятся на странице; этот скрипт идёт ПОСЛЕ них.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("anim-ready"); // снимаем аварийный таймаут из <head>
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !root.classList.contains("anim")) return;

  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) { root.classList.remove("anim"); return; } // нет GSAP → просто показываем контент
  gsap.registerPlugin(ST);

  var fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  var V = root.getAttribute("data-anim") || "cinematic";

  /* ---- параметры стиля по версиям ---- */
  var P = {
    cinematic: {
      ease: "expo.out", dur: 1.2, stag: 0.06, secEase: "power3.out",
      // заголовки — чистый подъём из-под маски (как раньше), без 3D-перекосов
      head: { from: { yPercent: 118 }, to: { yPercent: 0 }, mask: true, split: "word" },
      // блоки «разворачиваются» клип-маской снизу вверх
      block: { from: { opacity: 0, y: 42, clipPath: "inset(0 0 100% 0)" }, to: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" } },
      // плашки «прочерчиваются» слева
      badge: { from: { opacity: 0, clipPath: "inset(0 100% 0 0)" }, to: { opacity: 1, clipPath: "inset(0 0% 0 0)" } },
      button: { from: { opacity: 0, scale: 0.66, y: 18 }, to: { opacity: 1, scale: 1, y: 0 } },
      photo: { from: { opacity: 1, clipPath: "inset(0 0 100% 0)", scale: 1.22 }, to: { clipPath: "inset(0 0 0% 0)", scale: 1 } },
      sec: { from: { scale: 0.82, yPercent: 16 }, par: -18 },
      collage: -28, skew: 0
    },
    kinetic: {
      ease: "back.out(1.5)", dur: 0.8, stag: 0.045, secEase: "back.out(1.3)",
      head: { from: { yPercent: 70, scale: 0.65, rotation: -9, opacity: 0, transformOrigin: "0% 100%" }, to: { yPercent: 0, scale: 1, rotation: 0, opacity: 1 }, split: "word" },
      block: { from: { opacity: 0, x: -62, scale: 0.9 }, to: { opacity: 1, x: 0, scale: 1 }, alt: true },
      badge: { from: { opacity: 0, y: 34, scale: 0.8 }, to: { opacity: 1, y: 0, scale: 1 } },
      button: { from: { opacity: 0, scale: 0.6 }, to: { opacity: 1, scale: 1 } },
      photo: { from: { opacity: 0, scale: 0.78, rotation: -3 }, to: { opacity: 1, scale: 1, rotation: 0 } },
      sec: { from: { xPercent: 18, scale: 0.85, rotation: 2.5 }, par: -26, alt: true },
      collage: -34, skew: 1
    },
    editorial: {
      ease: "sine.out", dur: 1.15, stag: 0.02, secEase: "sine.out",
      head: { from: { opacity: 0, filter: "blur(10px)", yPercent: 24 }, to: { opacity: 1, filter: "blur(0px)", yPercent: 0 }, split: "char" },
      block: { from: { opacity: 0, filter: "blur(14px)", y: 24 }, to: { opacity: 1, filter: "blur(0px)", y: 0 } },
      badge: { from: { opacity: 0, filter: "blur(8px)" }, to: { opacity: 1, filter: "blur(0px)" } },
      button: { from: { opacity: 0, filter: "blur(8px)", y: 12 }, to: { opacity: 1, filter: "blur(0px)", y: 0 } },
      photo: { from: { opacity: 0, filter: "blur(22px) saturate(0.5)", scale: 1.06 }, to: { opacity: 1, filter: "blur(0px) saturate(1)", scale: 1 } },
      sec: { from: { scale: 0.92, yPercent: 14, filter: "blur(12px)" }, par: -14 },
      collage: -16, skew: 0
    }
  }[V];

  /* ---- разбивка текста на слова/буквы (бережёт inline em/span/br) ---- */
  function split(el, mode) {
    var bag = [], ctx = { n: 0 };
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (p === "") return;
            if (p.trim() === "") { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement("span"); w.className = "w";
            var i = document.createElement("span"); i.className = "w__i";
            if (mode === "char") {
              Array.prototype.forEach.call(p, function (ch) {
                var c = document.createElement("span"); c.className = "c"; c.textContent = ch; i.appendChild(c); bag.push(c);
              });
            } else { i.textContent = p; bag.push(i); }
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR" && !/svg/i.test(n.tagName)) walk(n);
      });
    })(el);
    return bag;
  }

  /* ---- селекторы (анимируем ВСЁ) ---- */
  var HEAD_SEL = ".statement__title, .feature__title, .h2, .detail__title, .detail__catitle, .detail__bh, .req__title, .legal__title";
  var BADGE_SEL = ".label, .hero__top, .hero__mono, .hero__reel, .req__eyebrow, .footer__eyebrow, .legal__eyebrow, .detail__tag, .detail__catag, .story__idx, .detail__rownum, .detail__stepn, .detail__meta, .detail__cameta, .legal__meta";
  var BTN_SEL = ".btn, .nav__cta, .req__submit, .req__chip, .detail__play, .alink, .req__anketa, .detail__plus, .case-name, .footer__big-link";
  var BLOCK_SEL = ".hero__brand--l, .hero__brand--r, .statement__sub, .feature__row p, .story__title, .story__desc, .req__text, .req__direct, .req__field, .req__consent, .detail__text p, .detail__rowh, .detail__rowp, .detail__steph, .detail__stepp, .detail__caabout, .legal__index-card, .legal__doc h2, .legal__doc h3, .legal__doc p, .legal__doc li, .footer__brand, .footer__social a, .footer__legal a, .footer__bottom span";
  var PHOTO_SEL = ".feature > img, .detail__main, .detail__thumbs figure, .story__thumb";
  var SEC_SEL = ".feature, .stories, .cases, .req, .footer, .detail__case, .detail__block, .legal";
  var COLLAGE = ".about-scroll__media .b2";

  /* ---- утилита: батч-появление (одинаково входящие элементы — каскадом) ---- */
  function batchReveal(sel, conf, perKind) {
    var els = gsap.utils.toArray(sel).filter(function (e) { return !e.closest(".menu"); });
    if (!els.length) return;
    gsap.set(els, conf.from);
    if (conf.alt) els.forEach(function (e, i) { if (i % 2) gsap.set(e, { x: -(conf.from.x || 0) }); });
    ST.batch(els, {
      start: "top 88%",
      onEnter: function (b) { gsap.to(b, Object.assign({ duration: P.dur, ease: P.ease, stagger: P.stag, overwrite: "auto" }, conf.to)); }
    });
  }

  /* ---- 1. ЗАГОЛОВКИ: слова/буквы ---- */
  gsap.utils.toArray(HEAD_SEL).forEach(function (el) {
    if (el.closest(".menu")) return;
    var bag = split(el, P.head.split);
    if (P.head.mask) el.classList.add("mask-head");
    gsap.set(el, { opacity: 1 });        // снимаем FOUC-скрытие самого заголовка
    gsap.set(bag, P.head.from);          // слова/буквы прячем уже своим способом
    ST.create({
      trigger: el, start: "top 86%", once: true,
      onEnter: function () { gsap.to(bag, Object.assign({ duration: P.dur, ease: P.ease, stagger: P.head.split === "char" ? P.stag * 0.7 : P.stag }, P.head.to)); }
    });
  });

  /* ---- 2. ПЛАШКИ, КНОПКИ, БЛОКИ, ТЕКСТ ---- */
  batchReveal(BADGE_SEL, { from: P.badge.from, to: P.badge.to }, "badge");
  batchReveal(BTN_SEL, { from: P.button.from, to: P.button.to }, "button");
  batchReveal(BLOCK_SEL, { from: P.block.from, to: P.block.to, alt: P.block.alt }, "block");

  /* ---- 3. ФОТО: раскрытие при входе ---- */
  gsap.utils.toArray(PHOTO_SEL).forEach(function (el) {
    gsap.set(el, P.photo.from);
    ST.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: function () { gsap.to(el, Object.assign({ duration: P.dur * 1.3, ease: P.ease }, P.photo.to)); }
    });
  });

  /* ---- 4. СКРОЛЛ МЕЖДУ БЛОКАМИ: секция собирается по мере скролла + параллакс ---- */
  gsap.utils.toArray(SEC_SEL).forEach(function (sec) {
    var content = sec.querySelector(".wrap, .cases__inner, .req__grid, .feature__row, .detail__casein, .detail__blockin, .legal__wrap") || sec;
    var fromV = Object.assign({}, P.sec.from);
    if (P.sec.alt && Array.prototype.indexOf.call(sec.parentNode.children, sec) % 2) fromV.xPercent = -(fromV.xPercent || 0);
    // выразительный «въезд» секции по скроллу (большая амплитуда) → затем параллакс
    var clearTo = { scale: 1, xPercent: 0, yPercent: 0, rotation: 0, ease: P.secEase, duration: 0.55 };
    if (fromV.filter) clearTo.filter = "blur(0px)";
    var tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 0.9 } });
    tl.fromTo(content, fromV, clearTo, 0)
      .to(content, { yPercent: P.sec.par, ease: "none", duration: 0.45 }, 0.55);
  });

  /* ---- 5. КОЛЛАЖ «кто я»: глубинный параллакс ---- */
  gsap.utils.toArray(COLLAGE).forEach(function (b2, i) {
    gsap.fromTo(b2, { yPercent: 0 }, {
      yPercent: P.collage * (0.6 + (i % 3) * 0.3), ease: "none",
      scrollTrigger: { trigger: ".about-scroll", start: "top bottom", end: "bottom top", scrub: 1 }
    });
  });

  /* ---- 6. интерактив (десктоп): магнит + 3D-наклон ---- */
  if (fine) {
    gsap.utils.toArray(".btn, .req__submit, .detail__play, .nav__cta, .iconbtn").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", function () { gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.5)" }); });
    });
    gsap.utils.toArray(".story, .case-name, .detail__main").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { rotationY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotationX: -((e.clientY - r.top) / r.height - 0.5) * 8, transformPerspective: 900, duration: 0.4, ease: "power2.out" });
      });
      el.addEventListener("mouseleave", function () { gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.6, ease: "power2.out" }); });
    });
  }

  /* ---- индикатор прогресса скролла ---- */
  var prog = document.createElement("div"); prog.className = "sx-prog"; document.body.appendChild(prog);
  gsap.to(prog, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---- пересчёт после загрузки шрифтов/картинок ---- */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  addEventListener("load", function () { ST.refresh(); });
})();

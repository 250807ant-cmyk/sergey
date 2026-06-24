/* =====================================================================
   ВЕДУЩИЙ — cinematic studio interactions (v2)
   Прогрессивное улучшение: без JS / без CDN сайт остаётся читаемым.
   ===================================================================== */
(function () {
  "use strict";
  // при перезагрузке всегда показываем первый экран: браузер иначе восстанавливает прежнюю
  // позицию скролла, а со smooth-scroll (Lenis) + высокой секцией это кидает на середину страницы.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const hasGSAP = typeof gsap !== "undefined";
  // движок появления (anim.js) самостоятелен — класс anim не снимаем

  /* ---- smooth scroll ---- */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !reduce) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGSAP && ST) {
      lenis.on("scroll", ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const onScroll = (cb) => { lenis ? lenis.on("scroll", ({ scroll }) => cb(scroll)) : addEventListener("scroll", () => cb(scrollY), { passive: true }); };
  // anchor links via lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(t, { offset: -10 }) : t.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---- word splitter (keeps inline em/span/br) ---- */
  function split(el, bag) {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (p.trim() === "") { frag.appendChild(document.createTextNode(p)); return; }
          const w = document.createElement("span"); w.className = "word";
          const i = document.createElement("span"); i.className = "word__in"; i.textContent = p;
          w.appendChild(i); frag.appendChild(w); bag.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") { split(n, bag); }
    });
  }

  /* ---- reveals ---- */
  function reveals() {
    if (!hasGSAP || !ST || reduce) return;
    gsap.registerPlugin(ST);

    document.querySelectorAll("[data-split]").forEach((el) => {
      const bag = []; split(el, bag); gsap.set(bag, { yPercent: 115 });
      ST.create({ trigger: el, start: "top 90%", once: true, onEnter: () => gsap.to(bag, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.04 }) });
    });

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const t = el.getAttribute("data-reveal"), d = parseFloat(el.getAttribute("data-delay") || "0");
      let from = { duration: 1, ease: "expo.out", delay: d };
      if (t === "up") from = { ...from, autoAlpha: 0, y: 36 };
      else if (t === "clip") from = { ...from, clipPath: "inset(0 0 100% 0)", duration: 1.2, ease: "power4.out" };
      else if (t === "scale") from = { ...from, autoAlpha: 0, scale: 1.06, duration: 1.3, ease: "power3.out" };
      else from = { ...from, autoAlpha: 0 };
      ST.create({ trigger: el, start: "top 90%", once: true, onEnter: () => { gsap.from(el, from); gsap.to(el, { autoAlpha: 1, duration: 0.01 }); } });
    });

    document.querySelectorAll("[data-stagger]").forEach((g) => {
      gsap.set(g.children, { autoAlpha: 0, y: 30 });
      ST.create({ trigger: g, start: "top 86%", once: true, onEnter: () => gsap.to(g.children, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 }) });
    });

    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const amt = parseFloat(el.getAttribute("data-parallax")) || 10;
      gsap.to(el, { yPercent: amt, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    document.fonts && document.fonts.ready.then(() => ST.refresh());
    addEventListener("load", () => ST.refresh());
  }

  /* ---- grayscale -> colour on view ---- */
  function colourise() {
    const items = document.querySelectorAll(".media");
    if (!items.length || !("IntersectionObserver" in window)) { items.forEach((m) => m.classList.add("in-view")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in-view"); }), { threshold: 0.35 });
    items.forEach((m) => io.observe(m));
  }

  /* ---- hero: плавное кинематографичное появление при загрузке ---- */
  function heroOn() {
    if (!hasGSAP || reduce) return;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const bl = hero.querySelector(".hero__brand--l");
    const br = hero.querySelector(".hero__brand--r");
    const reel = hero.querySelector(".hero__reel");
    const top = hero.querySelector(".hero__top");
    const mono = hero.querySelector(".hero__mono");
    const tl = gsap.timeline({ delay: 0.12, defaults: { ease: "expo.out" } });
    // верхние подписи — мягкий подъём
    if (top) tl.from(top, { autoAlpha: 0, y: 18, duration: 0.8 }, 0);
    if (mono) tl.from(mono, { autoAlpha: 0, y: 12, duration: 0.8 }, 0.08);
    // бренд — поднимается и проявляется (transform только translate, центрирование не трогаем)
    if (bl) tl.from(bl, { autoAlpha: 0, y: 54, duration: 1.15 }, 0.12);
    if (br) tl.from(br, { autoAlpha: 0, y: 54, duration: 1.15 }, 0.2);
    // плашка — только проявление (её центрирование держится на CSS-transform)
    if (reel) tl.from(reel, { autoAlpha: 0, duration: 0.9, ease: "power2.out" }, 0.55);
  }

  /* ---- nav ---- */
  function nav() {
    const n = document.querySelector(".nav"); if (!n) return;
    let last = 0;
    onScroll((y) => { if (y > last && y > 380) n.classList.add("nav--hidden"); else n.classList.remove("nav--hidden"); last = y; });
    // active link by section
    const links = Array.from(document.querySelectorAll(".nav__pill a[href^='#']"));
    const map = links.map((a) => ({ a, sec: document.querySelector(a.getAttribute("href")) })).filter((x) => x.sec);
    if (map.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { links.forEach((l) => l.classList.remove("is-active")); const m = map.find((x) => x.sec === e.target); m && m.a.classList.add("is-active"); }
      }), { rootMargin: "-45% 0px -50% 0px" });
      map.forEach((x) => io.observe(x.sec));
    }
  }

  /* ---- mobile menu ---- */
  function menu() {
    const b = document.querySelector(".nav__burger"), m = document.querySelector(".menu"); if (!b || !m) return;
    const t = (o) => { b.classList.toggle("is-open", o); m.classList.toggle("is-open", o); lenis && (o ? lenis.stop() : lenis.start()); document.body.style.overflow = o ? "hidden" : ""; };
    b.addEventListener("click", () => t(!m.classList.contains("is-open")));
    m.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => t(false)));
  }

  /* ---- custom cursor ---- */
  function cursor() {
    if (!fine) return;
    const dot = document.createElement("div"); dot.className = "cur";
    const ring = document.createElement("div"); ring.className = "cur-ring";
    const txt = document.createElement("span"); txt.className = "cur-ring__txt"; ring.appendChild(txt);
    document.body.append(dot, ring); document.body.classList.add("cur-on");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function loop() { rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    const hov = "a,button,.iconbtn,input,textarea";
    document.addEventListener("mouseover", (e) => {
      const view = e.target.closest("[data-view]");
      if (view) { ring.classList.add("is-view"); txt.textContent = view.getAttribute("data-view") || "СМОТРЕТЬ"; return; }
      if (e.target.closest(hov)) ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-view]")) ring.classList.remove("is-view");
      if (e.target.closest(hov)) ring.classList.remove("is-hover");
    });
  }

  /* ---- light / dark theme toggle ---- */
  function theme() {
    const btn = document.querySelector("[data-theme-toggle]"); if (!btn) return;
    const root = document.documentElement;
    btn.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.classList.add("theme-anim");
      if (next === "light") root.setAttribute("data-theme", "light"); else root.removeAttribute("data-theme");
      try { localStorage.setItem("theme", next); } catch (e) {}
      setTimeout(function () { root.classList.remove("theme-anim"); }, 450);
    });
  }

  /* ---- hero interaction: курсор «ужимает» бренд через letter-spacing ----
     Буквы сохраняют ВЫСОТУ (font-size не трогаем), меняется плотность между буквами.
     Бренд прибит к --pad (по сетке), плашка двигается отдельно через CSS-переменную
     --reel-shift: считаем сколько px бренд «забрал» с каждой стороны и сдвигаем
     плашку на половину этой разницы, чтобы она оставалась между внутренними краями. */
  function heroInteract() {
    if (reduce) return;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const bl = hero.querySelector(".hero__brand--l");
    const br = hero.querySelector(".hero__brand--r");
    const reel = hero.querySelector(".hero__reel");
    if (!bl || !br) return;
    const BASE = -0.045, K = 0.09; // базовый letter-spacing и амплитуда (em)
    // Базовые ширины и коэффициент сдвига считаем ОДИН раз. Раньше offsetWidth читался
    // в каждом кадре (форс-reflow на огромном тексте) — отсюда и рывки. Теперь сдвиг плашки
    // = staticShift + off * coef — чистая арифметика, без чтения layout в цикле.
    let staticShift = 0, coef = 0;
    function measure() {
      bl.style.letterSpacing = ""; br.style.letterSpacing = "";
      const fontPx = parseFloat(getComputedStyle(bl).fontSize) || 100;
      const baseL = bl.offsetWidth, baseR = br.offsetWidth;
      const nL = (bl.textContent || "").trim().length || 6;
      const nR = (br.textContent || "").trim().length || 7;
      staticShift = (baseL - baseR) / 2;
      coef = (nL + nR) * K * fontPx / 2;
      if (reel) reel.style.setProperty("--reel-shift", staticShift.toFixed(1) + "px");
    }
    measure();
    let target = 0, cur = 0, raf = 0;
    function frame() {
      cur += (target - cur) * 0.14;
      bl.style.letterSpacing = (BASE + cur * K).toFixed(4) + "em";
      br.style.letterSpacing = (BASE - cur * K).toFixed(4) + "em";
      if (reel) reel.style.setProperty("--reel-shift", (staticShift + cur * coef).toFixed(1) + "px");
      if (Math.abs(target - cur) > 0.0015) raf = requestAnimationFrame(frame);
      else { cur = target; raf = 0; }
    }
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      target = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      if (!raf) raf = requestAnimationFrame(frame);
    });
    hero.addEventListener("mouseleave", () => { target = 0; if (!raf) raf = requestAnimationFrame(frame); });
    let rt;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { cur = target = 0; measure(); }, 150);
    }, { passive: true });
  }

  /* ---- detail page hero: кинематографичный камера-зум на фото ---- */
  function detailPage() {
    if (!document.body.classList.contains("page-detail")) return;
    const img = document.querySelector(".detail__hero .detail__img");
    const inner = document.querySelectorAll(".detail__hero .detail__inner > *");
    if (hasGSAP && !reduce && img) {
      gsap.timeline()
        .fromTo(img, { filter: "blur(30px)", scale: 1.05, autoAlpha: 0.5 },
                       { filter: "blur(0px)", scale: 1.12, autoAlpha: 1, duration: 1.3, ease: "power2.out" })
        .to(img, { scale: 1.26, duration: 22, ease: "none" });
      if (inner.length) {
        gsap.fromTo(inner, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.06, delay: 0.25 });
      }
    }
  }

  /* ---- форма заявки: реальная AJAX-отправка через FormSubmit + красивая благодарность ----
     1. POST на https://formsubmit.co/ajax/<email>  — без регистрации, бесплатно.
     2. При первой отправке FormSubmit пришлёт письмо на <email> со ссылкой «Activate Form».
        Один раз кликнуть — и форма активна навсегда.
     3. Замените ENDPOINT и TG_FALLBACK ниже на свой email и свой Telegram-username. */
  function formSubmit() {
    // ⚠️ ЗАМЕНИТЕ на свой email (на него будут приходить заявки):
    const ENDPOINT = "/api/leads";
    // ⚠️ ЗАМЕНИТЕ на свой Telegram (fallback, если AJAX упадёт):
    const TG_FALLBACK = "https://t.me/Bogdanovshow";
    // подставится в заголовок и направление события на детальных страницах
    const EVENT_MAP = {
      weddings: "Свадьба",
      celebrations: "Торжество",
      business: "Деловое мероприятие",
      speaker: "Спикерская сессия",
      organization: "Организация события"
    };
    // авто-заполнение поля «событие» по странице
    (function autofillEvent() {
      const m = location.pathname.match(/\/([^/]+)\.html$/);
      const key = m && m[1];
      if (!key || !EVENT_MAP[key]) return;
      document.querySelectorAll('.req__form [name="event"]').forEach((el) => {
        if (!el.value) el.value = EVENT_MAP[key];
      });
    })();
    function esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function showSuccess(f, name) {
      const card = document.createElement("div");
      card.className = "req__success";
      card.innerHTML =
        '<div class="req__success-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l5 5L20 7"/></svg></div>' +
        '<h3 class="req__success-title">Заявка принята</h3>' +
        '<p class="req__success-text">Спасибо! Перезвоню вам в течение дня — обсудим дату и формат события.</p>' +
        '<div class="req__success-direct">' +
          '<span>Срочно:</span>' +
          '<a href="' + TG_FALLBACK + '" target="_blank" rel="noopener">Telegram</a>' +
          '<a href="tel:+79910862250">+7 (991) 086-22-50</a>' +
        '</div>';
      f.replaceWith(card);
      // прокрутим к карточке плавно
      try { card.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    }
    document.addEventListener("submit", async function (e) {
      const f = e.target.closest && e.target.closest(".req__form");
      if (!f) return;
      e.preventDefault();
      const g = (n) => { const el = f.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; };
      const note = f.querySelector("[data-lead-note]");
      const button = f.querySelector('[type="submit"]');
      // honeypot — если бот заполнил скрытое поле, тихо игнорим
      const honey = f.querySelector('[name="_honey"]');
      if (honey && honey.value) return;
      // валидация: НАСТОЯЩИЙ российский мобильный (+7 9XX XXX-XX-XX), 11 цифр, 2-я = 9
      var pd = ("" + g("contact")).replace(/\D/g, "");
      if (!(pd.length === 11 && pd.charAt(0) === "7" && pd.charAt(1) === "9")) {
        if (note) { note.textContent = "Введите настоящий номер телефона: +7 (9__) ___-__-__"; note.classList.add("req__note--err"); }
        return;
      }
      // согласие на обработку ПД (152-ФЗ) — обязательно
      const consent = f.querySelector('[name="consent"]');
      const consentLabel = consent && consent.closest(".req__consent");
      if (consent && !consent.checked) {
        if (note) { note.textContent = "Поставьте, пожалуйста, галочку согласия на обработку данных."; note.classList.add("req__note--err"); }
        if (consentLabel) consentLabel.classList.add("req__consent--err");
        return;
      }
      if (consentLabel) consentLabel.classList.remove("req__consent--err");
      const payload = {
        name: g("name") || "Заявка по телефону",
        contact: g("contact"),
        event: g("event") || "(не указано)",
        message: g("msg") || "(без сообщения)",
        consent: consent ? "Согласие на обработку ПД получено" : "(чекбокс не выводился)",
        page: location.pathname + " — " + document.title,
        _subject: "Заявка с сайта — " + g("contact"),
        _template: "table",
        _captcha: "false"
      };
      if (button) {
        if (!button.dataset.label) button.dataset.label = button.textContent.trim();
        button.disabled = true; button.textContent = "Отправляю…";
      }
      f.classList.add("is-sending");
      if (note) { note.textContent = ""; note.classList.remove("req__note--err"); }
      try {
        const resp = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && (data.success === true || data.success === "true")) {
          showSuccess(f, payload.name);
        } else {
          throw new Error(data.message || ("HTTP " + resp.status));
        }
      } catch (err) {
        console.error("[req]", err);
        if (button) { button.disabled = false; button.textContent = button.dataset.label || "Отправить заявку"; }
        f.classList.remove("is-sending");
        if (note) {
          note.innerHTML = 'Не удалось отправить — напишите в <a href="' + TG_FALLBACK + '" target="_blank" rel="noopener">Telegram</a>.';
          note.classList.add("req__note--err");
        }
      }
    });
  }

  /* ---- cases: hover -> плавный кроссфейд фонового фото (два слоя) ---- */
  function cases() {
    const sec = document.querySelector(".cases"); if (!sec) return;
    const bgWrap = sec.querySelector(".cases__bg");
    const list = sec.querySelector(".cases__list");
    const names = sec.querySelectorAll(".case-name");
    if (!bgWrap) return;
    const layers = Array.from(bgWrap.querySelectorAll(".cases__bgimg"));
    if (layers.length < 2) return;
    names.forEach((n) => { const s = n.getAttribute("data-img"); if (s) { const im = new Image(); im.src = s; } });
    let front = 0, currentSrc = "";
    function showImg(src) {
      sec.classList.add("is-active");
      if (!src || src === currentSrc) return;
      currentSrc = src;
      const back = front ^ 1;
      const swap = () => { layers[back].classList.add("is-front"); layers[front].classList.remove("is-front"); front = back; };
      layers[back].onload = swap;
      layers[back].src = src;
      if (layers[back].complete) swap();
    }
    names.forEach((n) => {
      const s = n.getAttribute("data-img");
      const on = () => showImg(s);
      n.addEventListener("mouseenter", on);
      n.addEventListener("focus", on);
    });
    if (list) {
      list.addEventListener("mouseleave", () => sec.classList.remove("is-active"));
      list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) sec.classList.remove("is-active"); });
    }
  }

  function year() { document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear())); }

  /* ---- cookie-уведомление (152-ФЗ / cookie): показываем один раз ---- */
  function cookieBanner() {
    var KEY = "bog_cookie_ok";
    var store;
    try { store = window.localStorage; } catch (e) { store = null; }
    if (store && store.getItem(KEY)) return;
    // не дублируем, если разметка уже на странице
    if (document.querySelector(".ckbar")) return;
    var bar = document.createElement("div");
    bar.className = "ckbar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Уведомление об использовании cookie");
    bar.innerHTML =
      '<p class="ckbar__text">Мы используем файлы cookie и обрабатываем данные для работы сайта и аналитики. ' +
      'Оставаясь на сайте, вы соглашаетесь с <a href="cookies.html">политикой cookie</a> и ' +
      '<a href="privacy.html">обработкой персональных данных</a>.</p>' +
      '<div class="ckbar__row">' +
        '<button type="button" class="ckbar__btn ckbar__btn--ok" data-ck="ok">Принять</button>' +
        '<a class="ckbar__btn ckbar__btn--ghost" href="privacy.html">Подробнее</a>' +
      '</div>';
    document.body.appendChild(bar);
    var reveal = function () { bar.classList.add("is-in"); };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    }
    // запасной триггер: rAF может быть приостановлен в неактивной вкладке
    setTimeout(reveal, 60);
    bar.querySelector('[data-ck="ok"]').addEventListener("click", function () {
      try { if (store) store.setItem(KEY, "1"); } catch (e) {}
      bar.classList.remove("is-in");
      setTimeout(function () { bar.remove(); }, 550);
    });
  }

  /* ---- подмена фото сайта из админки (data-img-slot -> /api/images) ---- */
  function siteImages() {
    fetch("/api/images", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (map) {
        if (!map) return;
        document.querySelectorAll("[data-img-slot]").forEach(function (img) {
          var key = img.getAttribute("data-img-slot");
          if (map[key]) img.src = map[key];
        });
        // фавикон из админки (иконка вкладки)
        if (map.favicon) {
          var link = document.querySelector('link[rel~="icon"]');
          if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
          link.removeAttribute("type");
          link.href = map.favicon;
        }
      })
      .catch(function () {});
  }

  /* ---- кейсы «с кем работал» из админки (/api/cases) ---- */
  function siteCases() {
    var sec = document.querySelector(".cases");
    var list = sec && sec.querySelector(".cases__list");
    if (!list) return;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
    fetch("/api/cases", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (items) {
        if (items && items.length) {
          list.innerHTML = items.map(function (c) {
            return '<li><button class="case-name" type="button" data-img="' + esc(c.photo) + '">' + esc(c.name) +
              '<span class="case-name__av"><img src="' + esc(c.logo) + '" alt="" loading="lazy"></span></button></li>';
          }).join("");
        }
      })
      .catch(function () {})
      .then(function () { cases(); });
  }

  /* ---- чат-виджет: бот + оператор (ответы из админки) ---- */
  function chatWidget() {
    if (document.querySelector(".chatw")) return;
    var KEY = "bog_chat_sid", sid;
    try { sid = localStorage.getItem(KEY); } catch (e) {}
    if (!sid) {
      sid = "s" + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
      try { localStorage.setItem(KEY, sid); } catch (e) {}
    }
    var GREETING = "Здравствуйте! 👋 Я помощник Сергея. Спросите про свободные даты, форматы и стоимость — а если что, Сергей ответит лично прямо здесь.";
    var history = [], lastSeq = 0, opened = false, pollTimer = null;

    var w = document.createElement("div");
    w.className = "chatw";
    w.innerHTML =
      '<button class="chatw__btn" type="button" aria-label="Открыть чат"><span class="dot"></span>💬</button>' +
      '<div class="chatw__panel" hidden>' +
        '<div class="chatw__head"><span>Чат с Сергеем</span><button class="chatw__close" type="button" aria-label="Закрыть">×</button></div>' +
        '<div class="chatw__msgs"></div>' +
        '<form class="chatw__form"><input class="chatw__input" type="text" placeholder="Напишите сообщение…" autocomplete="off" maxlength="2000"/><button class="chatw__send" type="submit" aria-label="Отправить">➤</button></form>' +
      '</div>';
    document.body.appendChild(w);
    var panel = w.querySelector(".chatw__panel"),
        msgs = w.querySelector(".chatw__msgs"),
        input = w.querySelector(".chatw__input"),
        form = w.querySelector(".chatw__form");

    function bubble(text, out) {
      var d = document.createElement("div");
      d.className = "chatw__m " + (out ? "chatw__m--out" : "chatw__m--in");
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function render() {
      msgs.innerHTML = "";
      if (!history.length) bubble(GREETING, false);
      else history.forEach(function (m) { bubble(m.text, m.role === "VISITOR"); });
    }
    function ingest(arr) {
      var unread = false;
      arr.forEach(function (m) {
        if (m.seq > lastSeq) {
          lastSeq = m.seq;
          history.push(m);
          if (opened) bubble(m.text, m.role === "VISITOR");
          else if (m.role !== "VISITOR") unread = true;
        }
      });
      if (unread) w.classList.add("has-unread");
    }
    function poll() {
      fetch("/api/chat/poll?sid=" + encodeURIComponent(sid) + "&after=" + lastSeq)
        .then(function (r) { return r.ok ? r.json() : []; }).then(ingest).catch(function () {});
    }
    function startPoll() { if (!pollTimer) pollTimer = setInterval(poll, 6000); }

    function open() { opened = true; panel.hidden = false; w.classList.remove("has-unread"); render(); input.focus(); startPoll(); }
    function close() { opened = false; panel.hidden = true; }

    w.querySelector(".chatw__btn").addEventListener("click", function () { panel.hidden ? open() : close(); });
    w.querySelector(".chatw__close").addEventListener("click", close);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = input.value.trim();
      if (!t) return;
      input.value = "";
      bubble(t, true);
      history.push({ seq: lastSeq + 0.1, role: "VISITOR", text: t });
      fetch("/api/chat/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: sid, text: t }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.replies) d.replies.forEach(function (m) { if (m.seq > lastSeq) lastSeq = m.seq; history.push(m); bubble(m.text, false); });
        })
        .catch(function () { bubble("Не удалось отправить — проверьте соединение.", false); });
    });

    // фоновая инициализация: подтянуть прошлую переписку и ловить ответы оператора
    fetch("/api/chat/poll?sid=" + encodeURIComponent(sid) + "&after=0")
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (arr && arr.length) {
          if (!history.length) history = arr.slice();
          arr.forEach(function (m) { if (m.seq > lastSeq) lastSeq = m.seq; });
          startPoll();
        }
      })
      .catch(function () {});
  }

  /* ---- заявка-комфорт: маска телефона + выбор события чипами ---- */
  function phoneForm() {
    function fmt(raw) {
      var d = ("" + raw).replace(/\D/g, "");
      if (d[0] === "8") d = "7" + d.slice(1);
      if (d[0] !== "7") d = "7" + d;
      d = d.slice(0, 11);
      var p = "+7";
      if (d.length > 1) p += " (" + d.slice(1, 4);
      if (d.length >= 4) p += ") " + d.slice(4, 7);
      if (d.length >= 7) p += "-" + d.slice(7, 9);
      if (d.length >= 9) p += "-" + d.slice(9, 11);
      return p;
    }
    document.querySelectorAll("input[data-phone]").forEach(function (el) {
      el.addEventListener("input", function () { el.value = el.value.replace(/\D/g, "") ? fmt(el.value) : ""; });
      el.addEventListener("focus", function () { if (!el.value) el.value = "+7 "; });
      el.addEventListener("blur", function () { if (el.value.replace(/\D/g, "").length <= 1) el.value = ""; });
    });
    document.querySelectorAll("[data-event-chips]").forEach(function (wrap) {
      var hidden = wrap.parentNode.querySelector('input[name="event"]');
      var chips = wrap.querySelectorAll(".req__chip");
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          chips.forEach(function (c) { c.classList.remove("is-on"); });
          chip.classList.add("is-on");
          if (hidden) hidden.value = chip.getAttribute("data-event");
        });
      });
      // на детальных страницах событие подставляется автозаполнением — отметим чип
      if (hidden && hidden.value) chips.forEach(function (c) {
        if (hidden.value.indexOf(c.getAttribute("data-event")) === 0) c.classList.add("is-on");
      });
    });
  }

  /* ---- защита от копирования фото/текста (мягкая) ---- */
  function antiCopy() {
    root.classList.add("protect");
    document.addEventListener("contextmenu", function (e) {
      if (e.target.closest("input, textarea, a[href]")) return;
      e.preventDefault();
    });
    document.addEventListener("dragstart", function (e) {
      if (e.target.closest("img")) e.preventDefault();
    });
  }

  function boot() { colourise(); heroInteract(); nav(); menu(); cursor(); theme(); formSubmit(); phoneForm(); siteCases(); year(); cookieBanner(); siteImages(); chatWidget(); antiCopy(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

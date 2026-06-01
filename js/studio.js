/* =====================================================================
   ВЕДУЩИЙ — cinematic studio interactions (v2)
   Прогрессивное улучшение: без JS / без CDN сайт остаётся читаемым.
   ===================================================================== */
(function () {
  "use strict";
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const hasGSAP = typeof gsap !== "undefined";
  if (!hasGSAP) root.classList.remove("anim");

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

  /* ---- hero halftone power-on ---- */
  function heroOn() {
    const w = document.querySelector(".hero__word");
    if (!w || !hasGSAP || reduce) return;
    gsap.set(w, { autoAlpha: 0, filter: "blur(14px)" });
    gsap.timeline({ delay: 0.15 })
      .to(w, { autoAlpha: 1, duration: 0.08 }).to(w, { autoAlpha: 0.15, duration: 0.06 })
      .to(w, { autoAlpha: 1, duration: 0.06 }).to(w, { autoAlpha: 0.4, duration: 0.05 })
      .to(w, { autoAlpha: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out" });
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
    const BASE_LS = -0.045; // em — базовый letter-spacing (как в CSS)
    const K_LS = 0.09;      // ±em амплитуда
    const GAPS_L = 5;        // в «Сергей» 6 букв → 5 промежутков
    const GAPS_R = 6;        // в «Ведущий» 7 букв → 6 промежутков
    let target = 0, current = 0, rafId = 0;
    function apply(off) {
      // курсор LEFT (off=-1) → bl плотнее (BASE-K), br шире (BASE+K)
      bl.style.letterSpacing = (BASE_LS + off * K_LS).toFixed(4) + "em";
      br.style.letterSpacing = (BASE_LS - off * K_LS).toFixed(4) + "em";
      // считаем сдвиг плашки на основе изменения ширин:
      // ΔbrL = (+off*K_LS em) * GAPS_L * fontSize → Сергей становится уже/шире (px)
      // ΔbrR = (-off*K_LS em) * GAPS_R * fontSize → Ведущий наоборот
      // правый край Сергея сдвигается на ΔbrL, левый край Ведущий на -ΔbrR
      // центр между ними смещается на (ΔbrL - ΔbrR) / 2
      if (reel) {
        const font = parseFloat(getComputedStyle(bl).fontSize) || 0;
        const dL = off * K_LS * GAPS_L * font;    // знак: + при off+ (Сергей растёт → правый край вправо)
        const dR = -off * K_LS * GAPS_R * font;   // знак: + при off- (Ведущий растёт → левый край влево, в -)
        // фактически левый край Ведущий смещается на -dR относительно его правого края (фиксированного у --pad)
        // центр между Сергея.right и Ведущий.left смещается на (dL + (-dR))/2 = (dL - dR)/2
        const shift = (dL - dR) / 2;
        reel.style.setProperty("--reel-shift", shift.toFixed(2) + "px");
      }
    }
    function tick() {
      const d = target - current;
      current += d * 0.18;
      apply(current);
      if (Math.abs(d) > 0.001) rafId = requestAnimationFrame(tick);
      else { current = target; rafId = 0; }
    }
    function kick() { if (!rafId) rafId = requestAnimationFrame(tick); }
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      target = Math.max(-1, Math.min(1, (x - 0.5) * 2));
      kick();
    });
    hero.addEventListener("mouseleave", () => { target = 0; kick(); });
    addEventListener("resize", () => {
      current = target = 0;
      bl.style.letterSpacing = ""; br.style.letterSpacing = "";
      if (reel) reel.style.removeProperty("--reel-shift");
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
    const ENDPOINT = "https://formsubmit.co/ajax/hello@example.com";
    // ⚠️ ЗАМЕНИТЕ на свой Telegram (fallback, если AJAX упадёт):
    const TG_FALLBACK = "https://t.me/your_username";
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
        '<p class="req__success-text">Спасибо, ' + esc(name) + '. Свяжусь с вами в течение дня — обсудим дату и формат события.</p>' +
        '<div class="req__success-direct">' +
          '<span>Срочно:</span>' +
          '<a href="' + TG_FALLBACK + '" target="_blank" rel="noopener">Telegram</a>' +
          '<a href="tel:+70000000000">+7 (000) 000-00-00</a>' +
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
      // валидация
      if (!g("name") || !g("contact")) {
        if (note) { note.textContent = "Заполните имя и контакт, пожалуйста."; note.classList.add("req__note--err"); }
        return;
      }
      const payload = {
        name: g("name"),
        contact: g("contact"),
        event: g("event") || "(не указано)",
        message: g("msg") || "(без сообщения)",
        page: location.pathname + " — " + document.title,
        _subject: "Заявка с сайта — " + g("name"),
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

  function boot() { reveals(); colourise(); heroOn(); heroInteract(); nav(); menu(); cursor(); theme(); detailPage(); formSubmit(); cases(); year(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

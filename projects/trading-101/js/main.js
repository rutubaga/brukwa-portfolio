/* Трейдинг 101 — интерактив и моушн. Без зависимостей. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = /[?&]static/.test(location.search)
    ? { matches: true, addEventListener() {} } // режим для снимков: всё видно сразу, без анимаций
    : window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- header: прячем при скролле вниз ---------------- */
  const header = $('[data-header]');
  let lastY = window.scrollY;
  const onScrollHeader = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = root.classList.contains('menu-open');
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY && y > 300);
    lastY = y;
  };

  /* ---------------- mobile menu ---------------- */
  const menu = $('[data-menu]');
  const burger = $('[data-menu-open]');
  let menuCloseTimer;
  const openMenu = () => {
    clearTimeout(menuCloseTimer);
    menu.hidden = false;
    root.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    setTimeout(() => $('.menu__close', menu).focus(), 50);
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = (focusBurger = true) => {
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuCloseTimer = setTimeout(() => { menu.hidden = true; }, reduceMotion.matches ? 0 : 550);
    if (focusBurger) burger.focus({ preventScroll: true });
  };
  burger.addEventListener('click', openMenu);
  $$('[data-menu-close]', menu).forEach((el) => el.addEventListener('click', () => closeMenu()));
  $$('[data-menu-link]', menu).forEach((el) => el.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) closeMenu();
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && !menu.hidden) closeMenu(false); });

  /* ---------------- разбивка текста для анимаций ---------------- */
  // слова: сохраняем вложенные span (акцентный цвет) и неразрывные пробелы
  $$('[data-split-words]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/( +)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^ +$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--d', (i++ * 0.035).toFixed(3) + 's');
            w.textContent = p;
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
  });
  $$('[data-split-lines]').forEach((el) => {
    $$('.line > span', el).forEach((s, i) => s.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
  });
  $$('[data-stagger]').forEach((el) => {
    [...el.children].forEach((c, i) => { c.style.transitionDelay = (i * 0.08).toFixed(2) + 's'; });
  });
  $$('.lesson').forEach((el, i) => el.style.setProperty('--d', ((i % 5) * 0.07).toFixed(2) + 's'));
  $$('.why__line > span').forEach((el, i) => el.style.setProperty('--d', (i * 0.08).toFixed(2) + 's'));

  /* ---------------- появление при скролле ---------------- */
  const revealTargets = $$('[data-reveal], [data-stagger], [data-split-lines], [data-split-words], .lesson, .why__headline');
  // небольшая задержка для соседних элементов внутри одного блока
  $$('.split, .tariffs__head, .faq__head, .signup__body, .hero__stage').forEach((group) => {
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', (i * 0.08).toFixed(2) + 's'));
  });

  const afterStagger = (el) => {
    // после появления убираем задержки, чтобы ховеры были мгновенными
    if (el.hasAttribute('data-stagger')) {
      setTimeout(() => [...el.children].forEach((c) => { c.style.transitionDelay = ''; }), 1600);
    }
  };

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        afterStagger(entry.target);
        if (entry.target.matches('[data-count-group], .stats')) runCounters(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => {
      if (el.closest('.hero')) return; // hero анимируется отдельно
      io.observe(el);
    });
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------------- счётчики ---------------- */
  function runCounters(scope) {
    $$('[data-count]', scope).forEach((el) => {
      const to = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const fmt = (v) => pre + v.toFixed(dec).replace('.', ',') + suf;
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(to * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = fmt(0);
      requestAnimationFrame(tick);
    });
  }

  /* ---------------- 3D-объекты в первом экране ---------------- */
  const hero = $('[data-hero]');
  const objs = $$('[data-obj3d]').map((el) => {
    const [bx, by, bz] = el.dataset.base.split(',').map(Number);
    const [ax, ay] = (el.dataset.amp || '8,12').split(',').map(Number);
    const faces = {
      front: $('.f--front', el), back: $('.f--back', el), right: $('.f--right', el),
      left: $('.f--left', el), top: $('.f--top', el), bottom: $('.f--bottom', el),
    };
    const isCube = el.classList.contains('cube');
    return {
      el, bx, by, bz, ax, ay, faces, isCube,
      // старт интро: объект «влетает» с доворотом
      cx: isCube ? -26 : bx + 30, cy: isCube ? -70 : by - 50, cz: bz + (isCube ? -8 : 20), cs: isCube ? 0.86 : 0.9,
    };
  });

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let heroVisible = true;
  let heroProgress = 0; // 0 → hero целиком на экране, 1 → ушёл вверх
  let introStart = 0;
  const INTRO = 1600;

  const rad = (d) => (d * Math.PI) / 180;
  // поворот вектора так же, как CSS: rotateZ(z) rotateX(x) rotateY(y) применяется справа налево
  const rotVec = (v, x, y, z) => {
    let [px, py, pz] = v;
    // rotateY
    let c = Math.cos(rad(y)), s = Math.sin(rad(y));
    [px, pz] = [px * c + pz * s, -px * s + pz * c];
    // rotateX
    c = Math.cos(rad(x)); s = Math.sin(rad(x));
    [py, pz] = [py * c - pz * s, py * s + pz * c];
    // rotateZ
    c = Math.cos(rad(z)); s = Math.sin(rad(z));
    [px, py] = [px * c - py * s, px * s + py * c];
    return [px, py, pz];
  };
  const NORMALS = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, -1, 0], bottom: [0, 1, 0] };
  const LIGHT = (() => { const v = [-0.35, -0.75, 0.55]; const l = Math.hypot(...v); return v.map((n) => n / l); })();

  const shadeFaces = (o, x, y, z) => {
    for (const k in o.faces) {
      const f = o.faces[k];
      if (!f) continue;
      const n = rotVec(NORMALS[k], x, y, z);
      const lit = clamp(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2], 0, 1);
      // фото на кубе почти не затемняем, тёмные грани — сильнее
      const shade = k === 'front' && o.isCube ? (1 - lit) * 0.22 : 0.5 - lit * 0.5;
      f.style.setProperty('--shade', shade.toFixed(3));
    }
  };

  let lastNow = 0;
  const render3d = (now) => {
    const t = introStart ? clamp((now - introStart) / INTRO, 0, 1) : 0;
    const intro = 1 - Math.pow(1 - t, 3);
    // сглаживание по реальному времени: одинаково на 60 и 120 Гц
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 1 / 60;
    lastNow = now;
    const k = 1 - Math.pow(1 - 0.07, dt * 60);
    pointer.x = lerp(pointer.x, pointer.tx, k);
    pointer.y = lerp(pointer.y, pointer.ty, k);
    objs.forEach((o, i) => {
      const dir = i === 1 ? -1 : 1; // правая свеча реагирует зеркально — живее
      const scrollTurn = heroProgress * (o.isCube ? 28 : 40) * dir;
      const tx = o.bx + pointer.y * -o.ax + heroProgress * (o.isCube ? 10 : 18);
      const ty = o.by + pointer.x * o.ay * (o.isCube ? 1 : dir) + scrollTurn;
      const tz = o.bz + pointer.x * (o.isCube ? 2.5 : 4);
      const x = lerp(o.cx, tx, intro);
      const y = lerp(o.cy, ty, intro);
      const z = lerp(o.cz, tz, intro);
      const s = lerp(o.cs, 1, intro);
      const lift = o.isCube ? heroProgress * -60 : heroProgress * (dir > 0 ? -140 : -90);
      o.el.style.transform = `translate3d(0, ${lift.toFixed(1)}px, 0) scale(${s.toFixed(4)}) rotateZ(${z.toFixed(2)}deg) rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
      shadeFaces(o, x, y, z);
    });
  };

  const staticPose = () => {
    objs.forEach((o) => {
      o.el.style.transform = `rotateZ(${o.bz}deg) rotateX(${o.bx}deg) rotateY(${o.by}deg)`;
      shadeFaces(o, o.bx, o.by, o.bz);
    });
  };

  if (hero) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      pointer.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    });
    hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
    }
  }

  // на устройствах без мыши объекты медленно «дышат» по кругу и реагируют на наклон телефона
  const onOrientation = (e) => {
    if (e.gamma == null) return;
    pointer.tx = clamp(e.gamma / 30, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 30, -1, 1);
  };

  /* ---------------- параллакс ---------------- */
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, k: parseFloat(el.dataset.parallax) }));

  /* ---------------- why: кубики крутятся при скролле ---------------- */
  const whyBox = $('[data-why]');
  const whyDice = $$('[data-dice]');

  /* ---------------- главный цикл ---------------- */
  let ticking = false;
  const vh = () => window.innerHeight;
  const frame = (now) => {
    ticking = false;
    if (hero) {
      const r = hero.getBoundingClientRect();
      heroProgress = clamp(-r.top / Math.max(r.height, 1), 0, 1);
    }
    if (!reduceMotion.matches) {
      parallaxEls.forEach(({ el, k }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh() + 200) return;
        const center = r.top + r.height / 2 - vh() / 2;
        el.style.transform = `translate3d(0, ${(center * -k).toFixed(1)}px, 0)`;
      });
      if (whyBox) {
        const r = whyBox.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh()) {
          const p = (r.top + r.height / 2 - vh() / 2) / vh();
          whyDice.forEach((d, i) => {
            const dir = i % 2 ? -1 : 1;
            d.style.transform = `translate3d(0, ${(p * 40 * (i + 1) * 0.6).toFixed(1)}px, 0) rotate(calc(var(--r) + ${(p * 35 * dir).toFixed(1)}deg))`;
          });
        }
      }
    }
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', () => { onScrollHeader(); requestFrame(); }, { passive: true });
  window.addEventListener('resize', requestFrame);

  const loop3d = (now) => {
    if (heroVisible) {
      if (!finePointer.matches && !pointerFromOrientation) {
        const phase = now * 0.00036; // ~0.36 рад/с — медленное «покачивание» без мыши
        pointer.tx = Math.sin(phase) * 0.6;
        pointer.ty = Math.cos(phase * 0.8) * 0.35;
      }
      render3d(now);
    }
    requestAnimationFrame(loop3d);
  };
  let pointerFromOrientation = false;

  const startHero = () => {
    if (!hero) return;
    hero.classList.add('is-ready');
    $$('[data-split-lines], [data-reveal]', hero).forEach((el) => el.classList.add('is-in'));
    if (reduceMotion.matches) { staticPose(); return; }
    introStart = performance.now();
    requestAnimationFrame(loop3d);
    if (!finePointer.matches && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma != null) { pointerFromOrientation = true; onOrientation(e); }
      }, { passive: true });
    }
  };

  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) staticPose(); });

  // ждём шрифты, чтобы заголовок не прыгал во время анимации
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    requestAnimationFrame(startHero);
    requestFrame();
  });
  onScrollHeader();

  /* ---------------- спойлер ---------------- */
  $$('[data-spoiler]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shown = btn.classList.toggle('is-shown');
      btn.setAttribute('aria-label', shown ? 'Скрыть слово' : 'Показать скрытое слово');
    });
  });

  /* ---------------- pills ---------------- */
  const pillRows = $$('[data-pills] .pill-row');
  pillRows.forEach((row) => {
    $('.pill', row).addEventListener('click', () => {
      const willOpen = !row.classList.contains('is-open');
      pillRows.forEach((r) => { r.classList.remove('is-open'); $('.pill', r).setAttribute('aria-expanded', 'false'); });
      if (willOpen) { row.classList.add('is-open'); $('.pill', row).setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------------- программа: раскрыть всю ---------------- */
  const progWrap = $('[data-program]');
  const progBtn = $('[data-program-toggle]');
  if (progWrap && progBtn) {
    const collapsedHeight = () => {
      const items = $$('.lesson', progWrap);
      const fifth = items[4];
      if (!fifth) return progWrap.scrollHeight;
      // + высота затухания, чтобы пятый пункт был виден целиком
      return fifth.offsetTop + fifth.offsetHeight - progWrap.firstElementChild.offsetTop + parseFloat(getComputedStyle(progWrap, '::after').height || 0);
    };
    const setCollapsed = () => { if (!progWrap.classList.contains('is-open')) progWrap.style.height = collapsedHeight() + 'px'; };
    setCollapsed();
    window.addEventListener('resize', () => {
      if (progWrap.classList.contains('is-open')) progWrap.style.height = progWrap.scrollHeight + 'px';
      else setCollapsed();
    });
    progBtn.addEventListener('click', () => {
      const open = !progWrap.classList.contains('is-open');
      progWrap.classList.toggle('is-open', open);
      progWrap.style.height = (open ? progWrap.scrollHeight : collapsedHeight()) + 'px';
      progBtn.setAttribute('aria-expanded', String(open));
      $('[data-more]', progBtn).hidden = open;
      $('[data-less]', progBtn).hidden = !open;
      if (open) $$('.lesson', progWrap).forEach((l, i) => { if (i >= 5) { l.style.setProperty('--d', ((i - 5) * 0.05).toFixed(2) + 's'); l.classList.add('is-in'); } });
      if (!open) {
        const top = progWrap.closest('section').getBoundingClientRect().top + window.scrollY;
        if (window.scrollY > top + 200) window.scrollTo({ top: top - 20, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    });
  }

  /* ---------------- горизонтальные слайдеры ---------------- */
  const makeDraggable = (track) => {
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('is-dragging');
        // докатываем до ближайшей карточки
        const card = track.firstElementChild;
        if (card) {
          const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
          track.scrollTo({ left: Math.round(track.scrollLeft / step) * step, behavior: 'smooth' });
        }
      }
    });
  };

  const slider = $('[data-slider]');
  if (slider) {
    const track = $('.slider__track', slider);
    const prev = $('[data-slider-prev]');
    const next = $('[data-slider-next]');
    const step = () => {
      const card = track.firstElementChild;
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : 200;
    };
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    makeDraggable(track);
  }
  $$('.how__scroller, [data-reviews-slider], .about__cards-wrap').forEach((el) => makeDraggable(el.firstElementChild || el));

  /* ---------------- отзывы: модальное окно ---------------- */
  const modal = $('[data-modal]');
  if (modal) {
    $$('[data-review-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.review');
        $('[data-modal-avatar]', modal).src = $('.review__head img', card).src;
        $('[data-modal-name]', modal).textContent = $('.review__name', card).textContent;
        $('[data-modal-plan]', modal).textContent = $('.review__plan', card).textContent;
        const text = $('[data-modal-text]', modal);
        text.innerHTML = '';
        $$('[data-review-text] p', card).forEach((p) => text.appendChild(p.cloneNode(true)));
        if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
      });
    });
    $('[data-modal-close]', modal).addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  }

  /* ---------------- FAQ ---------------- */
  $$('[data-faq] .qa').forEach((qa) => {
    const btn = $('.qa__q', qa);
    btn.addEventListener('click', () => {
      const open = qa.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------- форма ---------------- */
  const form = $('[data-form]');
  if (form) {
    const phone = $('[data-phone]', form);
    const planInput = $('[data-plan-input]', form);

    const formatPhone = (value) => {
      const v = value.trim();
      // местная часть номера (10 цифр после +7)
      let local = v.startsWith('+7') ? v.slice(2).replace(/\D/g, '') : v.replace(/\D/g, '');
      if (!v.startsWith('+7') && /^[78]/.test(local) && local.length > 1) local = local.slice(1);
      // ввели номер целиком с «8» или «7» в начале — лишняя цифра отбрасывается
      if (local.length > 10 && /^[78]/.test(local)) local = local.slice(1);
      local = local.slice(0, 10);
      if (!local) return v.startsWith('+') ? '+7 (' : '';
      let out = '+7 (' + local.slice(0, 3);
      if (local.length >= 3) out += ')';
      if (local.length > 3) out += ' ' + local.slice(3, 6);
      if (local.length > 6) out += '-' + local.slice(6, 8);
      if (local.length > 8) out += '-' + local.slice(8, 10);
      return out;
    };
    phone.addEventListener('input', () => {
      const pos = phone.selectionStart === phone.value.length;
      phone.value = formatPhone(phone.value);
      if (pos) phone.setSelectionRange(phone.value.length, phone.value.length);
    });
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 ('; });
    phone.addEventListener('blur', () => { if (phone.value.replace(/\D/g, '').length <= 1) phone.value = ''; });

    const setError = (input, msg) => {
      const field = input.closest('.field, .consent');
      field.classList.toggle('is-invalid', Boolean(msg));
      const err = $('.field__error', field);
      if (err) err.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const validate = () => {
      let ok = true;
      const name = form.elements.name;
      const nameVal = name.value.trim();
      if (nameVal.length < 2 || !/^[A-Za-zА-Яа-яЁё\s'-]+$/.test(nameVal)) { setError(name, 'Напишите, как к вам обращаться'); ok = false; } else setError(name, '');
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length !== 11 || digits[0] !== '7') { setError(phone, 'Проверьте номер: нужно 10 цифр после +7'); ok = false; } else setError(phone, '');
      const consent = form.elements.consent;
      consent.closest('.consent').classList.toggle('is-invalid', !consent.checked);
      if (!consent.checked) ok = false;
      return ok;
    };
    ['input', 'change'].forEach((ev) => form.addEventListener(ev, (e) => {
      if (form.dataset.tried) validate();
      if (e.target === form.elements.consent) e.target.closest('.consent').classList.remove('is-invalid');
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.dataset.tried = '1';
      if (!validate()) {
        const bad = $('[aria-invalid="true"]', form) || form.elements.consent;
        bad.focus();
        return;
      }
      const btn = $('.form__submit', form);
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      // TODO: подключить отправку (Telegram-бот / почта / CRM). Пока — имитация.
      setTimeout(() => {
        btn.textContent = 'Отправить заявку';
        btn.disabled = false;
        form.reset();
        delete form.dataset.tried;
        $('.form__success', form).hidden = false;
      }, 700);
    });

    // кнопки тарифов подставляют выбранный тариф в форму
    $$('[data-plan]').forEach((a) => a.addEventListener('click', () => {
      planInput.value = a.dataset.plan;
      setTimeout(() => form.elements.name.focus({ preventScroll: true }), 700);
    }));
  }
})();

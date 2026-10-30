/* ============================================================
   PORTFOLIO V2 — Semua efek & interaksi (JavaScript murni)
   Tidak perlu install apa pun. Berkas ini boleh diabaikan
   saat Anda hanya ingin mengganti teks (edit index.html).
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const CONFIG = window.SITE_CONFIG || {};

  /* ============================================================
     1. SOUND — efek suara tanpa file (Web Audio API)
     ============================================================ */
  const Sound = (function () {
    const VOLUME = 1.5; // GANTI: 0.5 = pelan, 1 = normal, 2 = kencang
    let ctx = null;
    let muted = false;
    try {
      muted = localStorage.getItem('site_muted') === '1';
    } catch (e) {
      /* abaikan */
    }

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, gain, slide) {
      if (muted) return;
      const audio = ensure();
      if (!audio) return;
      try {
        const osc = audio.createOscillator();
        const amp = audio.createGain();
        const now = audio.currentTime;
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, now);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
        amp.gain.setValueAtTime(gain || 0.03, now);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(amp);
        amp.connect(audio.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      } catch (e) {
        /* abaikan */
      }
    }

    return {
      hover: () => tone(520, 0.05, 'square', 0.12 * VOLUME),
      click: () => tone(300, 0.08, 'square', 0.16 * VOLUME, -120),
      success: () => {
        tone(520, 0.09, 'triangle', 0.18 * VOLUME);
        setTimeout(() => tone(780, 0.12, 'triangle', 0.18 * VOLUME), 90);
      },
      error: () => tone(220, 0.16, 'sawtooth', 0.14 * VOLUME, -120),
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        try {
          localStorage.setItem('site_muted', muted ? '1' : '0');
        } catch (e) {
          /* abaikan */
        }
        if (!muted) this.hover();
        return muted;
      },
    };
  })();

  /* ============================================================
     2. TOAST — notifikasi kecil
     ============================================================ */
  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 2200);
  }

  /* ============================================================
     3. PRELOADER — boot screen + partikel membentuk nama
     ============================================================ */
  (function preloader() {
    const el = $('#preloader');
    const canvas = $('#preloader-canvas');
    const percentEl = $('#preloader-percent');
    const fillEl = $('#preloader-fill');
    if (!el) return;

    const finish = () => {
      el.classList.add('is-done');
      setTimeout(() => el.remove(), 600);
    };

    if (REDUCED) {
      finish();
      return;
    }

    const DURATION = 2000;
    const start = performance.now();
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf = null;
    let doneTimer = null;

    function sampleTargets() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const name = ($('.hero__name') ? $('.hero__name').innerText : 'PORTFOLIO')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      const fontSize = Math.min(w / (name.length * 0.6), 96);
      octx.font = '900 ' + fontSize + 'px Inter, sans-serif';
      octx.fillStyle = '#000';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText(name, w / 2, h / 2);

      const data = octx.getImageData(0, 0, w, h).data;
      const points = [];
      const gap = w < 640 ? 5 : 4;
      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          if (data[(y * w + x) * 4 + 3] > 128) points.push({ x: x, y: y });
        }
      }
      return points.map((p) => ({
        tx: p.x,
        ty: p.y,
        x: Math.random() * w,
        y: Math.random() * h,
        d: Math.random() * 0.35,
      }));
    }

    particles = sampleTargets();
    const lines = $$('.preloader__line', el);

    function loop(now) {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.round(eased * 100);

      if (percentEl) percentEl.textContent = String(pct).padStart(3, '0');
      if (fillEl) fillEl.style.width = pct + '%';
      lines.forEach((line) => {
        if (pct > Number(line.dataset.step)) line.classList.add('is-shown');
      });

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0d0d0d';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const local = Math.min(Math.max((eased - p.d) / (1 - p.d), 0), 1);
        const x = p.x + (p.tx - p.x) * local;
        const y = p.y + (p.ty - p.y) * local;
        ctx.globalAlpha = 0.25 + local * 0.75;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      if (t < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        doneTimer = setTimeout(finish, 550);
      }
    }

    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', () => {
      particles = sampleTargets();
    });
    window.addEventListener(
      'beforeunload',
      () => {
        cancelAnimationFrame(raf);
        clearTimeout(doneTimer);
      },
      { once: true },
    );
  })();

  /* ============================================================
     4. MATRIX RAIN — hujan karakter di hero
     ============================================================ */
  (function matrixRain() {
    const canvas = $('#matrix-rain');
    if (!canvas || REDUCED) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const CHARS = 'アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 14;
    let columns = 0;
    let drops = [];
    let w = 0;
    let h = 0;
    let last = 0;
    let raf = null;

    function resize() {
      const parent = canvas.parentElement;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(1, Math.floor(w / fontSize));
      drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    }

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (now - last < 42) return;
      last = now;
      ctx.fillStyle = 'rgba(245,245,245,0.09)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(13,13,13,0.35)';
      ctx.font = fontSize + 'px "Space Mono", monospace';
      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
    }

    resize();
    new ResizeObserver(resize).observe(canvas.parentElement);
    raf = requestAnimationFrame(draw);
    window.addEventListener('beforeunload', () => cancelAnimationFrame(raf), { once: true });
  })();

  /* ============================================================
     5. DOT GRID — titik reaktif terhadap mouse
     ============================================================ */
  (function dotGrid() {
    const canvas = $('#dot-grid');
    if (!canvas || REDUCED) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    const gap = 34;
    let w = 0;
    let h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      for (let y = gap; y < h; y += gap) {
        for (let x = gap; x < w; x += gap) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const near = dist < 150;
          const alpha = near ? 0.06 + (1 - dist / 150) * 0.5 : 0.06;
          const size = near ? 2.6 : 1.6;
          ctx.fillStyle = 'rgba(13,13,13,' + alpha + ')';
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener(
      'pointermove',
      (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true },
    );
    window.addEventListener('pointerleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    requestAnimationFrame(draw);
  })();

  /* ============================================================
     6. CURSOR TRAIL — jejak pixel (desktop saja)
     ============================================================ */
  (function cursorTrail() {
    const canvas = $('#cursor-trail');
    if (!canvas || REDUCED || !FINE_POINTER) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const trail = [];
    let w = 0;
    let h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.life -= 0.045;
        if (p.life <= 0) continue;
        const size = 3 + p.life * 3;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
      }
      ctx.globalAlpha = 1;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener(
      'pointermove',
      (e) => {
        trail.push({ x: e.clientX, y: e.clientY, life: 1 });
        if (trail.length > 22) trail.shift();
      },
      { passive: true },
    );
    requestAnimationFrame(draw);
  })();

  /* ============================================================
     7. TYPEWRITER — peran berputar di hero
     ============================================================ */
  (function typewriter() {
    const target = $('#typewriter');
    const roleEl = $('[data-roles]');
    if (!target || !roleEl) return;
    const words = (roleEl.dataset.roles || '').split('|').filter(Boolean);
    if (!words.length) return;

    if (REDUCED || words.length === 1) {
      target.textContent = words[0];
      return;
    }

    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = false;

    function tick() {
      const word = words[wordIndex];
      if (!deleting) {
        charIndex += 1;
        target.textContent = word.slice(0, charIndex);
        if (charIndex >= word.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
        setTimeout(tick, 70);
      } else {
        charIndex -= 1;
        target.textContent = word.slice(0, charIndex);
        if (charIndex <= 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, 35);
      }
    }

    target.textContent = words[0];
    setTimeout(tick, 1600);
  })();

  /* ============================================================
     8. SCRAMBLE — judul section teracak saat muncul
     ============================================================ */
  (function scramble() {
    const GLYPHS = '!<>-_\\/[]{}—=+*^?#________';
    const els = $$('[data-scramble]');
    if (!els.length) return;

    if (REDUCED) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          io.unobserve(el);
          const text = el.textContent;
          let frame = 0;
          const timer = setInterval(() => {
            frame += 1;
            const revealed = Math.floor(frame / 2);
            if (revealed >= text.length) {
              el.textContent = text;
              clearInterval(timer);
              return;
            }
            el.textContent = text
              .split('')
              .map((ch, i) => {
                if (ch === ' ') return ' ';
                if (i < revealed) return text[i];
                return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              })
              .join('');
          }, 28);
        });
      },
      { threshold: 0.4 },
    );
    els.forEach((el) => io.observe(el));
  })();

  /* ============================================================
     9. REVEAL — animasi muncul saat scroll
     ============================================================ */
  (function reveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (REDUCED) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => io.observe(el));
  })();

  /* ============================================================
     10. HEADER — auto-hide saat scroll + menu mobile
     ============================================================ */
  (function header() {
    const header = $('#site-header');
    const menuBtn = $('#menu-toggle');
    const menu = $('#mobile-menu');
    let lastY = window.scrollY;

    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        if (y > 140 && y > lastY) header.classList.add('is-hidden');
        else header.classList.remove('is-hidden');
        lastY = y;
      },
      { passive: true },
    );

    if (menuBtn && menu) {
      menuBtn.addEventListener('click', () => {
        Sound.click();
        const open = menu.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.textContent = open ? '[ Close ]' : '[ Menu ]';
      });
      $$('a', menu).forEach((a) =>
        a.addEventListener('click', () => {
          menu.classList.remove('is-open');
          menuBtn.setAttribute('aria-expanded', 'false');
          menuBtn.textContent = '[ Menu ]';
        }),
      );
    }

    // suara hover untuk tautan, tombol & kartu/chip yang punya efek hover
    $$('a, button, .stat, .timeline__item, .project-card, .skill-group__items .chip').forEach((el) => {
      el.addEventListener('mouseenter', () => Sound.hover());
    });
  })();

  /* ============================================================
     11. SOUND TOGGLE
     ============================================================ */
  (function soundToggle() {
    const btn = $('#sound-toggle');
    if (!btn) return;
    const render = (muted) => {
      btn.textContent = muted ? 'Sound Off' : 'Sound On';
      btn.setAttribute('aria-pressed', String(muted));
    };
    render(Sound.isMuted());
    btn.addEventListener('click', () => {
      render(Sound.toggle());
    });
  })();

  /* ============================================================
     12. SMOOTH ANCHOR SCROLL
     ============================================================ */
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
  });

  /* ============================================================
     13. PROJECTS — filter, split-zone badge, parallax nomor
     ============================================================ */
  (function projects() {
    const cards = $$('.project-card');
    const filters = $$('.filter');

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        Sound.click();
        filters.forEach((f) => {
          f.classList.remove('is-active');
          f.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        const wanted = btn.dataset.filter;
        cards.forEach((card) => {
          const show = wanted === 'All' || card.dataset.category === wanted;
          card.classList.toggle('is-hidden', !show);
        });
      });
    });

    // parallax nomor besar di kartu
    const nums = $$('[data-parallax]');
    if (nums.length && !REDUCED) {
      let ticking = false;
      const update = () => {
        const vh = window.innerHeight;
        nums.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > vh + 100) return;
          const center = rect.top + rect.height / 2;
          const progress = (vh / 2 - center) / vh;
          el.style.transform = 'translateY(' + progress * 50 + 'px)';
        });
        ticking = false;
      };
      window.addEventListener(
        'scroll',
        () => {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        },
        { passive: true },
      );
      update();
    }
  })();

  /* ============================================================
     14. COPY EMAIL + toast
     ============================================================ */
  (function copyEmail() {
    const btn = $('#copy-email');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        Sound.success();
        toast('Email copied');
      } catch (e) {
        // fallback untuk browser lama
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        Sound.success();
        toast('Email copied');
      }
    });
  })();

  /* ============================================================
     15. FORM KONTAK — validasi + kirim (Formspree / demo)
     ============================================================ */
  (function contactForm() {
    const form = $('#contact-form');
    const success = $('#form-success');
    const retry = $('#form-retry');
    const submitBtn = $('#form-submit');
    if (!form) return;

    function setError(name, msg) {
      const el = $('[data-error-for="' + name + '"]', form);
      if (el) el.textContent = msg || '';
    }

    function validate(values) {
      const errors = {};
      if (!values.name || values.name.trim().length < 2) errors.name = 'Please enter at least 2 characters';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Please enter a valid email address';
      if (!values.message || values.message.trim().length < 10) errors.message = 'Message should be at least 10 characters';
      if (values.message && values.message.length > 1000) errors.message = 'Message is too long (max 1000)';
      return errors;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = {
        name: form.name.value,
        email: form.email.value,
        message: form.message.value,
      };
      const errors = validate(values);
      ['name', 'email', 'message'].forEach((k) => setError(k, errors[k]));
      if (Object.keys(errors).length) {
        Sound.error();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        if (CONFIG.formspreeId) {
          const res = await fetch('https://formspree.io/f/' + CONFIG.formspreeId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(values),
          });
          if (!res.ok) throw new Error('bad response');
        } else {
          // mode demo: tanpa Formspree, langsung sukses
          await new Promise((r) => setTimeout(r, 900));
          const note = $('.form-success__note', success);
          if (note) note.hidden = false;
        }

        Sound.success();
        toast('Message Received!');
        form.hidden = true;
        success.hidden = false;
        confetti();
      } catch (err) {
        Sound.error();
        toast('Submission Failed. Please try again.');
        const note = $('.form-success__note', success);
        if (note) note.textContent = '// submission failed — check your Formspree ID';
        if (note) note.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });

    retry.addEventListener('click', () => {
      Sound.click();
      form.reset();
      form.hidden = false;
      success.hidden = true;
    });
  })();

  /* ============================================================
     16. CONFETTI mini (tanpa library)
     ============================================================ */
  function confetti() {
    if (REDUCED) return;
    const colors = ['#0d0d0d', '#ff00c1', '#00fff9', '#ffd700', '#22c55e'];
    for (let i = 0; i < 120; i++) {
      const piece = document.createElement('span');
      piece.style.cssText =
        'position:fixed;left:50%;top:70%;width:8px;height:8px;z-index:9999;pointer-events:none;' +
        'background:' +
        colors[i % colors.length] +
        ';';
      document.body.appendChild(piece);
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 320;
      piece.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          {
            transform:
              'translate(' +
              Math.cos(angle) * dist +
              'px,' +
              (Math.sin(angle) * dist - 200 + Math.random() * 300) +
              'px) rotate(' +
              (Math.random() * 720 - 360) +
              'deg)',
            opacity: 0,
          },
        ],
        { duration: 1400 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.3,1)' },
      ).onfinish = () => piece.remove();
    }
  }

  /* ============================================================
     18. RESUME MODAL
     ============================================================ */
  (function resumeModal() {
    const modal = $('#resume-modal');
    const openBtn = $('#open-resume');
    const closeBtn = $('#resume-close');
    if (!modal || !openBtn) return;

    const iframe = $('iframe', modal);
    const fallback = $('.modal__fallback', modal);
    const fallbackTitle = $('#fallback-title');
    let checked = false;
    let available = false;

    function checkPdf() {
      if (checked) return Promise.resolve(available);
      checked = true;
      return fetch('resume.pdf', { method: 'HEAD' })
        .then((res) => {
          available = res.ok;
          if (available && iframe) iframe.hidden = false;
          if (fallback) fallback.hidden = available;
          return available;
        })
        .catch(() => {
          available = false;
          return false;
        });
    }

    function open() {
      Sound.click();
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      checkPdf().then((ok) => {
        if (!ok && fallbackTitle) fallbackTitle.textContent = 'Preview Unavailable';
      });
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      Sound.click();
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
    checkPdf();
  })();

  /* ============================================================
     18b. PROJECT MODAL — klik kartu → detail
     ============================================================ */
  (function projectModal() {
    const modal = $('#project-modal');
    if (!modal) return;
    const content = $('#project-modal-content');
    const titleEl = $('#project-modal-title');
    const actions = $('#project-modal-actions');
    const closeBtn = $('#project-close');

    function open(card) {
      Sound.click();
      const h3 = $('h3', card);
      if (titleEl) titleEl.textContent = (h3 ? h3.textContent.trim() : 'project') + ' — detail';

      content.innerHTML = '';
      const shot = card.dataset.img;
      if (shot) {
        const wrap = document.createElement('div');
        wrap.className = 'project-modal__shot';
        const img = document.createElement('img');
        img.src = shot;
        img.alt = (h3 ? h3.textContent.trim() : 'project') + ' — preview';
        wrap.appendChild(img);
        content.appendChild(wrap);
      }
      const tags = $('.project-card__tags', card);
      if (tags) content.appendChild(tags.cloneNode(true));
      if (h3) content.appendChild(h3.cloneNode(true));
      const tagline = $('.project-card__tagline', card);
      if (tagline) content.appendChild(tagline.cloneNode(true));
      const desc = $('.body-text', card);
      if (desc) content.appendChild(desc.cloneNode(true));
      const tech = $('.tech-tags', card);
      if (tech) content.appendChild(tech.cloneNode(true));

      actions.innerHTML = '';
      const mkBtn = (href, label, ghost) => {
        const a = document.createElement('a');
        a.className = 'btn' + (ghost ? ' btn--ghost' : '');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = label;
        actions.appendChild(a);
      };
      if (card.dataset.source) mkBtn(card.dataset.source, 'Source Code', true);
      if (card.dataset.live) mkBtn(card.dataset.live, 'Live Demo', false);

      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      Sound.click();
    }

    if (closeBtn) closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    $$('.project-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        open(card);
      });
    });
  })();

  /* ============================================================
     19. SCROLL TOP — lingkaran progres
     ============================================================ */
  (function scrollTop() {
    const btn = $('#scroll-top');
    const ring = $('#scroll-progress');
    const pctEl = $('#scroll-percent');
    if (!btn) return;
    const CIRC = 131.9;

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      btn.classList.toggle('is-visible', window.scrollY > 400);
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - p));
      if (pctEl) pctEl.textContent = Math.round(p * 100) + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    btn.addEventListener('click', () => {
      Sound.click();
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    update();
  })();

  /* ============================================================
     20. TAHUN OTOMATIS DI FOOTER
     ============================================================ */
  (function year() {
    const el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();
})();

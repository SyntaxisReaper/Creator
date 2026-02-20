// Ritesh Kumar Mishra — Portfolio Interactions
(function () {
  const root = document.documentElement;
  const body = document.body;
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // IntersectionObserver for reveal-on-scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Brand logo fallback: try several file types in /logo
  const brandImg = document.getElementById('brand-logo');
  if (brandImg) {
    const candidates = ['logo/brand.svg', 'logo/brand.png', 'logo/brand.jpg', 'logo/brand.jpeg', 'logo/brand.webp'];
    (function tryNext(i) {
      if (i >= candidates.length) return;
      const test = new Image();
      test.onload = () => { brandImg.src = candidates[i]; };
      test.onerror = () => tryNext(i + 1);
      test.src = candidates[i] + `?v=${Date.now()}`;
    })(0);
  }

  // Skill bar animation removed

  // Custom cursor that follows the mouse
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');
  if (window.matchMedia('(pointer: fine)').matches && cursorDot && cursorOutline) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;

    const speed = 0.18; // trailing speed for outline

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    function animate() {
      outlineX += (mouseX - outlineX) * speed;
      outlineY += (mouseY - outlineY) * speed;
      cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
      requestAnimationFrame(animate);
    }
    animate();

    // Enlarge outline when hovering interactive elements
    const interactive = 'a, button, .btn, .chip, .nav-link, .card';
    document.querySelectorAll(interactive).forEach((el) => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
    });
  }

  // Parallax blobs on mouse move (subtle)
  const blobs = document.querySelectorAll('.blob');
  if (blobs.length) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      blobs.forEach((b, i) => {
        const intensity = (i + 1) * 3; // different per blob
        b.style.transform = `translate(${x * intensity}px, ${y * intensity}px)`;
      });
    });
  }

  // Contact form -> fetch API handler
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        if (status) status.textContent = 'Please fill in all fields.';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      if (status) status.textContent = '';

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, message }),
        });

        if (response.ok) {
          if (status) status.textContent = "Message sent successfully! I'll be in touch soon.";
          form.reset();
        } else {
          if (status) status.textContent = "Failed to send message. Please try again later.";
        }
      } catch (error) {
        if (status) status.textContent = "Failed to send message. Please try again later.";
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Mobile navigation toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  function setMenu(open) {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navMenu.classList.toggle('open', open);
    document.body.classList.toggle('no-scroll', open);
  }
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      setMenu(!isOpen);
    });
    // Close menu when a nav link is clicked
    navMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMenu(false));
    });
    // Close on escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
    // Reset on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  // Auto-gallery loader: looks for images named images/gallery-01.png, gallery-02.jpg, etc.
  const galleryContainer = document.getElementById('gallery-grid');
  if (galleryContainer) {
    const MAX = 30;
    const exts = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'];

    // Map specific gallery items to external project links
    const projectLinks = {
      'gallery-01': { action: 'modal', target: '#vcaas-modal', title: 'VCaaS - Voice Clone as a Service' },
      'gallery-02': { url: 'https://travelogy-3p9x.vercel.app', title: 'TraveLogy' },
      'gallery-03': { url: 'https://fit-genie-taupe.vercel.app/', title: 'Fit Genie - AI Smart Wardrobe' }
    };

    function addItem(base, src) {
      const fig = document.createElement('figure');
      fig.className = 'gallery-item reveal';
      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      img.alt = 'Portfolio image';

      const meta = projectLinks[base];
      if (meta) {
        const a = document.createElement('a');
        if (meta.action === 'modal') {
          a.href = '#';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.querySelector(meta.target);
            if (modal) {
              modal.classList.add('open');
              document.body.classList.add('no-scroll');
            }
          });
        } else {
          a.href = meta.url;
          a.target = '_blank';
          a.rel = 'noopener';
        }
        a.className = 'gallery-link';
        a.setAttribute('aria-label', `Open project: ${meta.title || 'Project'}`);
        a.appendChild(img);

        // Visible badge with project title
        const badge = document.createElement('span');
        badge.className = 'project-badge';
        badge.textContent = `${meta.title || 'Project'} ${meta.action === 'modal' ? '→' : '↗'}`;
        a.appendChild(badge);

        fig.appendChild(a);
        fig.classList.add('is-linked');
      } else {
        fig.appendChild(img);
      }

      galleryContainer.appendChild(fig);
      // apply reveal animation
      if (typeof observer !== 'undefined') {
        observer.observe(fig);
      }
    }

    exts.forEach((ext) => {
      for (let i = 1; i <= MAX; i++) {
        const num = String(i).padStart(2, '0');
        const base = `gallery-${num}`;
        const src = `images/${base}.${ext}`;
        const test = new Image();
        test.onload = () => addItem(base, src);
        test.onerror = () => { };
        // cache-bust during development so new files show up on refresh
        test.src = src + `?v=${Date.now()}`;
      }
    });
  }

  // Code box typing effect (skills & experience)
  const codeBox = document.getElementById('code-box');
  const codeOut = document.getElementById('code-output');
  if (codeBox && codeOut) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines = [
      '$ whoami',
      'Freelance Developer & Code Generalist',
      '$ ls -la skills/',
      'drwxr-xr-x  HTML & CSS      4yrs',
      'drwxr-xr-x  Java            3years',
      'drwxr-xr-x  React           2months',
      'drwxr-xr-x  Python          3months'
    ];

    function startTyping() {
      if (prefersReduced) {
        codeOut.textContent = lines.join('\n');
        return;
      }
      const textNode = document.createTextNode('');
      const caret = document.createElement('span');
      caret.className = 'caret';
      codeOut.appendChild(textNode);
      codeOut.appendChild(caret);

      let li = 0, ci = 0;
      function step() {
        if (li >= lines.length) return; // done
        const current = lines[li];
        if (ci <= current.length) {
          textNode.data = lines.slice(0, li).join('\n') + (li ? '\n' : '') + current.slice(0, ci);
          ci++;
          setTimeout(step, current[ci - 2] === ' ' ? 15 : 24);
        } else {
          // line complete
          li++; ci = 0;
          if (li < lines.length) setTimeout(step, 280); // pause between lines
        }
      }
      step();
    }

    const codeObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          startTyping();
          codeObs.unobserve(codeBox);
        }
      });
    }, { threshold: 0.25 });
    codeObs.observe(codeBox);
  }

  // Canvas star particles with soft collisions
  const canvas = document.getElementById('bg-canvas');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;
    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth = window.innerWidth;
      h = canvas.clientHeight = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let STAR_COUNT = Math.max(50, Math.min(100, Math.floor(Math.max(w, h) / 14)));
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 1.2 + 0.4
    }));

    const mouse = { x: -9999, y: -9999, active: false };
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
    window.addEventListener('mouseleave', () => { mouse.active = false; });

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // Update and draw stars
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const s of stars) {
        if (mouse.active) {
          const dx = s.x - mouse.x; const dy = s.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          const influence = dist2 > 1 ? Math.min(80000 / dist2, 0.25) : 0;
          s.vx += (dx > 0 ? 1 : -1) * 0.0005 * influence;
          s.vy += (dy > 0 ? 1 : -1) * 0.0005 * influence;
        }
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0 || s.x > w) s.vx *= -1;
        if (s.y < 0 || s.y > h) s.vy *= -1;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }

      // Connections and soft collisions
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          const maxDist = 120;
          if (d2 < maxDist * maxDist) {
            const alpha = 1 - Math.sqrt(d2) / maxDist;
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

            // tiny spark when very close
            if (d2 < 22 * 22) {
              const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
              ctx.fillStyle = 'rgba(167,139,250,0.6)';
              ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
              const ax = dx * 0.002, ay = dy * 0.002; a.vx += ax; a.vy += ay; b.vx -= ax; b.vy -= ay;
            }
          }
        }
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Modal Close Logic
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('open');
        document.body.classList.remove('no-scroll');
      }
    });
  });
})();

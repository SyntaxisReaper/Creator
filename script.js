// Ritesh Kumar Mishra — Portfolio Interactions
(function () {
  const root = document.documentElement;
  const body = document.body;
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const themeToggle = document.getElementById('theme-toggle');
  const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
  const sectionLinks = new Map(navLinks.map((link) => [link.getAttribute('href').slice(1), link]));

  const themes = [
    { id: 'mono', label: 'Mono' },
    { id: '', label: 'Aurora' },
  ];

  function applyTheme(themeId) {
    const theme = themes.find((entry) => entry.id === themeId) || themes[0];
    if (theme.id) {
      body.setAttribute('data-theme', theme.id);
    } else {
      body.removeAttribute('data-theme');
    }
    if (themeToggle) {
      themeToggle.textContent = theme.label;
      themeToggle.setAttribute('aria-label', `Change color theme. Current theme: ${theme.label}`);
    }
    try {
      localStorage.setItem('portfolio-theme', theme.id);
    } catch (error) {
      // Ignore storage failures in private or restricted browsing modes.
    }
  }

  try {
    applyTheme(localStorage.getItem('portfolio-theme') || 'mono');
  } catch (error) {
    applyTheme('mono');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = body.getAttribute('data-theme') || '';
      const nextThemeIndex = (themes.findIndex((entry) => entry.id === currentTheme) + 1) % themes.length;
      applyTheme(themes[nextThemeIndex].id);
    });
  }

  function setActiveSection(id) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    const visibleSections = entries.filter((entry) => entry.isIntersecting);
    if (!visibleSections.length) return;
    visibleSections.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    const topSection = visibleSections[0].target.id;
    if (topSection && sectionLinks.has(topSection)) {
      setActiveSection(topSection);
    }
  }, { threshold: [0.35, 0.55, 0.7] });

  // Observe all named sections AND the hero <main id="home"> element
  document.querySelectorAll('section[id], main[id]').forEach((section) => sectionObserver.observe(section));
  setActiveSection('home');

  // Scroll-driven reveal-on-scroll so elements can fade in and fade out smoothly.
  const revealItems = Array.from(document.querySelectorAll('.reveal'));
  let revealFrame = 0;

  function updateRevealStates() {
    revealFrame = 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const enterLine = viewportHeight * 0.84;
    const exitLine = viewportHeight * 0.12;

    revealItems.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.bottom > exitLine && rect.top < enterLine;
      element.classList.toggle('visible', isVisible);
    });
  }

  function scheduleRevealUpdate() {
    if (revealFrame) return;
    revealFrame = window.requestAnimationFrame(updateRevealStates);
  }

  window.addEventListener('scroll', scheduleRevealUpdate, { passive: true });
  window.addEventListener('resize', scheduleRevealUpdate);
  scheduleRevealUpdate();

  // Brand logo fallback: try several file types in /logo
  const brandImg = document.getElementById('brand-logo');
  if (brandImg) {
    brandImg.src = 'logo/Brand.png';
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

  // Journey timeline is now a vertical list — no JS tab switching needed.

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
    const galleryItems = [];
    const filterButtons = Array.from(document.querySelectorAll('[data-gallery-filter]'));
    const galleryStatus = document.getElementById('gallery-status');
    let currentFilter = 'all';

    function applyGalleryLayout() {
      const isCompact = window.matchMedia('(max-width: 600px)').matches;
      galleryContainer.style.display = 'grid';
      galleryContainer.style.justifyContent = 'start';
      galleryContainer.style.alignContent = 'start';
      galleryContainer.style.gap = '14px';
      galleryContainer.style.gridTemplateColumns = isCompact
        ? 'repeat(auto-fit, minmax(160px, 1fr))'
        : 'repeat(auto-fill, 180px)';
      galleryItems.forEach((item) => {
        item.element.style.margin = '0';
      });
    }

    // Map specific gallery items to external project links
    const projectLinks = {
      'gallery-01': { action: 'modal', target: '#vcaas-modal', title: 'VCaaS - Voice Clone as a Service', categories: ['featured', 'design'] },
      'gallery-02': { url: 'https://travelogy-3p9x.vercel.app', title: 'TraveLogy', categories: ['featured', 'web'] }
    };

    const gallerySources = [
      { base: 'gallery-01', src: 'images/gallery-01.png' },
      { base: 'gallery-02', src: 'images/gallery-02.png' },
    ];

    function syncGalleryFilterState() {
      let visibleCount = 0;
      galleryItems.forEach((item) => {
        const matches = currentFilter === 'all' || item.categories.includes(currentFilter);
        item.element.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });
      filterButtons.forEach((button) => {
        const isActive = button.dataset.galleryFilter === currentFilter;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
      if (galleryStatus) {
        const label = currentFilter === 'all' ? 'all projects' : `${currentFilter} projects`;
        galleryStatus.innerHTML = `<strong>${visibleCount}</strong> ${visibleCount === 1 ? 'project' : 'projects'} shown in ${label}.`;
      }
    }

    if (filterButtons.length) {
      filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
          currentFilter = button.dataset.galleryFilter || 'all';
          syncGalleryFilterState();
        });
      });
      syncGalleryFilterState();
    }

    applyGalleryLayout();
    window.addEventListener('resize', applyGalleryLayout);

    function addItem(base, src) {
      const fig = document.createElement('figure');
      fig.className = 'gallery-item reveal';
      fig.style.margin = '0';
      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      img.alt = 'Portfolio image';

      const meta = projectLinks[base];
      const categories = meta?.categories || ['archive'];
      galleryItems.push({ element: fig, categories });

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
      // Register with the reveal system so the item animates on scroll
      revealItems.push(fig);
      scheduleRevealUpdate();
      syncGalleryFilterState();
    }

    gallerySources.forEach(({ base, src }) => {
      const test = new Image();
      test.onload = () => addItem(base, src);
      test.onerror = () => {
        if (projectLinks[base]) {
          console.warn(`Missing gallery image: ${src}`);
        }
      };
      // Use a stable cache-busting param only in local dev environments
      const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      test.src = isDev ? `${src}?v=${Date.now()}` : src;
    });
  }

  // Code box typing effect (skills & experience)
  const codeBox = document.getElementById('code-box');
  const codeOut = document.getElementById('code-output');
  if (codeBox && codeOut) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines = [
      '$ whoami',
      'Developer, Designer & Problem Solver',
      '$ ls skills/',
      'Proficient:  HTML  CSS  Java  C++  MySQL  MongoDB',
      'Competent:   Python  React.js  Node.js  Express.js  Tailwind',
      'Exploring:   Graphic Design  Logo Designing',
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

  // ── Contact form submission ───────────────────────────────────────────────
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const name = contactForm.querySelector('#name').value.trim();
      const email = contactForm.querySelector('#email').value.trim();
      const message = contactForm.querySelector('#message').value.trim();

      if (!name || !email || !message) {
        formStatus.textContent = 'Please fill in all fields.';
        formStatus.className = 'form-status error';
        return;
      }

      // Disable button while sending
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      formStatus.textContent = '';
      formStatus.className = 'form-status';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          formStatus.textContent = data.message || 'Message sent! I\'ll be in touch soon.';
          formStatus.className = 'form-status success';
          contactForm.reset();
        } else {
          formStatus.textContent = data.message || 'Something went wrong. Please try again.';
          formStatus.className = 'form-status error';
        }
      } catch {
        formStatus.textContent = 'Network error — please check your connection and try again.';
        formStatus.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send';
      }
    });
  }

  // ── Cycling typewriter on hero subtitle ──────────────────────────────────
  const heroSubtitle = document.getElementById('hero-subtitle');
  if (heroSubtitle) {
    const roles = [
      'Logo & Brand Designer.',
      'Front-End Developer.',
      'Java & C++ Programmer.',
      'AI/ML Explorer.',
      'Full-Stack Enthusiast.',
    ];
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      heroSubtitle.textContent = roles[0];
    } else {
      // Build structure: text node + blinking caret
      heroSubtitle.textContent = '';
      const textNode = document.createTextNode('');
      const caret = document.createElement('span');
      caret.className = 'typewriter-caret';
      caret.setAttribute('aria-hidden', 'true');
      heroSubtitle.appendChild(textNode);
      heroSubtitle.appendChild(caret);

      let roleIndex = 0;
      let charIndex = 0;
      let isDeleting = false;
      let pauseTimer = null;

      function typeStep() {
        const current = roles[roleIndex];
        if (!isDeleting) {
          charIndex++;
          textNode.data = current.slice(0, charIndex);
          if (charIndex === current.length) {
            // Finished typing — pause then delete
            isDeleting = true;
            pauseTimer = setTimeout(typeStep, 1800);
            return;
          }
          pauseTimer = setTimeout(typeStep, 60);
        } else {
          charIndex--;
          textNode.data = current.slice(0, charIndex);
          if (charIndex === 0) {
            // Finished deleting — move to next role
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            pauseTimer = setTimeout(typeStep, 320);
            return;
          }
          pauseTimer = setTimeout(typeStep, 32);
        }
      }
      // Short initial delay so it kicks in after the reveal animation
      pauseTimer = setTimeout(typeStep, 900);
    }
  }

  // ── Text scramble on section titles ─────────────────────────────────────
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const prefersReducedScramble = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrambleText(el) {
    if (prefersReducedScramble) return;
    const original = el.dataset.originalText || el.textContent;
    el.dataset.originalText = original;

    let frame = 0;
    const totalFrames = 22;
    let raf;

    function step() {
      const progress = frame / totalFrames;
      const resolvedCount = Math.floor(progress * original.length);
      let output = '';
      for (let i = 0; i < original.length; i++) {
        if (original[i] === ' ') { output += ' '; continue; }
        if (i < resolvedCount) {
          output += original[i];
        } else {
          output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = output;
      frame++;
      if (frame <= totalFrames) {
        raf = requestAnimationFrame(step);
      } else {
        el.textContent = original;
      }
    }
    cancelAnimationFrame(raf);
    frame = 0;
    step();
  }

  // Observe section titles — trigger scramble each time they enter view
  const scrambleTitles = Array.from(document.querySelectorAll('.section-title'));
  if (scrambleTitles.length && !prefersReducedScramble) {
    const scrambleObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          scrambleText(entry.target);
        }
      });
    }, { threshold: 0.6 });
    scrambleTitles.forEach((el) => scrambleObserver.observe(el));
  }

  // ── Chatbot Widget ───────────────────────────────────────────────────────
  const chatFab = document.getElementById('chat-fab');
  const chatPanel = document.getElementById('chat-panel');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatLog = document.getElementById('chat-log');
  const chatSendBtn = document.getElementById('chat-send-btn');

  if (chatFab && chatPanel && chatForm && chatInput && chatLog) {
    let chatSessionId = null;
    try { chatSessionId = localStorage.getItem('chatSessionId'); } catch (e) { }
    let chatSending = false;

    // Toggle chat panel
    chatFab.addEventListener('click', () => {
      const isOpen = chatPanel.classList.contains('is-open');
      chatPanel.classList.toggle('is-open', !isOpen);
      chatFab.classList.toggle('is-open', !isOpen);
      chatFab.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        chatInput.focus();
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatPanel.classList.contains('is-open')) {
        chatPanel.classList.remove('is-open');
        chatFab.classList.remove('is-open');
        chatFab.setAttribute('aria-expanded', 'false');
      }
    });

    function appendChatMessage(role, text) {
      const el = document.createElement('div');
      el.className = `chat-message chat-message--${role}`;
      el.textContent = text;
      chatLog.appendChild(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function showTypingIndicator() {
      const el = document.createElement('div');
      el.className = 'chat-typing';
      el.id = 'chat-typing-indicator';
      el.innerHTML = '<span></span><span></span><span></span>';
      chatLog.appendChild(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function removeTypingIndicator() {
      const el = document.getElementById('chat-typing-indicator');
      if (el) el.remove();
    }

    async function sendChatMessage(message) {
      if (chatSending) return;
      chatSending = true;
      if (chatSendBtn) chatSendBtn.disabled = true;

      appendChatMessage('user', message);
      showTypingIndicator();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: chatSessionId, message })
        });

        removeTypingIndicator();
        const data = await res.json();

        if (!res.ok) {
          appendChatMessage('system', data.error || 'Something went wrong.');
          return;
        }

        chatSessionId = data.sessionId;
        try { localStorage.setItem('chatSessionId', chatSessionId); } catch (e) { }
        appendChatMessage('assistant', data.reply);
      } catch (err) {
        removeTypingIndicator();
        appendChatMessage('system', 'Network error — please check your connection.');
      } finally {
        chatSending = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
      }
    }

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (msg) {
        sendChatMessage(msg);
        chatInput.value = '';
      }
    });

    // Register chat elements with cursor hover system
    const chatInteractive = chatPanel.querySelectorAll('button, input, a');
    chatInteractive.forEach((el) => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
    });
    chatFab.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
    chatFab.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
  }

  /* ── Newsletter Form ─────────────────────────────────────────────────── */
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterEmail = document.getElementById('newsletter-email');
  const newsletterMessage = document.getElementById('newsletter-message');
  const newsletterBtn = document.getElementById('newsletter-btn');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = newsletterEmail.value.trim();
      if (!email) return;

      newsletterBtn.disabled = true;
      newsletterBtn.textContent = 'Subscribing...';
      newsletterMessage.textContent = '';
      newsletterMessage.style.color = 'var(--muted)';

      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        
        if (res.ok) {
          newsletterMessage.style.color = 'var(--success)';
          newsletterMessage.textContent = data.message;
          newsletterEmail.value = '';
        } else {
          newsletterMessage.style.color = 'var(--danger)';
          newsletterMessage.textContent = data.error || 'Something went wrong.';
        }
      } catch (err) {
        newsletterMessage.style.color = 'var(--danger)';
        newsletterMessage.textContent = 'Network error. Please try again.';
      } finally {
        newsletterBtn.disabled = false;
        newsletterBtn.textContent = 'Subscribe';
      }
    });

    // Register elements for cursor hover
    [newsletterEmail, newsletterBtn].forEach((el) => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
    });
  }

})();

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
    const candidates = ['logo/brand.svg','logo/brand.png','logo/brand.jpg','logo/brand.jpeg','logo/brand.webp'];
    (function tryNext(i){
      if (i >= candidates.length) return;
      const test = new Image();
      test.onload = () => { brandImg.src = candidates[i]; };
      test.onerror = () => tryNext(i + 1);
      test.src = candidates[i] + `?v=${Date.now()}`;
    })(0);
  }

  // Animate skill bars when section is visible
  const skillSection = document.getElementById('skills');
  if (skillSection) {
    const bars = skillSection.querySelectorAll('.fill');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          bars.forEach((b) => {
            const target = getComputedStyle(b).getPropertyValue('--val');
            b.style.width = '0%';
            requestAnimationFrame(() => {
              // next frame to allow transition to play
              b.style.width = target.trim();
            });
          });
          obs.unobserve(skillSection);
        }
      });
    }, { threshold: 0.2 });
    obs.observe(skillSection);
  }

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

  // Contact form -> mailto handler
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        if (status) status.textContent = 'Please fill in all fields.';
        return;
      }

      const to = 'syntaxisreaper@gmail.com';
      const subject = encodeURIComponent(`Portfolio Contact from ${name}`);
      const bodyText = `Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0A${encodeURIComponent(message)}`;
      const href = `mailto:${to}?subject=${subject}&body=${bodyText}`;

      // open mail client
      window.location.href = href;
      if (status) status.textContent = 'Opening your email client…';
      form.reset();
    });
  }

  // Auto-gallery loader: looks for images named images/gallery-01.png, gallery-02.jpg, etc.
  const galleryContainer = document.getElementById('gallery-grid');
  if (galleryContainer) {
    const MAX = 30;
    const exts = ['webp','jpg','jpeg','png','gif','svg'];

    // Map specific gallery items to external project links
    const projectLinks = {
      'gallery-02': { url: 'https://travelogy-3p9x.vercel.app', title: 'TraveLogy' }
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
        a.href = meta.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'gallery-link';
        a.setAttribute('aria-label', `Open project: ${meta.title || 'Project'}`);
        a.appendChild(img);

        // Visible badge with project title
        const badge = document.createElement('span');
        badge.className = 'project-badge';
        badge.textContent = `${meta.title || 'Project'} ↗`;
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
        test.onerror = () => {};
        // cache-bust during development so new files show up on refresh
        test.src = src + `?v=${Date.now()}`;
      }
    });
  }
})();

// Ritesh Kumar Mishra — Blog Page Logic
(function () {
  'use strict';

  // ── marked.js configuration ──────────────────────────────────────────────
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // ── Routing ──────────────────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const blogListView = document.getElementById('blog-list-view');
  const blogPostView = document.getElementById('blog-post-view');

  if (slug) {
    // Single post mode
    if (blogListView) blogListView.style.display = 'none';
    if (blogPostView) blogPostView.style.display = 'block';
    loadPost(slug);
  } else {
    // List mode
    if (blogListView) blogListView.style.display = 'block';
    if (blogPostView) blogPostView.style.display = 'none';
    loadPosts();
  }

  function renderSkeletons(count = 3) {
    const container = document.getElementById('blog-list');
    if (!container) return;
    container.innerHTML = Array(count).fill(`
      <div class="skeleton-card">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line date"></div>
        <div class="skeleton-line excerpt"></div>
        <div class="skeleton-line excerpt"></div>
      </div>
    `).join('');
  }

  // ── Load Post List ───────────────────────────────────────────────────────
  async function loadPosts() {
    const container = document.getElementById('blog-list');
    const statusEl = document.getElementById('blog-loading');

    if (statusEl) statusEl.style.display = 'none';
    renderSkeletons(3); // show immediately, before fetch resolves

    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const { posts } = await res.json();

      if (!posts || posts.length === 0) {
        container.innerHTML = `
          <div class="blog-empty">
            <p>No posts yet — check back soon!</p>
          </div>`;
        return;
      }

      container.innerHTML = posts
        .map(
          (post) => `
        <a href="/blog?slug=${encodeURIComponent(post.slug)}" class="blog-card glass hover-rise reveal visible">
          <div class="blog-card-body">
            <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
            <time class="blog-card-date">${formatDate(post.published_at)}</time>
            ${post.excerpt ? `<p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
            ${
              post.tags && post.tags.length
                ? `<div class="blog-card-tags">${post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
                : ''
            }
          </div>
          <span class="blog-card-arrow">→</span>
        </a>`
        )
        .join('');
    } catch (err) {
      console.error('Error loading posts:', err);
      if (statusEl) statusEl.textContent = 'Failed to load posts. Please try again later.';
    }
  }

  // ── Load Single Post ─────────────────────────────────────────────────────
  async function loadPost(postSlug) {
    const titleEl = document.getElementById('post-title');
    const dateEl = document.getElementById('post-date');
    const contentEl = document.getElementById('post-content');
    const tagsEl = document.getElementById('post-tags');
    const loadingEl = document.getElementById('post-loading');

    if (loadingEl) loadingEl.style.display = 'none';
    
    // Skeleton loader for single post
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="skeleton-card" style="background: transparent; padding: 0;">
          <div class="skeleton-line title" style="width: 80%; height: 32px; margin-bottom: 16px;"></div>
          <div class="skeleton-line date" style="width: 15%; margin-bottom: 32px;"></div>
          <div class="skeleton-line excerpt" style="width: 100%;"></div>
          <div class="skeleton-line excerpt" style="width: 100%;"></div>
          <div class="skeleton-line excerpt" style="width: 90%;"></div>
          <br/>
          <div class="skeleton-line excerpt" style="width: 100%;"></div>
          <div class="skeleton-line excerpt" style="width: 85%;"></div>
        </div>
      `;
    }

    try {
      const res = await fetch(`/api/post?slug=${encodeURIComponent(postSlug)}`);

      if (!res.ok) {
        if (contentEl) contentEl.innerHTML = '<p class="blog-not-found">Post not found. <a href="/blog">← Back to all posts</a></p>';
        return;
      }

      const { post } = await res.json();

      // Update page title
      document.title = `${post.title} — Ritesh Kumar Mishra`;

      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && post.excerpt) {
        metaDesc.setAttribute('content', post.excerpt);
      }

      if (titleEl) titleEl.textContent = post.title;
      if (dateEl) dateEl.textContent = formatDate(post.published_at);

      // Render markdown — content is author-written (trusted), safe for innerHTML
      if (contentEl && typeof marked !== 'undefined') {
        contentEl.innerHTML = marked.parse(post.content_markdown || '');
      } else if (contentEl) {
        contentEl.textContent = post.content_markdown || '';
      }

      // Render tags
      if (tagsEl && post.tags && post.tags.length) {
        tagsEl.innerHTML = post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
      }

      // Add Share Button
      if (titleEl) {
        const shareContainer = document.createElement('div');
        shareContainer.className = 'post-share';
        shareContainer.style.marginTop = '16px';
        shareContainer.style.marginBottom = '24px';
        shareContainer.innerHTML = `
          <button id="share-btn" class="share-btn" aria-label="Share this post">
            <span id="share-icon">🔗</span>
            <span id="share-label">Share</span>
          </button>
        `;
        // Insert share button after date
        if (dateEl && dateEl.nextSibling) {
          dateEl.parentNode.insertBefore(shareContainer, dateEl.nextSibling);
        } else {
          titleEl.parentNode.appendChild(shareContainer);
        }

        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
          shareBtn.addEventListener('click', async () => {
            const url = window.location.href;
            const docTitle = document.title;
            const label = document.getElementById('share-label');

            if (navigator.share) {
              try {
                await navigator.share({ title: docTitle, url });
              } catch (e) {}
              return;
            }

            try {
              await navigator.clipboard.writeText(url);
              label.textContent = 'Copied!';
              shareBtn.classList.add('copied');
              setTimeout(() => {
                label.textContent = 'Share';
                shareBtn.classList.remove('copied');
              }, 2000);
            } catch (err) {
              console.error('Copy failed:', err);
            }
          });
        }
      }
    } catch (err) {
      console.error('Error loading post:', err);
      if (loadingEl) loadingEl.textContent = 'Failed to load post. Please try again later.';
    }
  }
})();

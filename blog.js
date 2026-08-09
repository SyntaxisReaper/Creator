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

  // ── Load Post List ───────────────────────────────────────────────────────
  async function loadPosts() {
    const container = document.getElementById('blog-list');
    const statusEl = document.getElementById('blog-loading');

    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const { posts } = await res.json();

      if (statusEl) statusEl.style.display = 'none';

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
        <a href="blog.html?slug=${encodeURIComponent(post.slug)}" class="blog-card glass hover-rise reveal visible">
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

    try {
      const res = await fetch(`/api/post?slug=${encodeURIComponent(postSlug)}`);

      if (!res.ok) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.innerHTML = '<p class="blog-not-found">Post not found. <a href="blog.html">← Back to all posts</a></p>';
        return;
      }

      const { post } = await res.json();

      if (loadingEl) loadingEl.style.display = 'none';

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
    } catch (err) {
      console.error('Error loading post:', err);
      if (loadingEl) loadingEl.textContent = 'Failed to load post. Please try again later.';
    }
  }
})();

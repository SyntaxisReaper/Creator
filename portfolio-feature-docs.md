# Portfolio Feature Documentation
### Ritesh Kumar Mishra — Portfolio Enhancements

**Covers:**
1. AI Chatbot with Supabase-backed Conversation Storage
2. Supabase-backed Micro-blog with Markdown Rendering

**Stack assumptions:** Vanilla HTML/CSS/JS, Vercel Serverless Functions, Supabase (PostgreSQL), `marked.js` for markdown rendering.

**Build order:** Blog first (Section 2), then Chatbot (Section 1) — blog content can enrich the chatbot's system prompt once it exists.

---

## Table of Contents

1. [Feature 1: AI Chatbot + Conversation Storage](#feature-1-ai-chatbot--conversation-storage)
   - 1.1 Overview
   - 1.2 Database Schema
   - 1.3 Serverless Function (`api/chat.js`)
   - 1.4 Frontend Widget
   - 1.5 Rate Limiting
   - 1.6 Environment Variables
   - 1.7 Security Considerations
2. [Feature 2: Supabase-backed Micro-blog](#feature-2-supabase-backed-micro-blog)
   - 2.1 Overview
   - 2.2 Database Schema
   - 2.3 Serverless Functions
   - 2.4 Frontend: Blog List & Post Pages
   - 2.5 Markdown Rendering Setup
   - 2.6 Environment Variables
   - 2.7 Security Considerations
3. [Deployment Checklist](#deployment-checklist)
4. [Future Enhancements](#future-enhancements)

---

## Feature 1: AI Chatbot + Conversation Storage

### 1.1 Overview

A floating chat widget ("Ask Me About Ritesh") that lets visitors ask questions about your background, skills, and projects. It is powered by the Anthropic API via a Vercel serverless function, with a system prompt built from your resume and project data. Every session's messages are logged to Supabase so you can review what visitors are asking.

**Flow:**
```
Visitor types message
   → Frontend sends { sessionId, message } to /api/chat
   → Function fetches recent history for that session from Supabase
   → Function calls Anthropic API with system prompt + history + new message
   → Function stores both the user message and assistant reply in Supabase
   → Function returns assistant reply to frontend
```

### 1.2 Database Schema

Run this in the Supabase SQL editor:

```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  visitor_fingerprint text,       -- optional: hashed IP/user-agent for rate limiting
  message_count int default 0
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

create index idx_chat_messages_session on chat_messages(session_id);
```

**Row Level Security (RLS):**

```sql
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- No public policies are created. All reads/writes happen through the
-- serverless function using the Supabase service role key, which bypasses
-- RLS. This keeps the tables completely inaccessible from the browser.
```

### 1.3 Serverless Function (`api/chat.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role, never exposed to frontend
);

const SYSTEM_PROMPT = `You are a helpful assistant embedded on Ritesh Kumar Mishra's
portfolio website. You answer questions ONLY about Ritesh's background, skills,
education, and projects (especially VCaaS - Voice Cloning as a Service).

If asked about anything unrelated to Ritesh, politely redirect the conversation
back to his portfolio. Keep answers concise (2-4 sentences) and friendly.

--- ABOUT RITESH ---
[Paste resume bio, skills list, and project summaries here.
 Once the blog (Feature 2) is live, pull recent post titles/summaries in here too.]
`;

const MAX_MESSAGES_PER_SESSION = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message } = req.body;

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // 1. Get or create session
    let session;
    if (sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      session = data;
    }
    if (!session) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ visitor_fingerprint: hashRequest(req) })
        .select()
        .single();
      if (error) throw error;
      session = data;
    }

    // 2. Rate limit per session
    if (session.message_count >= MAX_MESSAGES_PER_SESSION) {
      return res.status(429).json({
        error: 'Message limit reached for this session. Thanks for chatting!'
      });
    }

    // 3. Fetch recent history (last 10 messages) for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(10);

    // 4. Store the incoming user message
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message
    });

    // 5. Call Anthropic API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ]
      })
    });

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic API error: ${anthropicRes.status}`);
    }

    const data = await anthropicRes.json();
    const reply = data.content.find(b => b.type === 'text')?.text
      || "Sorry, I couldn't generate a response.";

    // 6. Store assistant reply + increment counter
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: reply
    });

    await supabase
      .from('chat_sessions')
      .update({ message_count: session.message_count + 1 })
      .eq('id', session.id);

    return res.status(200).json({ sessionId: session.id, reply });

  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// Simple fingerprint for basic abuse tracking — not PII, just IP+UA hash
function hashRequest(req) {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 40);
}
```

### 1.4 Frontend Widget

Minimal vanilla JS widget — style to match your existing glassmorphic modal system.

```javascript
// chatbot.js
let sessionId = localStorage.getItem('chatSessionId') || null;

async function sendMessage(message) {
  appendMessage('user', message);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message })
  });

  const data = await res.json();

  if (!res.ok) {
    appendMessage('assistant', data.error || 'Something went wrong.');
    return;
  }

  sessionId = data.sessionId;
  localStorage.setItem('chatSessionId', sessionId);
  appendMessage('assistant', data.reply);
}

function appendMessage(role, text) {
  const el = document.createElement('div');
  el.className = `chat-message chat-message--${role}`;
  el.textContent = text;
  document.getElementById('chat-log').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
}
```

```html
<!-- Widget markup -->
<div id="chat-widget" class="glass-panel">
  <div id="chat-log"></div>
  <form id="chat-form">
    <input id="chat-input" type="text" placeholder="Ask about Ritesh..." maxlength="1000" />
    <button type="submit">Send</button>
  </form>
</div>

<script>
document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  if (input.value.trim()) {
    sendMessage(input.value.trim());
    input.value = '';
  }
});
</script>
```

### 1.5 Rate Limiting

Two layers, both already in the code above:
- **Per-session cap:** `MAX_MESSAGES_PER_SESSION = 20` stops any single visitor from running up API costs.
- **Fingerprint logging:** `visitor_fingerprint` lets you later add an IP-based daily cap if needed (e.g., reject new sessions from the same fingerprint after N per day) — not implemented by default to keep it simple, but the column is there.

### 1.6 Environment Variables

Set these in Vercel project settings (Production + Preview):

| Variable | Where used | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/chat.js` | Never expose to frontend |
| `SUPABASE_URL` | `api/chat.js` | Same project as contact form |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/chat.js` | **Service role, not anon key** — required to bypass RLS from the server |

### 1.7 Security Considerations

- **Never** use the Supabase service role key in frontend code — only in the serverless function.
- The chat tables have RLS enabled with **no public policies**, so even if someone got the anon key, they couldn't read/write chat data directly.
- Cap `max_tokens` (400 above) to control per-message cost.
- Validate/truncate message length server-side (already handled: 1000 char limit) — don't trust client-side validation alone.
- Consider adding a basic profanity/abuse filter if this becomes public-facing at scale, though for a portfolio site this is usually unnecessary.

---

## Feature 2: Supabase-backed Micro-blog

### 2.1 Overview

A simple blog system where posts live in Supabase as markdown, rendered client-side with `marked.js`. New posts are added via the Supabase dashboard (or a small admin script) — no CMS UI needed.

**Flow:**
```
/blog page → fetch published posts from Supabase → render list (title, date, excerpt)
/blog/[slug] page → fetch single post by slug → render markdown → HTML via marked.js
```

### 2.2 Database Schema

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content_markdown text not null,
  excerpt text,
  tags text[] default '{}',
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_posts_slug on posts(slug);
create index idx_posts_published on posts(published, published_at desc);
```

**Row Level Security (RLS):**

```sql
alter table posts enable row level security;

-- Public can only read PUBLISHED posts — nothing else
create policy "Public can read published posts"
  on posts for select
  using (published = true);

-- No insert/update/delete policies for anon — you manage posts via the
-- Supabase dashboard (or a script) using your own authenticated session,
-- which bypasses RLS as the table owner.
```

Because this policy only allows reading published posts, **you can use the public anon key directly in frontend `fetch` calls** for the blog — no serverless function strictly required for reads. A serverless function is still useful if you want to add caching or transform data server-side.

### 2.3 Serverless Functions

Optional but recommended for a clean API boundary and to keep the anon key logic centralized.

**`api/posts.js`** — list published posts:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // anon key is fine here — RLS restricts to published posts
);

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Posts fetch error:', error);
    return res.status(500).json({ error: 'Failed to load posts' });
  }

  return res.status(200).json({ posts: data });
}
```

**`api/posts/[slug].js`** — single post:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { slug } = req.query;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Post not found' });
  }

  return res.status(200).json({ post: data });
}
```

### 2.4 Frontend: Blog List & Post Pages

**Blog list (`blog.html` + `blog.js`):**

```javascript
async function loadPosts() {
  const res = await fetch('/api/posts');
  const { posts } = await res.json();

  const container = document.getElementById('blog-list');
  container.innerHTML = posts.map(post => `
    <a href="/blog/${post.slug}.html" class="blog-card glass-panel">
      <h3>${escapeHtml(post.title)}</h3>
      <p class="blog-date">${formatDate(post.published_at)}</p>
      <p>${escapeHtml(post.excerpt || '')}</p>
      <div class="blog-tags">
        ${post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
      </div>
    </a>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

loadPosts();
```

**Single post (`blog-post.html` + `blog-post.js`):**

```javascript
async function loadPost() {
  const slug = new URLSearchParams(window.location.search).get('slug')
    || window.location.pathname.split('/').pop().replace('.html', '');

  const res = await fetch(`/api/posts/${slug}`);

  if (!res.ok) {
    document.getElementById('post-content').innerHTML = '<p>Post not found.</p>';
    return;
  }

  const { post } = await res.json();

  document.title = `${post.title} — Ritesh Kumar Mishra`;
  document.getElementById('post-title').textContent = post.title;
  document.getElementById('post-date').textContent = formatDate(post.published_at);
  // marked.js sanitizes headings/lists/etc.; content is your own trusted markdown,
  // written by you in the Supabase dashboard, not user-submitted — safe to render.
  document.getElementById('post-content').innerHTML = marked.parse(post.content_markdown);
}

loadPost();
```

### 2.5 Markdown Rendering Setup

Add `marked.js` via CDN (no build step needed, consistent with your no-framework approach):

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

Recommended `marked` options for consistent styling with your terminal/code aesthetic:

```javascript
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true
});
```

**Note on safety:** `content_markdown` is written by you directly in the Supabase dashboard, not submitted by site visitors — so there's no XSS risk from untrusted user input here. If you ever add a public "leave a comment" feature later, that content would need separate sanitization (e.g. `DOMPurify`) before rendering.

### 2.6 Environment Variables

| Variable | Where used | Notes |
|---|---|---|
| `SUPABASE_URL` | `api/posts.js`, `api/posts/[slug].js` | Same Supabase project |
| `SUPABASE_ANON_KEY` | `api/posts.js`, `api/posts/[slug].js` | Safe to use — RLS restricts reads to published posts only |

### 2.7 Security Considerations

- RLS ensures only `published = true` rows are ever readable by the anon key — draft posts stay private even if someone inspects network requests.
- No write policies exist for the anon role, so posts can only be created/edited through the Supabase dashboard (authenticated as you) or a script using the service role key — never from the public site.
- Since post content is authored by you, `marked.js` output can be inserted with `innerHTML` safely. If this ever changes (e.g., you accept guest posts), add `DOMPurify` before rendering.

---

## Deployment Checklist

- [ ] Run both SQL schema blocks in Supabase SQL editor
- [ ] Enable RLS and apply policies exactly as shown (chat tables: no public policies; posts table: published-only read policy)
- [ ] Add all environment variables to Vercel (Production + Preview environments)
- [ ] Install Supabase client: `npm install @supabase/supabase-js`
- [ ] Deploy `api/chat.js`, `api/posts.js`, `api/posts/[slug].js`
- [ ] Add `marked.js` CDN script to blog pages
- [ ] Write 2-3 seed blog posts directly in Supabase to test the list/detail flow
- [ ] Test chatbot session persistence (refresh page, confirm `sessionId` in localStorage carries over)
- [ ] Verify rate limit triggers correctly after 20 messages in one session
- [ ] Confirm draft posts (`published = false`) do NOT appear on `/blog`

---

## Future Enhancements

- **Chatbot:** Feed recent blog post titles/summaries into the system prompt automatically (query Supabase `posts` table inside `api/chat.js` before calling Anthropic) so the bot can reference your latest writing.
- **Chatbot:** Add a lightweight admin view (password-protected page) to review `chat_messages` and see what visitors are asking most.
- **Blog:** Add a `tags` filter UI on the blog list page using the existing `tags text[]` column.
- **Blog:** Generate Open Graph meta tags per-post dynamically (ties into the SEO recommendation from the portfolio analysis) using post title/excerpt.
- **Both:** Add a simple `/api/admin/posts` write endpoint protected by a secret header, so you can publish posts from a script instead of the Supabase dashboard.

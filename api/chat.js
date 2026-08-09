const { createClient } = require('@supabase/supabase-js');

const SYSTEM_PROMPT = `You are a helpful assistant embedded on Ritesh Kumar Mishra's portfolio website. You answer questions ONLY about Ritesh's background, skills, education, and projects.

If asked about anything unrelated to Ritesh, politely redirect the conversation back to his portfolio. Keep answers concise (2-4 sentences) and friendly.

--- ABOUT RITESH ---
Ritesh Kumar Mishra is a second-year AI/ML student at NIAT (Nxtwave Institute of Advanced Technologies) x Vivekananda Global University. He has a solid foundation in HTML, CSS, JavaScript, React.js, Python, Java, MySQL, and MongoDB. He is also a logo and graphic designer with a passion for crafting strong visual identities. On the engineering side, he builds modern, animated, responsive web apps and has a growing interest in machine learning and deep learning. He is detail-oriented, collaborative, and eager to grow through hands-on experience in tech.

SKILLS:
- Proficient: HTML, CSS, Java, C++, MySQL, MongoDB
- Competent: Python (AI/ML), React.js, Node.js, Express.js, Tailwind
- Exploring: Graphic Design, Logo Designing

ACHIEVEMENTS:
- Team Lead: Smart India Hackathon (SIH) 2025 Qualifier
- 1st Prize: Regional Science Exhibition (Technical Presentation)
- Vice President of NIAT Advanced Tech Club

PROJECTS:
- VCaaS (Voice Cloning as a Service): An ethical AI voice cloning & licensing platform with multi-layer voice detection, licensing dashboard, and enterprise API. Tech stack: Neural TTS, HiFi-GAN Vocoders, Speaker Embeddings, React Frontend.
- TraveLogy: A travel web application.
- Portfolio Website: This very site — built with vanilla HTML, CSS, and JavaScript with glassmorphic design, animated backgrounds, star particles, and custom cursor effects.

SOCIALS:
- GitHub: github.com/SyntaxisReaper
- LinkedIn: linkedin.com/in/ritesh-ku-mishra
- Instagram: instagram.com/ritesh._mishra_
- Email: syntaxisreaper@gmail.com
`;

const MAX_MESSAGES_PER_SESSION = 20;

function hashRequest(req) {
    const ip = (req.headers && req.headers['x-forwarded-for']) || 'unknown';
    const ua = (req.headers && req.headers['user-agent']) || 'unknown';
    return Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 40);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase credentials missing for chat.');
        return res.status(500).json({ error: 'Chat service is not configured' });
    }

    if (!groqKey) {
        console.error('Groq API key missing.');
        return res.status(500).json({ error: 'Chat service is not configured' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { sessionId, message } = req.body || {};

        if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
            return res.status(400).json({ error: 'Invalid message' });
        }

        const trimmedMessage = message.trim();

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
                error: 'Message limit reached for this session. Thanks for chatting! Refresh the page to start a new session.'
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
            content: trimmedMessage
        });

        // 5. Call Groq API (OpenAI-compatible format)
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 400,
                temperature: 0.7,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...(history || []).map(h => ({ role: h.role, content: h.content })),
                    { role: 'user', content: trimmedMessage }
                ]
            })
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text().catch(() => '');
            console.error(`Groq API error: ${groqRes.status}`, errText);
            throw new Error(`Groq API error: ${groqRes.status}`);
        }

        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content
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
};

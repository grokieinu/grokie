/**
 * Grokie Inu - AI Web Creator Engine
 * Main logic: form handling, AI generation via Groq, result display
 */

const GROQ_API_KEY_ENGINE = window.__gk ? window.__gk.g() : '';

let logoDataUrl = '';
let projectData = {};
let selectedTheme = 'neon-dark';
let selectedTemplate = 'classic';
let aiContent = null; // AI-generated content stored here

// === Theme Selection ===
function selectTheme(el) {
    document.querySelectorAll('#themePicker .theme-option').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    selectedTheme = el.dataset.theme;
}

// === Template Selection ===
function selectTemplate(el) {
    document.querySelectorAll('#templatePicker .theme-option').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    selectedTemplate = el.dataset.template;
}

// === Logo Upload ===
document.getElementById('logoUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('⚠️ Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        logoDataUrl = ev.target.result;
        const preview = document.getElementById('logoPreview');
        preview.src = logoDataUrl;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
});

// === Toast Notification ===
function showToast(msg) {
    const ex = document.querySelector('.toast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// === Generate Promotion ===
async function generatePromotion() {
    const name = document.getElementById('projectName').value.trim();
    const ticker = document.getElementById('tokenTicker').value.trim();
    const desc = document.getElementById('projectDesc').value.trim();

    if (!name || !ticker || !desc) {
        showToast('⚠️ Please fill in Project Name, Ticker, and Description.');
        return;
    }

    projectData = {
        name, ticker, desc,
        blockchain: document.getElementById('blockchain').value,
        category: document.getElementById('projectCategory').value,
        url: document.getElementById('projectUrl').value.trim(),
        twitter: document.getElementById('projectTwitter').value.trim(),
        telegram: document.getElementById('projectTelegram').value.trim(),
        discord: document.getElementById('projectDiscord').value.trim(),
        contract: document.getElementById('contractAddr').value.trim(),
        totalSupply: document.getElementById('totalSupply').value.trim() || '1,000,000,000',
        tax: document.getElementById('taxInfo').value.trim() || '0%',
        launchPlatform: document.getElementById('launchPlatform').value.trim() || 'DEX',
        launchDate: document.getElementById('launchDate').value.trim() || 'TBA',
        roadmap: [
            document.getElementById('roadmap1').value.trim(),
            document.getElementById('roadmap2').value.trim(),
            document.getElementById('roadmap3').value.trim(),
            document.getElementById('roadmap4').value.trim()
        ].filter(r => r),
        logo: logoDataUrl,
        theme: selectedTheme,
        template: selectedTemplate
    };

    document.getElementById('engineForm').style.display = 'none';
    document.getElementById('loadingSection').classList.add('active');

    const steps = ['step1','step2','step3','step4'];
    let si = 0;
    const iv = setInterval(() => {
        if (si > 0) {
            document.getElementById(steps[si-1]).classList.remove('active');
            document.getElementById(steps[si-1]).classList.add('done');
        }
        if (si < steps.length) {
            document.getElementById(steps[si]).classList.add('active');
            si++;
        } else {
            clearInterval(iv);
        }
    }, 800);

    // Call Groq AI for dynamic content
    aiContent = await generateAIContent(projectData);

    // Wait for animation to finish
    clearInterval(iv);
    document.querySelectorAll('.loading-steps li').forEach(li => {
        li.classList.remove('active');
        li.classList.add('done');
    });

    setTimeout(() => {
        document.getElementById('loadingSection').classList.remove('active');
        displayResult();
    }, 500);
}

// === Groq AI Content Generation ===
async function generateAIContent(d) {
    if (!GROQ_API_KEY_ENGINE) {
        // No API key — use enhanced local generation
        return generateLocalContent(d);
    }

    try {
        const prompt = `You are a creative web designer and copywriter for crypto projects. Generate unique website content for this project:

PROJECT:
- Name: ${d.name}
- Ticker: ${d.ticker}
- Category: ${d.category}
- Blockchain: ${d.blockchain}
- Description: ${d.desc}
- Total Supply: ${d.totalSupply}
- Launch Platform: ${d.launchPlatform}
- Roadmap input: ${d.roadmap.join(' | ') || 'Not specified'}

Generate UNIQUE and CREATIVE content. Every generation must be different. Respond with JSON only:
{
  "tagline": "A catchy one-line tagline (max 10 words, creative and unique)",
  "heroTitle": "A bold hero section title (can include line break with <br>)",
  "heroSubtitle": "2 sentences describing the project in an engaging way",
  "features": [
    {"icon": "emoji", "title": "short title", "description": "one sentence description"},
    {"icon": "emoji", "title": "short title", "description": "one sentence description"},
    {"icon": "emoji", "title": "short title", "description": "one sentence description"},
    {"icon": "emoji", "title": "short title", "description": "one sentence description"}
  ],
  "ctaText": "Call to action button text (2-4 words)",
  "aboutText": "A compelling 3-sentence about section paragraph",
  "roadmap": [
    {"phase": "Phase 1", "title": "catchy phase title", "items": ["milestone 1", "milestone 2", "milestone 3"]},
    {"phase": "Phase 2", "title": "catchy phase title", "items": ["milestone 1", "milestone 2", "milestone 3"]},
    {"phase": "Phase 3", "title": "catchy phase title", "items": ["milestone 1", "milestone 2", "milestone 3"]},
    {"phase": "Phase 4", "title": "catchy phase title", "items": ["milestone 1", "milestone 2", "milestone 3"]}
  ],
  "colorAccent": "a hex color that fits the project vibe (e.g. #ff6b6b)",
  "colorSecondary": "a complementary hex color",
  "designStyle": "one of: glassmorphism, gradient-heavy, minimalist, neon-glow, retro-futuristic",
  "animationStyle": "one of: smooth-fade, bounce-in, slide-up, scale-reveal, typewriter",
  "borderRadius": "one of: sharp (4px), rounded (16px), pill (50px)",
  "backgroundEffect": "one of: particles, grid-lines, gradient-orbs, waves, constellation"
}

For the roadmap: enhance the user's input "${d.roadmap.join(' | ') || 'standard crypto launch'}" into detailed investor-friendly milestones. Make it sound ambitious but achievable. Use professional language that builds confidence.

Be creative and different every time. Don't use generic phrases.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY_ENGINE}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a creative web designer. Respond with valid JSON only. No markdown. Be unique and creative every time.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.95,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return parsed;
    } catch (err) {
        console.warn('Groq AI failed, using local generation:', err.message);
        return generateLocalContent(d);
    }
}

// === Enhanced Local Content (fallback) ===
function generateLocalContent(d) {
    const taglines = [
        `${d.name}: Rewriting the Rules of ${d.category}`,
        `Where Innovation Meets ${d.blockchain}`,
        `The ${d.category} Revolution Starts Here`,
        `${d.ticker} — Built Different, Built to Last`,
        `Next-Level ${d.category} for the Bold`,
        `Unleash the Power of ${d.name}`,
        `${d.blockchain}'s Most Ambitious ${d.category}`,
        `From Zero to Moonshot with ${d.ticker}`,
    ];
    const heroTitles = [
        `The Future of<br>${d.category} is Here`,
        `${d.name}:<br>Unstoppable`,
        `Welcome to<br>${d.name}`,
        `${d.ticker}<br>Redefined`,
        `Built for<br>Believers`,
    ];
    const designStyles = ['glassmorphism', 'gradient-heavy', 'minimalist', 'neon-glow', 'retro-futuristic'];
    const animStyles = ['smooth-fade', 'bounce-in', 'slide-up', 'scale-reveal', 'typewriter'];
    const accents = ['#f72585', '#ff6b6b', '#00f5ff', '#06d6a0', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

    const featurePool = {
        'Meme Coin': [
            {icon:'🚀',title:'Viral Growth',description:'Built for explosive community growth'},
            {icon:'🔥',title:'Auto Burn',description:'Supply decreases with every transaction'},
            {icon:'💎',title:'Holder Rewards',description:'Earn passive income just by holding'},
            {icon:'🎯',title:'Fair Launch',description:'No presale, no insider allocation'},
            {icon:'🌊',title:'Liquid Pool',description:'Deep liquidity locked for stability'},
            {icon:'🤝',title:'DAO Governed',description:'Community decides the future'},
        ],
        'DeFi': [
            {icon:'💰',title:'Yield Optimizer',description:'Maximize returns automatically'},
            {icon:'🔒',title:'Vault Security',description:'Multi-sig protected smart contracts'},
            {icon:'⚡',title:'Flash Swaps',description:'Instant execution, zero slippage'},
            {icon:'📊',title:'Real-time Analytics',description:'Track everything in one dashboard'},
            {icon:'🌐',title:'Cross-chain',description:'Bridge assets between networks'},
            {icon:'🏦',title:'Lending Protocol',description:'Borrow and lend with competitive rates'},
        ],
        'GameFi': [
            {icon:'🎮',title:'Play & Earn',description:'Real rewards for real gameplay'},
            {icon:'⚔️',title:'PvP Battles',description:'Compete against players worldwide'},
            {icon:'🏆',title:'Tournaments',description:'Weekly events with massive prizes'},
            {icon:'🎨',title:'NFT Assets',description:'True ownership of in-game items'},
            {icon:'🌍',title:'Open World',description:'Explore limitless virtual lands'},
            {icon:'🤖',title:'AI Companions',description:'Intelligent NPCs that adapt to you'},
        ],
    };

    const defaultFeatures = [
        {icon:'⚡',title:'Lightning Fast',description:'Sub-second transaction finality'},
        {icon:'🔐',title:'Fully Secured',description:'Audited and battle-tested contracts'},
        {icon:'👥',title:'Community First',description:'Every decision made by holders'},
        {icon:'📈',title:'Growth Engine',description:'Strategic partnerships driving adoption'},
        {icon:'🌟',title:'Innovation',description:'Pushing boundaries of what\'s possible'},
        {icon:'🎁',title:'Rewards',description:'Generous incentives for early supporters'},
    ];

    const pool = featurePool[d.category] || defaultFeatures;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const features = shuffled.slice(0, 4);

    const r = (arr) => arr[Math.floor(Math.random() * arr.length)];

    return {
        tagline: r(taglines),
        heroTitle: r(heroTitles),
        heroSubtitle: `${d.desc} Join the ${d.name} movement and be part of something revolutionary on ${d.blockchain}.`,
        features,
        ctaText: r(['Join Now', 'Get Started', `Buy ${d.ticker}`, 'Launch App', 'Enter Dapp', 'Explore']),
        aboutText: `${d.name} is a ${d.category.toLowerCase()} project built on ${d.blockchain} with a mission to deliver real value to its community. With a total supply of ${d.totalSupply} ${d.ticker} tokens and a focus on transparency, we're building something that lasts. ${d.desc}`,
        colorAccent: r(accents),
        designStyle: r(designStyles),
        animationStyle: r(animStyles),
        sectionOrder: ['hero', 'about', 'features', 'tokenomics', 'roadmap', 'cta'],
    };
}

// === Template Engine ===
function getTagline(name, cat, chain) {
    const templates = [
        `The Future of ${cat} on ${chain}`,
        `${chain}'s Most Innovative ${cat} Project`,
        `Next-Gen ${cat} Built for the Community`,
        `${name}: Where ${cat} Meets Innovation`,
        `Redefining ${cat} — Powered by ${chain}`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function getFeatures(cat) {
    const map = {
        'Meme Coin': [{t:'🐕 Viral Meme Power',d:'Community-driven memes that spread like wildfire'},{t:'🔥 Deflationary Burns',d:'Regular token burns to increase scarcity'},{t:'💎 Diamond Hands',d:'Earn rewards for holding long-term'},{t:'🚀 Fair Launch',d:'No presale, no team tokens — 100% community'}],
        'DeFi': [{t:'💰 High Yield',d:'Earn passive income through optimized strategies'},{t:'🔒 Audited',d:'Smart contracts verified by top auditors'},{t:'⚡ Fast Swaps',d:'Instant token swaps with minimal slippage'},{t:'📊 Analytics',d:'Real-time portfolio tracking and insights'}],
        'GameFi': [{t:'🎮 Play to Earn',d:'Earn real tokens while gaming'},{t:'🏆 Tournaments',d:'Compete for massive prizes'},{t:'🎨 NFT Items',d:'Unique in-game assets as NFTs'},{t:'🌍 Open World',d:'Expansive metaverse to explore'}],
        'NFT': [{t:'🎨 Unique Art',d:'One-of-a-kind digital art'},{t:'💎 Rarity Tiers',d:'Exclusive perks for rare holders'},{t:'🏪 Marketplace',d:'Zero-fee trading platform'},{t:'🎁 Airdrops',d:'Regular rewards for holders'}],
        'AI': [{t:'🤖 AI-Powered',d:'Advanced ML driving innovation'},{t:'🧠 Automation',d:'Smart processes that save time'},{t:'📈 Predictions',d:'AI-driven market insights'},{t:'🔗 Decentralized',d:'Community-owned AI'}],
        'Infrastructure': [{t:'🏗️ Scalable',d:'Handles millions of transactions'},{t:'⚡ Ultra-Fast',d:'Sub-second finality'},{t:'🔐 Secure',d:'Enterprise-grade security'},{t:'🌐 Cross-Chain',d:'Multi-chain interoperability'}]
    };
    return map[cat] || [{t:'⚡ Fast',d:'Fast and cheap transactions'},{t:'🔒 Secure',d:'Audited smart contract'},{t:'👥 Community',d:'Governed by holders'},{t:'📈 Growth',d:'Strategic roadmap'}];
}

function getScores() {
    const d = projectData;
    let o = 38 + Math.floor(Math.random()*8);
    let c = 30 + Math.floor(Math.random()*8);
    let t = 32 + Math.floor(Math.random()*8);
    if (d.url) { o+=15; t+=18; }
    if (d.twitter) { o+=10; c+=22; }
    if (d.telegram) { o+=10; c+=22; }
    if (d.contract) { o+=12; t+=20; }
    if (d.desc.length > 100) { o+=5; t+=8; }
    if (d.desc.length > 200) { o+=5; c+=5; }
    if (d.discord) { c+=10; }
    if (d.roadmap.length > 2) { o+=5; t+=5; }
    return { overall: Math.min(95,o), community: Math.min(95,c), transparency: Math.min(95,t) };
}

// === Display Result ===
function displayResult() {
    const d = projectData;
    const ai = aiContent || {};

    // Use AI content or fallback
    const tagline = ai.tagline || getTagline(d.name, d.category, d.blockchain);
    const features = ai.features || getFeatures(d.category);
    const scores = getScores();
    const description = ai.aboutText || `${d.name} (${d.ticker}) is a ${d.category.toLowerCase()} project on ${d.blockchain}. ${d.desc} Built for the community with transparency and real utility.`;

    // Store for template generator (used by ai-templates.js)
    projectData.tagline = tagline;
    projectData.heroTitle = ai.heroTitle || d.name;
    projectData.heroSubtitle = ai.heroSubtitle || description;
    projectData.features = features.map(f => ({
        t: (f.icon || '⚡') + ' ' + (f.title || f.t || ''),
        d: f.description || f.d || ''
    }));
    projectData.scores = scores;
    projectData.description = description;
    projectData.ctaText = ai.ctaText || `Buy ${d.ticker} Now`;
    projectData.colorAccent = ai.colorAccent || '#f72585';
    projectData.colorSecondary = ai.colorSecondary || '#8b5cf6';
    projectData.designStyle = ai.designStyle || 'neon-glow';
    projectData.animationStyle = ai.animationStyle || 'smooth-fade';
    projectData.borderRadius = ai.borderRadius || 'rounded (16px)';
    projectData.backgroundEffect = ai.backgroundEffect || 'particles';

    // AI-enhanced roadmap
    if (ai.roadmap && ai.roadmap.length > 0) {
        projectData.aiRoadmap = ai.roadmap;
    }

    // Update UI
    document.getElementById('resultSection').classList.add('active');
    document.getElementById('previewUrl').textContent = `${d.name.toLowerCase().replace(/\s+/g,'')}.com`;
    document.getElementById('previewTitle').textContent = ai.heroTitle ? ai.heroTitle.replace(/<br>/g, ' ') : d.name;
    document.getElementById('previewTagline').textContent = tagline;
    document.getElementById('previewDesc').textContent = description;
    document.getElementById('previewFeatures').innerHTML = projectData.features.map(f => `<div class="feature-item"><strong>${f.t}</strong>${f.d}</div>`).join('');
    document.getElementById('previewCta').textContent = projectData.ctaText;
}

// === Reset ===
function resetForm() {
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('engineForm').style.display = 'block';
    document.querySelectorAll('.loading-steps li').forEach(li => li.classList.remove('active','done'));
}

// === Download & Preview (uses ai-templates.js) ===
async function downloadZip() {
    const d = projectData;
    const zip = new JSZip();
    zip.file('index.html', buildHTML(d));
    zip.file('style.css', buildCSS(d));
    zip.file('script.js', buildJS(d));
    if (d.logo) {
        const base64 = d.logo.split(',')[1];
        zip.file('logo.png', base64, {base64: true});
    }

    // Include social icons
    try {
        const tgResp = await fetch('assets/images/telegram.jpg');
        if (tgResp.ok) { const blob = await tgResp.blob(); zip.file('telegram.jpg', blob); }
    } catch(e) {}
    try {
        const twResp = await fetch('assets/images/twiter.png');
        if (twResp.ok) { const blob = await twResp.blob(); zip.file('twiter.png', blob); }
    } catch(e) {}

    zip.file('README.md', `# ${d.name}\n\n${d.tagline}\n\n## Deploy\n1. Upload all files to any web hosting\n2. Or open index.html in browser\n\n## Files\n- index.html - Main page\n- style.css - Styles\n- script.js - Animations & interactions\n- logo.png - Project logo\n- telegram.jpg - Telegram icon\n- twiter.png - Twitter icon\n\nGenerated by Grokie Inu AI Promotion Engine`);

    const blob = await zip.generateAsync({type: 'blob'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.name.toLowerCase().replace(/\s+/g,'-')}-website.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ ZIP downloaded!');
}

function previewWebCode() {
    const d = projectData;
    const css = buildCSS(d);
    const js = buildJS(d);
    let html = buildHTML(d);
    // Inline CSS and JS for preview
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>');
    html = html.replace(/< *script +src="script\.js"> *<\/script>/, '<script>' + js + '<\/script>');
    // Replace logo.png references with dataURL for preview
    if (d.logo) {
        html = html.split('src="logo.png"').join('src="' + d.logo + '"');
    }
    // Replace social icons with correct path for preview
    html = html.split('src="telegram.jpg"').join('src="assets/images/telegram.jpg"');
    html = html.split('src="twiter.png"').join('src="assets/images/twiter.png"');
    document.getElementById('previewModal').style.display = 'flex';
    document.getElementById('previewFrame').srcdoc = html;
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

/**
 * Grokie Inu - AI Promotion Engine
 * Website Template Generator
 * Generates: HTML, CSS, JS for the promotional website ZIP download
 */

// === Helper ===
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
}

// === Theme Definitions ===
const THEMES = {
    'neon-dark': { primary:'#8b5cf6', accent:'#f72585', cyan:'#00f5ff', green:'#06d6a0', dark:'#0a0a1a', card:'#16162e', border:'#2a2a50', text:'#e8e8f0', muted:'#9898b8' },
    'ocean-blue': { primary:'#3b82f6', accent:'#38bdf8', cyan:'#67e8f9', green:'#34d399', dark:'#0c1929', card:'#132f4c', border:'#1e4976', text:'#e2e8f0', muted:'#94a3b8' },
    'gold-luxury': { primary:'#d97706', accent:'#f59e0b', cyan:'#fbbf24', green:'#a3e635', dark:'#1a1a0f', card:'#2a2510', border:'#3d3520', text:'#fef3c7', muted:'#a8a080' }
};

// === Build HTML ===
function buildHTML(d) {
    // Use template-specific builder
    switch(d.template) {
        case 'modern': return buildHTMLModern(d);
        case 'minimal': return buildHTMLMinimal(d);
        case 'bold': return buildHTMLBold(d);
        case 'cards': return buildHTMLCards(d);
        default: return buildHTMLClassic(d);
    }
}

// === Shared HTML Parts ===
function getNavHTML(d) {
    let socialLinks = '';
    if (d.telegram || d.twitter) {
        socialLinks = '<div class="nav-socials">';
        if (d.telegram) socialLinks += `<a href="${d.telegram}" target="_blank" class="nav-social-btn"><img src="telegram.jpg" alt="Telegram" class="social-img"></a>`;
        if (d.twitter) socialLinks += `<a href="${d.twitter}" target="_blank" class="nav-social-btn"><img src="twiter.png" alt="Twitter" class="social-img"></a>`;
        socialLinks += '</div>';
    }
    return `<nav class="navbar">
<div class="container nav-inner">
<a href="#" class="nav-logo">${d.logo ? '<img src="logo.png" alt="'+d.name+'">' : ''}<span>${d.name}</span></a>
<ul class="nav-links">
<li><a href="#about">About</a></li>
<li><a href="#features">Features</a></li>
<li><a href="#tokenomics">Tokenomics</a></li>
${d.roadmap.length ? '<li><a href="#roadmap">Roadmap</a></li>' : ''}
${(d.twitter||d.telegram) ? '<li><a href="#community">Community</a></li>' : ''}
<li><a href="#buy" class="nav-cta">Buy ${d.ticker}</a></li>
</ul>
${socialLinks}
<button class="mobile-menu" id="mobileMenu">☰</button>
</div>
</nav>`;
}

function getRoadmapHTML(d) {
    if (d.roadmap.length === 0) return '';
    const items = d.roadmap.map((r,i) => `<div class="roadmap-item"><div class="roadmap-marker"><span>Phase ${i+1}</span></div><div class="roadmap-card"><h3>Phase ${i+1}</h3><p>${r}</p></div></div>`).join('');
    return `<section class="roadmap" id="roadmap"><div class="container"><h2>Roadmap</h2><p class="section-desc">Our journey to building something great</p><div class="roadmap-timeline">${items}</div></div></section>`;
}

function getSocialsHTML(d) {
    if (!d.twitter && !d.telegram && !d.discord) return '';
    let links = '';
    if (d.telegram) links += `<a href="${d.telegram}" target="_blank" class="social-btn tg"><img src="telegram.jpg" alt="Telegram" class="social-img-lg"><span>Telegram</span></a>`;
    if (d.twitter) links += `<a href="${d.twitter}" target="_blank" class="social-btn tw"><img src="twiter.png" alt="Twitter" class="social-img-lg"><span>Twitter</span></a>`;
    if (d.discord) links += `<a href="${d.discord}" target="_blank" class="social-btn dc"><span class="social-icon">🎮</span><span>Discord</span></a>`;
    return `<section class="community" id="community"><div class="container"><h2>Join the Community</h2><p class="section-desc">Be part of the ${d.name} movement</p><div class="social-links">${links}</div></div></section>`;
}

function getFeaturesHTML(d) {
    return d.features.map(f => {
        const icon = f.t.split(' ')[0];
        const title = f.t.substring(f.t.indexOf(' ')+1);
        return `<div class="feature-card"><div class="feature-icon">${icon}</div><h3>${title}</h3><p>${f.d}</p></div>`;
    }).join('\n');
}

function getContractHTML(d) {
    return d.contract
        ? `<div class="contract-box"><p>📋 Contract Address</p><code>${d.contract}</code><button class="copy-btn" onclick="navigator.clipboard.writeText('${d.contract}');this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy',2000)">📋 Copy</button></div>`
        : `<div class="contract-box"><p>📋 Contract Address</p><code>TBA — Will be announced on launch day</code></div>`;
}

function getBuyHTML(d) {
    const wallet = d.blockchain === 'Solana' ? 'Phantom' : 'MetaMask';
    const coin = d.blockchain === 'Solana' ? 'SOL' : 'ETH';
    return `<section class="buy" id="buy"><div class="container"><h2>How to Buy ${d.ticker}</h2><p class="section-desc">Get your tokens in 4 simple steps</p><div class="steps">
<div class="step"><div class="step-num">1</div><h3>Create Wallet</h3><p>Download ${wallet} and secure your seed phrase</p></div>
<div class="step"><div class="step-num">2</div><h3>Get ${coin}</h3><p>Buy ${coin} from any exchange and send to your wallet</p></div>
<div class="step"><div class="step-num">3</div><h3>Visit ${d.launchPlatform}</h3><p>Connect wallet and find ${d.ticker}</p></div>
<div class="step"><div class="step-num">4</div><h3>Swap & Hold</h3><p>Confirm swap and welcome to ${d.name}!</p></div>
</div></div></section>`;
}

function getFooterHTML(d) {
    return `<footer class="footer"><div class="container"><div class="footer-top">
<div class="footer-brand">${d.logo ? '<img src="logo.png" alt="'+d.name+'" class="footer-logo">' : ''}<span>${d.name}</span></div>
<div class="footer-links"><a href="#about">About</a><a href="#tokenomics">Tokenomics</a>${d.roadmap.length ? '<a href="#roadmap">Roadmap</a>' : ''}<a href="#buy">Buy</a></div>
</div><div class="footer-bottom"><p>&copy; 2026 ${d.name}. All rights reserved.</p>
<p class="disclaimer">⚠️ This is not financial advice. DYOR. Only invest what you can afford to lose.</p>
</div></div></footer>`;
}

function wrapPage(d, body) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${d.name} - ${d.tagline}. ${d.category} on ${d.blockchain}.">
<title>${d.name} - ${d.tagline}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="bg-animation"><canvas id="bgCanvas"></canvas></div>
${body}
<` + `script src="script.js"><` + `/script>
</body>
</html>`;
}

// === TEMPLATE: Classic ===
function buildHTMLClassic(d) {
    let heroSocials = '';
    if (d.telegram || d.twitter || d.discord) {
        heroSocials = '<div class="hero-socials">';
        if (d.telegram) heroSocials += `<a href="${d.telegram}" target="_blank" class="hero-social-link"><img src="telegram.jpg" alt="Telegram" class="social-img"> Telegram</a>`;
        if (d.twitter) heroSocials += `<a href="${d.twitter}" target="_blank" class="hero-social-link"><img src="twiter.png" alt="Twitter" class="social-img"> Twitter</a>`;
        if (d.discord) heroSocials += `<a href="${d.discord}" target="_blank" class="hero-social-link">🎮 Discord</a>`;
        heroSocials += '</div>';
    }
    const body = `${getNavHTML(d)}
<section class="hero" id="hero"><div class="container hero-content">
${d.logo ? '<img src="logo.png" alt="'+d.name+'" class="hero-logo-main">' : ''}
<h1>${d.name}</h1>
<p class="hero-tagline">${d.tagline}</p>
<p class="hero-desc">${d.description}</p>
<div class="hero-btns"><a href="#buy" class="btn-primary">🚀 Buy ${d.ticker} Now</a><a href="#about" class="btn-secondary">Learn More</a></div>
${heroSocials}
<div class="hero-stats">
<div class="stat"><span class="stat-val">${d.totalSupply}</span><span class="stat-lbl">Total Supply</span></div>
<div class="stat"><span class="stat-val">${d.tax}</span><span class="stat-lbl">Tax</span></div>
<div class="stat"><span class="stat-val">${d.blockchain}</span><span class="stat-lbl">Network</span></div>
<div class="stat"><span class="stat-val">${d.launchDate}</span><span class="stat-lbl">Launch</span></div>
</div></div></section>
<section class="about" id="about"><div class="container"><h2>What is ${d.name}?</h2><p class="section-desc">${d.description}</p>
<div class="about-highlights"><div class="highlight-item"><span class="hl-icon">⛓️</span><span class="hl-text">Built on ${d.blockchain}</span></div><div class="highlight-item"><span class="hl-icon">📁</span><span class="hl-text">${d.category}</span></div><div class="highlight-item"><span class="hl-icon">🚀</span><span class="hl-text">Launch: ${d.launchPlatform}</span></div></div></div></section>
<section class="features" id="features"><div class="container"><h2>Why Choose ${d.name}?</h2><p class="section-desc">Key features that make ${d.ticker} stand out</p><div class="features-grid">${getFeaturesHTML(d)}</div></div></section>
<section class="tokenomics" id="tokenomics"><div class="container"><h2>Tokenomics</h2><p class="section-desc">Fair, transparent, and community-first</p>
<div class="token-grid"><div class="token-card"><div class="token-icon">💰</div><h3>Total Supply</h3><p>${d.totalSupply}</p></div><div class="token-card"><div class="token-icon">📊</div><h3>Tax</h3><p>${d.tax}</p></div><div class="token-card"><div class="token-icon">⛓️</div><h3>Network</h3><p>${d.blockchain}</p></div><div class="token-card"><div class="token-icon">🚀</div><h3>Platform</h3><p>${d.launchPlatform}</p></div></div>
${getContractHTML(d)}</div></section>
${getRoadmapHTML(d)}${getBuyHTML(d)}${getSocialsHTML(d)}${getFooterHTML(d)}`;
    return wrapPage(d, body);
}

// === TEMPLATE: Modern Split ===
function buildHTMLModern(d) {
    const body = `${getNavHTML(d)}
<section class="hero hero-split" id="hero"><div class="container"><div class="hero-grid">
<div class="hero-left"><h1>${d.name}</h1><p class="hero-tagline">${d.tagline}</p><p class="hero-desc">${d.description}</p>
<div class="hero-btns"><a href="#buy" class="btn-primary">🚀 Buy ${d.ticker}</a><a href="#about" class="btn-secondary">Learn More</a></div></div>
<div class="hero-right">${d.logo ? '<img src="logo.png" alt="'+d.name+'" class="hero-logo-main">' : '<div class="hero-logo-placeholder">'+d.name.charAt(0)+'</div>'}
<div class="hero-stats-vertical">
<div class="stat"><span class="stat-val">${d.totalSupply}</span><span class="stat-lbl">Supply</span></div>
<div class="stat"><span class="stat-val">${d.tax}</span><span class="stat-lbl">Tax</span></div>
<div class="stat"><span class="stat-val">${d.launchDate}</span><span class="stat-lbl">Launch</span></div>
</div></div></div></div></section>
<section class="about" id="about"><div class="container"><h2>About ${d.name}</h2><p class="section-desc">${d.description}</p></div></section>
<section class="features" id="features"><div class="container"><h2>Features</h2><div class="features-grid">${getFeaturesHTML(d)}</div></div></section>
<section class="tokenomics" id="tokenomics"><div class="container"><h2>Tokenomics</h2>
<div class="token-grid"><div class="token-card"><div class="token-icon">💰</div><h3>Total Supply</h3><p>${d.totalSupply}</p></div><div class="token-card"><div class="token-icon">📊</div><h3>Tax</h3><p>${d.tax}</p></div><div class="token-card"><div class="token-icon">⛓️</div><h3>Network</h3><p>${d.blockchain}</p></div><div class="token-card"><div class="token-icon">🚀</div><h3>Platform</h3><p>${d.launchPlatform}</p></div></div>
${getContractHTML(d)}</div></section>
${getRoadmapHTML(d)}${getBuyHTML(d)}${getSocialsHTML(d)}${getFooterHTML(d)}`;
    return wrapPage(d, body);
}

// === TEMPLATE: Minimal ===
function buildHTMLMinimal(d) {
    const body = `${getNavHTML(d)}
<section class="hero hero-minimal" id="hero"><div class="container hero-content">
<h1>${d.name}</h1>
<p class="hero-tagline">${d.tagline}</p>
<a href="#buy" class="btn-primary">Buy ${d.ticker}</a>
</div></section>
<section class="about" id="about"><div class="container"><h2>${d.name}</h2><p class="section-desc">${d.description}</p>
<div class="minimal-stats"><span>⛓️ ${d.blockchain}</span><span>💰 ${d.totalSupply}</span><span>📊 ${d.tax} tax</span><span>📅 ${d.launchDate}</span></div></div></section>
<section class="features" id="features"><div class="container"><div class="features-grid">${getFeaturesHTML(d)}</div></div></section>
<section class="tokenomics" id="tokenomics"><div class="container"><h2>Tokenomics</h2>
<div class="token-grid"><div class="token-card"><h3>Supply</h3><p>${d.totalSupply}</p></div><div class="token-card"><h3>Tax</h3><p>${d.tax}</p></div><div class="token-card"><h3>Chain</h3><p>${d.blockchain}</p></div><div class="token-card"><h3>Launch</h3><p>${d.launchPlatform}</p></div></div>
${getContractHTML(d)}</div></section>
${getRoadmapHTML(d)}${getBuyHTML(d)}${getSocialsHTML(d)}${getFooterHTML(d)}`;
    return wrapPage(d, body);
}

// === TEMPLATE: Bold Hero ===
function buildHTMLBold(d) {
    const body = `${getNavHTML(d)}
<section class="hero hero-bold" id="hero"><div class="hero-overlay"></div><div class="container hero-content">
${d.logo ? '<img src="logo.png" alt="'+d.name+'" class="hero-logo-main">' : ''}
<h1 class="hero-title-bold">${d.name}</h1>
<p class="hero-tagline">${d.tagline}</p>
<p class="hero-desc">${d.description}</p>
<div class="hero-btns"><a href="#buy" class="btn-primary btn-large">🚀 Buy ${d.ticker} Now</a></div>
<div class="hero-stats">
<div class="stat"><span class="stat-val">${d.totalSupply}</span><span class="stat-lbl">Total Supply</span></div>
<div class="stat"><span class="stat-val">${d.tax}</span><span class="stat-lbl">Tax</span></div>
<div class="stat"><span class="stat-val">${d.blockchain}</span><span class="stat-lbl">Network</span></div>
<div class="stat"><span class="stat-val">${d.launchDate}</span><span class="stat-lbl">Launch</span></div>
</div></div></section>
<section class="features" id="features"><div class="container"><h2>Why ${d.name}?</h2><div class="features-grid">${getFeaturesHTML(d)}</div></div></section>
<section class="about" id="about"><div class="container"><h2>About</h2><p class="section-desc">${d.description}</p></div></section>
<section class="tokenomics" id="tokenomics"><div class="container"><h2>Tokenomics</h2>
<div class="token-grid"><div class="token-card"><div class="token-icon">💰</div><h3>Total Supply</h3><p>${d.totalSupply}</p></div><div class="token-card"><div class="token-icon">📊</div><h3>Tax</h3><p>${d.tax}</p></div><div class="token-card"><div class="token-icon">⛓️</div><h3>Network</h3><p>${d.blockchain}</p></div><div class="token-card"><div class="token-icon">🚀</div><h3>Platform</h3><p>${d.launchPlatform}</p></div></div>
${getContractHTML(d)}</div></section>
${getRoadmapHTML(d)}${getBuyHTML(d)}${getSocialsHTML(d)}${getFooterHTML(d)}`;
    return wrapPage(d, body);
}

// === TEMPLATE: Card Grid ===
function buildHTMLCards(d) {
    const body = `${getNavHTML(d)}
<section class="hero" id="hero"><div class="container hero-content">
${d.logo ? '<img src="logo.png" alt="'+d.name+'" class="hero-logo-main">' : ''}
<h1>${d.name}</h1>
<p class="hero-tagline">${d.tagline}</p>
<div class="hero-btns"><a href="#buy" class="btn-primary">🚀 Buy ${d.ticker}</a></div>
</div></section>
<section class="dashboard" id="about"><div class="container"><div class="dashboard-grid">
<div class="dash-card dash-main"><h2>About ${d.name}</h2><p>${d.description}</p><div class="about-highlights"><div class="highlight-item"><span class="hl-icon">⛓️</span><span class="hl-text">${d.blockchain}</span></div><div class="highlight-item"><span class="hl-icon">📁</span><span class="hl-text">${d.category}</span></div></div></div>
<div class="dash-card"><div class="token-icon">💰</div><h3>Supply</h3><p class="dash-val">${d.totalSupply}</p></div>
<div class="dash-card"><div class="token-icon">📊</div><h3>Tax</h3><p class="dash-val">${d.tax}</p></div>
<div class="dash-card"><div class="token-icon">🚀</div><h3>Platform</h3><p class="dash-val">${d.launchPlatform}</p></div>
<div class="dash-card"><div class="token-icon">📅</div><h3>Launch</h3><p class="dash-val">${d.launchDate}</p></div>
</div></div></section>
<section class="features" id="features"><div class="container"><h2>Features</h2><div class="features-grid">${getFeaturesHTML(d)}</div></div></section>
<section class="tokenomics" id="tokenomics"><div class="container"><h2>Tokenomics</h2>${getContractHTML(d)}</div></section>
${getRoadmapHTML(d)}${getBuyHTML(d)}${getSocialsHTML(d)}${getFooterHTML(d)}`;
    return wrapPage(d, body);
}

// === Build CSS ===
function buildCSS(d) {
    const t = THEMES[d.theme] || THEMES['neon-dark'];
    const rgb = hexToRgb(t.accent);
    const darkRgb = hexToRgb(t.dark);

    return `*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:${t.primary};--accent:${t.accent};--cyan:${t.cyan};--green:${t.green};--dark:${t.dark};--card:${t.card};--border:${t.border};--text:${t.text};--muted:${t.muted}}
body{font-family:'Segoe UI',sans-serif;background:var(--dark);color:var(--text);line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:0 20px}
.bg-animation{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none}
#bgCanvas{width:100%;height:100%}
.navbar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(${darkRgb},.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);padding:15px 0}
.nav-inner{display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--accent);font-weight:800;font-size:1.3rem}
.nav-logo img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--accent)}
.nav-links{display:flex;list-style:none;gap:25px;align-items:center}
.nav-links a{color:var(--text);text-decoration:none;font-weight:500;transition:color .3s}
.nav-links a:hover{color:var(--accent)}
.nav-cta{background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff!important;padding:8px 20px;border-radius:50px}
.mobile-menu{display:none;background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer}
.nav-socials{display:flex;gap:8px}
.nav-social-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);text-decoration:none;font-size:1rem;transition:all .3s;overflow:hidden}
.nav-social-btn:hover{border-color:var(--accent);background:rgba(${rgb},.1);transform:scale(1.1)}
.social-img{width:20px;height:20px;border-radius:50%;object-fit:cover}
.social-img-lg{width:32px;height:32px;border-radius:50%;object-fit:cover}
.hero-socials{display:flex;justify-content:center;gap:12px;margin:20px 0;flex-wrap:wrap}
.hero-social-link{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border:1px solid var(--border);border-radius:50px;color:var(--text);text-decoration:none;font-size:.85rem;font-weight:500;transition:all .3s}
.hero-social-link:hover{border-color:var(--accent);color:var(--accent);background:rgba(${rgb},.05);transform:translateY(-2px)}
.hero{min-height:100vh;display:flex;align-items:center;text-align:center;padding:120px 20px 80px}
.hero-content{max-width:700px;margin:0 auto}
.hero-logo-main{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);box-shadow:0 0 30px rgba(${rgb},.4);animation:float 3s ease-in-out infinite;margin:0 auto 15px;display:block}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.hero-logo-placeholder{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--primary));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem;color:#fff;margin:0 auto 20px;box-shadow:0 0 30px rgba(${rgb},.4);animation:float 3s ease-in-out infinite}
.hero h1{font-size:3.5rem;font-weight:900;background:linear-gradient(135deg,var(--accent),var(--primary),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:15px 0}
.hero-tagline{font-size:1.2rem;color:var(--cyan);font-weight:600;margin-bottom:12px}
.hero-desc{color:var(--muted);margin-bottom:25px;font-size:1rem;max-width:600px;margin-left:auto;margin-right:auto}
.hero-btns{display:flex;gap:15px;justify-content:center;margin-bottom:40px;flex-wrap:wrap}
.btn-primary{display:inline-block;padding:14px 35px;background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:1.1rem;transition:all .3s}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(${rgb},.4)}
.btn-secondary{display:inline-block;padding:14px 35px;border:2px solid var(--primary);color:var(--primary);text-decoration:none;border-radius:50px;font-weight:700;transition:all .3s}
.btn-secondary:hover{background:var(--primary);color:#fff;transform:translateY(-3px)}
.hero-stats{display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.stat{text-align:center}.stat-val{display:block;font-size:1.5rem;font-weight:700;color:var(--green)}.stat-lbl{font-size:.8rem;color:var(--muted)}
section{padding:80px 0}
h2{font-size:2rem;font-weight:800;text-align:center;margin-bottom:15px;background:linear-gradient(135deg,var(--accent),var(--primary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.section-desc{text-align:center;color:var(--muted);max-width:600px;margin:0 auto 40px;font-size:1rem}
.about-highlights{display:flex;justify-content:center;gap:15px;flex-wrap:wrap;margin-top:30px}
.highlight-item{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);padding:10px 20px;border-radius:50px}
.hl-icon{font-size:1.2rem}.hl-text{color:var(--muted);font-size:.85rem;font-weight:500}
.features-grid,.token-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.feature-card,.token-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:25px;text-align:center;transition:all .3s}
.feature-card:hover,.token-card:hover{transform:translateY(-5px);border-color:var(--accent);box-shadow:0 10px 30px rgba(${rgb},.1)}
.feature-icon{font-size:2.5rem;margin-bottom:12px}
.feature-card h3{color:#fff;margin-bottom:8px}.feature-card p{color:var(--muted);font-size:.9rem}
.token-icon{font-size:2rem;margin-bottom:10px}
.token-card h3{font-size:.9rem;color:var(--muted)}.token-card p{font-size:1.3rem;font-weight:700;color:var(--cyan)}
.contract-box{text-align:center;margin-top:30px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.contract-box p{color:var(--muted);margin-bottom:8px;font-size:.85rem}
.contract-box code{color:var(--cyan);font-size:.85rem;word-break:break-all}
.copy-btn{background:var(--primary);color:#fff;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.8rem;margin-top:8px}
.roadmap-timeline{position:relative;padding-left:30px}
.roadmap-timeline::before{content:'';position:absolute;left:12px;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,var(--accent),var(--primary),var(--cyan));border-radius:3px}
.roadmap-item{position:relative;margin-bottom:30px}
.roadmap-marker{position:absolute;left:-30px;top:0}
.roadmap-marker span{display:inline-block;background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff;padding:4px 12px;border-radius:50px;font-size:.7rem;font-weight:700}
.roadmap-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:25px;margin-left:10px;transition:all .3s}
.roadmap-card:hover{border-color:var(--accent);transform:translateX(5px)}
.roadmap-card h3{color:#fff;margin-bottom:8px}.roadmap-card p{color:var(--muted);font-size:.9rem}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
.step{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:25px;text-align:center}
.step-num{width:50px;height:50px;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--primary));border-radius:50%;color:#fff;font-weight:800;font-size:1.2rem;margin-bottom:15px}
.step h3{color:#fff;margin-bottom:8px}.step p{color:var(--muted);font-size:.9rem}
.social-links{display:flex;justify-content:center;gap:15px;flex-wrap:wrap}
.social-btn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:20px 30px;border-radius:16px;text-decoration:none;font-weight:600;color:#fff;transition:all .3s}
.social-btn.tg{background:#0088cc}.social-btn.tw{background:#1da1f2}.social-btn.dc{background:#5865f2}
.social-btn:hover{transform:translateY(-3px);box-shadow:0 5px 15px rgba(0,0,0,.3)}
.social-icon{font-size:2rem}
.footer{border-top:1px solid var(--border);padding:30px 0}
.footer-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:20px}
.footer-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.2rem;color:var(--accent)}
.footer-logo{width:30px;height:30px;border-radius:50%;object-fit:cover}
.footer-links{display:flex;gap:20px;flex-wrap:wrap}
.footer-links a{color:var(--muted);text-decoration:none;font-size:.9rem;transition:color .3s}
.footer-links a:hover{color:var(--accent)}
.footer-bottom{text-align:center}
.footer-bottom p{color:var(--muted);font-size:.85rem;margin-bottom:5px}
.disclaimer{font-size:.75rem!important;opacity:.6}
.animate-in{opacity:0;transform:translateY(25px);transition:all .6s ease}
.animate-in.visible{opacity:1;transform:translateY(0)}
@media(max-width:768px){.nav-links{display:none}.nav-links.active{display:flex;position:absolute;top:100%;left:0;right:0;background:var(--dark);flex-direction:column;padding:20px;gap:15px;border-bottom:1px solid var(--border)}.mobile-menu{display:block}.hero h1{font-size:2.2rem}.hero-stats{gap:20px}.stat-val{font-size:1.2rem}.hero-btns{flex-direction:column;align-items:center}}
@media(max-width:480px){.hero h1{font-size:1.8rem}.hero-logo-main{width:90px;height:90px}.about-highlights{flex-direction:column;align-items:center}}
/* Template: Modern Split */
.hero-split .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;text-align:left}
.hero-split .hero-left h1{font-size:3rem}
.hero-split .hero-right{text-align:center}
.hero-split .hero-right .hero-logo-main{width:160px;height:160px;margin:0 auto 20px}
.hero-split .hero-right .hero-logo-placeholder{width:160px;height:160px;font-size:2rem;margin:0 auto 20px}
.hero-stats-vertical{display:flex;flex-direction:column;gap:15px;margin-top:20px}
/* Template: Minimal */
.hero-minimal{min-height:60vh}
.hero-minimal h1{font-size:4rem;letter-spacing:-2px}
.minimal-stats{display:flex;justify-content:center;gap:25px;flex-wrap:wrap;margin-top:20px}
.minimal-stats span{color:var(--muted);font-size:.9rem}
/* Template: Bold */
.hero-bold{min-height:100vh;position:relative}
.hero-bold .hero-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(180deg,transparent 0%,var(--dark) 100%)}
.hero-bold .hero-content{position:relative;z-index:2}
.hero-title-bold{font-size:4.5rem;letter-spacing:-3px}
.btn-large{padding:18px 45px;font-size:1.2rem}
/* Template: Cards */
.dashboard-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:20px}
.dash-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:25px;transition:all .3s}
.dash-card:hover{border-color:var(--accent)}
.dash-main{grid-column:1;grid-row:1/3}
.dash-val{font-size:1.5rem;font-weight:700;color:var(--cyan)}
@media(max-width:768px){.hero-split .hero-grid{grid-template-columns:1fr}.dashboard-grid{grid-template-columns:1fr}.hero-title-bold{font-size:2.5rem}}`;
}


// === Build JS (for generated website) ===
function buildJS(d) {
    return `// Background Animation
var canvas=document.getElementById('bgCanvas');
var ctx=canvas.getContext('2d');
var w,h,particles=[];
function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
resize();window.addEventListener('resize',resize);
function Particle(){this.x=Math.random()*w;this.y=Math.random()*h;this.vx=(Math.random()-.5)*.3;this.vy=(Math.random()-.5)*.3;this.r=Math.random()*2+1;this.color=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();}
Particle.prototype.update=function(){this.x+=this.vx;this.y+=this.vy;if(this.x<0||this.x>w)this.vx*=-1;if(this.y<0||this.y>h)this.vy*=-1;};
Particle.prototype.draw=function(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=this.color;ctx.globalAlpha=.4;ctx.fill();ctx.globalAlpha=1;};
for(var i=0;i<60;i++)particles.push(new Particle());
function drawLines(){for(var i=0;i<particles.length;i++){for(var j=i+1;j<particles.length;j++){var dx=particles[i].x-particles[j].x;var dy=particles[i].y-particles[j].y;var dist=Math.sqrt(dx*dx+dy*dy);if(dist<150){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle=particles[i].color;ctx.globalAlpha=(1-dist/150)*.1;ctx.stroke();ctx.globalAlpha=1;}}}}
function animate(){ctx.clearRect(0,0,w,h);particles.forEach(function(p){p.update();p.draw();});drawLines();requestAnimationFrame(animate);}
animate();

// Mobile menu
var mm=document.getElementById('mobileMenu');
var nl=document.querySelector('.nav-links');
if(mm)mm.addEventListener('click',function(){nl.classList.toggle('active');});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth'});if(nl)nl.classList.remove('active');});});

// Navbar scroll
window.addEventListener('scroll',function(){var n=document.querySelector('.navbar');if(window.scrollY>50){n.style.background='rgba(0,0,0,0.95)';n.style.boxShadow='0 5px 20px rgba(0,0,0,0.3)';}else{n.style.boxShadow='none';}});

// Scroll animations
var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.1});
document.querySelectorAll('.feature-card,.token-card,.roadmap-card,.step,.social-btn,.highlight-item').forEach(function(el){el.classList.add('animate-in');obs.observe(el);});`;
}

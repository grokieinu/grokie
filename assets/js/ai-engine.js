/**
 * Grokie Inu - AI Promotion Engine
 * Main logic: form handling, loading animation, result display
 */

let logoDataUrl = '';
let projectData = {};
let selectedTheme = 'neon-dark';
let selectedTemplate = 'classic';

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
function generatePromotion() {
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

    const steps = ['step1','step2','step3','step4','step5','step6'];
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
            setTimeout(() => {
                document.getElementById('loadingSection').classList.remove('active');
                displayResult();
            }, 500);
        }
    }, 500);
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
    const tagline = getTagline(d.name, d.category, d.blockchain);
    const features = getFeatures(d.category);
    const scores = getScores();
    const description = `${d.name} (${d.ticker}) is a ${d.category.toLowerCase()} project on ${d.blockchain}. ${d.desc} Built for the community with transparency and real utility.`;

    let social = `🚀 Introducing ${d.name} (${d.ticker})\n\n${tagline}\n\n`;
    social += `🔹 ${d.desc.substring(0,140)}${d.desc.length>140?'...':''}\n\n`;
    social += `⛓️ ${d.blockchain} | 💰 Supply: ${d.totalSupply}\n📅 Launch: ${d.launchDate}\n\n`;
    social += `💎 Why ${d.ticker}?\n✅ ${features[0].d}\n✅ ${features[1].d}\n✅ ${features[2].d}\n✅ Fair & transparent\n`;
    if (d.twitter) social += `\n🐦 ${d.twitter}`;
    if (d.telegram) social += `\n💬 ${d.telegram}`;
    social += `\n\n#${d.name.replace(/\s+/g,'')} #${d.ticker.replace('$','')} #${d.blockchain} #Crypto`;

    // Store for template generator
    projectData.tagline = tagline;
    projectData.features = features;
    projectData.scores = scores;
    projectData.description = description;

    // Update UI
    document.getElementById('resultSection').classList.add('active');
    document.getElementById('resultName').textContent = d.name;
    document.getElementById('previewUrl').textContent = `${d.name.toLowerCase().replace(/\s+/g,'')}.com`;
    document.getElementById('previewTitle').textContent = d.name;
    document.getElementById('previewTagline').textContent = tagline;
    document.getElementById('previewDesc').textContent = description;
    document.getElementById('previewFeatures').innerHTML = features.map(f => `<div class="feature-item"><strong>${f.t}</strong>${f.d}</div>`).join('');
    document.getElementById('previewCta').textContent = `Buy ${d.ticker} Now`;
    document.getElementById('socialPost').textContent = social;
    document.getElementById('scoreOverall').textContent = scores.overall + '/100';
    document.getElementById('scoreCommunity').textContent = scores.community + '/100';
    document.getElementById('scoreTransparency').textContent = scores.transparency + '/100';
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

/**
 * Grokie Inu - Trending Coins
 * Each tab fetches different data from DexScreener
 * All filtered to last 1 hour only
 */

let currentFilter = 'trending';
let cachedData = { trending: [], gainers: [], newest: [] };

// Load on page start
loadCurrentTab();
setInterval(refreshCurrentTab, 10000);

async function loadCurrentTab() {
    showLoading(true);
    hideError();
    await fetchTab(currentFilter);
    showLoading(false);
    if (cachedData[currentFilter].length === 0) { showError(); return; }
    renderList();
}

async function refreshCurrentTab() {
    await fetchTab(currentFilter);
    if (cachedData[currentFilter].length > 0) {
        hideError();
        renderList();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('filter' + filter.charAt(0).toUpperCase() + filter.slice(1)).classList.add('active');
    loadCurrentTab();
}

// === Fetch data based on active tab ===
async function fetchTab(tab) {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const stablecoins = ['SOL', 'USDC', 'USDT', 'WBTC', 'WETH', 'WSOL', 'RAY'];

    try {
        switch (tab) {
            case 'trending':
                await fetchTrending(oneHourAgo, stablecoins);
                break;
            case 'gainers':
                await fetchGainers(oneHourAgo, stablecoins);
                break;
            case 'newest':
                await fetchNewest(oneHourAgo, stablecoins);
                break;
        }
    } catch(e) {
        console.error('Fetch error:', e);
    }
}

// --- TRENDING: new coins with >200% gain in 24h ---
async function fetchTrending(oneHourAgo, stablecoins) {
    let pairs = [];
    try {
        const resp = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
        if (resp.ok) {
            const boosts = await resp.json();
            if (Array.isArray(boosts)) {
                const solana = boosts.filter(t => t.chainId === 'solana').slice(0, 40);
                const addrs = solana.map(t => t.tokenAddress).filter(Boolean);
                pairs = await fetchPairsByAddresses(addrs);
            }
        }
    } catch(e) {}

    try {
        const resp2 = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (resp2.ok) {
            const profiles = await resp2.json();
            if (Array.isArray(profiles)) {
                const solana2 = profiles.filter(t => t.chainId === 'solana').slice(0, 50);
                const addrs2 = solana2.map(t => t.tokenAddress).filter(Boolean);
                const morePairs = await fetchPairsByAddresses(addrs2);
                pairs = pairs.concat(morePairs);
            }
        }
    } catch(e) {}

    // Filter: Solana, exclude stables, ONLY positive gain in 24h
    pairs = pairs.filter(p =>
        p.chainId === 'solana' &&
        p.baseToken && p.baseToken.symbol &&
        !stablecoins.includes(p.baseToken.symbol.toUpperCase()) &&
        p.liquidity && p.liquidity.usd > 100 &&
        p.priceChange && p.priceChange.h24 > 0
    );

    // Sort by highest 24h gain (largest first)
    pairs.sort((a, b) => {
        const ca = a.priceChange ? (a.priceChange.h24 || 0) : 0;
        const cb = b.priceChange ? (b.priceChange.h24 || 0) : 0;
        return cb - ca;
    });
    cachedData.trending = dedup(pairs).slice(0, 35);
}

// --- TOP GAINERS: highest price change in last 1 hour ---
async function fetchGainers(oneHourAgo, stablecoins) {
    let pairs = [];

    // Get from token profiles + boosts (same sources, different sort)
    try {
        const resp = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (resp.ok) {
            const profiles = await resp.json();
            if (Array.isArray(profiles)) {
                const solana = profiles.filter(t => t.chainId === 'solana').slice(0, 50);
                const addrs = solana.map(t => t.tokenAddress).filter(Boolean);
                pairs = await fetchPairsByAddresses(addrs);
            }
        }
    } catch(e) {}

    try {
        const resp2 = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
        if (resp2.ok) {
            const boosts = await resp2.json();
            if (Array.isArray(boosts)) {
                const solana2 = boosts.filter(t => t.chainId === 'solana').slice(0, 30);
                const addrs2 = solana2.map(t => t.tokenAddress).filter(Boolean);
                const morePairs = await fetchPairsByAddresses(addrs2);
                pairs = pairs.concat(morePairs);
            }
        }
    } catch(e) {}

    // Filter, only >60% gain in 6h, sort by gain
    pairs = filterPairs(pairs, stablecoins, oneHourAgo);
    pairs = pairs.filter(p => p.priceChange && (p.priceChange.h6 || p.priceChange.h24 || 0) > 60);
    pairs.sort((a, b) => {
        const ca = a.priceChange ? (a.priceChange.h6 || a.priceChange.h24 || 0) : 0;
        const cb = b.priceChange ? (b.priceChange.h6 || b.priceChange.h24 || 0) : 0;
        return cb - ca;
    });
    cachedData.gainers = dedup(pairs).slice(0, 10);
}

// --- NEW LISTINGS: tokens created within last 1 hour ---
async function fetchNewest(oneHourAgo, stablecoins) {
    let pairs = [];

    // Latest profiles are the best source for new tokens
    try {
        const resp = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (resp.ok) {
            const profiles = await resp.json();
            if (Array.isArray(profiles)) {
                const solana = profiles.filter(t => t.chainId === 'solana').slice(0, 60);
                const addrs = solana.map(t => t.tokenAddress).filter(Boolean);
                pairs = await fetchPairsByAddresses(addrs);
            }
        }
    } catch(e) {}

    // Filter: only pairs created in last 1 hour
    pairs = pairs.filter(p =>
        p.chainId === 'solana' &&
        p.baseToken && p.baseToken.symbol &&
        !stablecoins.includes(p.baseToken.symbol.toUpperCase()) &&
        p.pairCreatedAt && p.pairCreatedAt > oneHourAgo
    );

    pairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    cachedData.newest = dedup(pairs).slice(0, 35);
}

// === Helper: fetch pair data by token addresses ===
async function fetchPairsByAddresses(addresses) {
    let results = [];
    for (let i = 0; i < addresses.length; i += 30) {
        const batch = addresses.slice(i, i + 30).join(',');
        try {
            const resp = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + batch);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.pairs) results = results.concat(data.pairs);
            }
        } catch(e) {}
    }
    return results;
}

// === Helper: filter pairs ===
function filterPairs(pairs, stablecoins, oneHourAgo) {
    return pairs.filter(p =>
        p.chainId === 'solana' &&
        p.baseToken && p.baseToken.symbol &&
        !stablecoins.includes(p.baseToken.symbol.toUpperCase()) &&
        p.volume && p.volume.h24 > 0 &&
        p.liquidity && p.liquidity.usd > 100
    );
}

// === Helper: deduplicate by token address ===
function dedup(pairs) {
    const map = {};
    pairs.forEach(p => {
        const addr = p.baseToken ? p.baseToken.address : '';
        if (!addr) return;
        if (!map[addr] || (p.volume && p.volume.h24 > (map[addr].volume ? map[addr].volume.h24 : 0))) {
            map[addr] = p;
        }
    });
    return Object.values(map);
}

// === Render list ===
function renderList() {
    const pairs = cachedData[currentFilter];
    const list = document.getElementById('coinList');

    if (!pairs || pairs.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;grid-column:1/-1">No coins found in the last 1 hour for this category.</p>';
        return;
    }

    list.innerHTML = pairs.map((p, i) => {
        const name = p.baseToken ? p.baseToken.name : 'Unknown';
        const symbol = p.baseToken ? p.baseToken.symbol : '???';
        const logo = (p.info && p.info.imageUrl) ? p.info.imageUrl : '';
        const price = parseFloat(p.priceUsd || 0);
        // Use h24 for trending, h6 for gainers, h1 for newest
        let change = 0;
        if (p.priceChange) {
            if (currentFilter === 'trending') change = p.priceChange.h24 || 0;
            else if (currentFilter === 'gainers') change = p.priceChange.h6 || p.priceChange.h24 || 0;
            else change = p.priceChange.h1 || p.priceChange.h24 || 0;
        }
        const tokenAddr = p.baseToken ? p.baseToken.address : '';
        const pairAddr = p.pairAddress || '';
        // Use Birdeye on mobile (avoids DexScreener app deep link issue)
        // DexScreener app intercepts URL but doesn't open the correct token
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        let pairUrl = '';
        if (isMobile) {
            // Birdeye doesn't have an app that intercepts, opens in browser correctly
            pairUrl = tokenAddr ? 'https://birdeye.so/token/' + tokenAddr + '?chain=solana' : 'https://birdeye.so';
        } else if (p.url) {
            pairUrl = p.url;
        } else if (pairAddr) {
            pairUrl = 'https://dexscreener.com/solana/' + pairAddr;
        } else if (tokenAddr) {
            pairUrl = 'https://dexscreener.com/solana/' + tokenAddr;
        } else {
            pairUrl = 'https://dexscreener.com/solana';
        }
        const createdAt = p.pairCreatedAt || 0;

        let priceStr;
        if (price < 0.000001) priceStr = '$' + price.toFixed(8);
        else if (price < 0.01) priceStr = '$' + price.toFixed(5);
        else if (price < 1) priceStr = '$' + price.toFixed(3);
        else priceStr = '$' + price.toFixed(2);

        const changeClass = change >= 0 ? 'up' : 'down';
        const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1) + '%';

        let ageStr = '';
        if (createdAt > 0) {
            const minsAgo = Math.floor((Date.now() - createdAt) / 60000);
            if (minsAgo < 1) ageStr = 'Just now';
            else if (minsAgo < 60) ageStr = minsAgo + 'm ago';
            else ageStr = Math.floor(minsAgo / 60) + 'h ago';
        }

        const logoHtml = logo
            ? '<img class="coin-logo" src="' + logo + '" alt="' + symbol + '" onerror="this.src=\'\';this.style.background=\'var(--dark)\'">'
            : '<div class="coin-logo" style="display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--accent)">' + symbol.charAt(0) + '</div>';

        return '<a class="coin-card" href="' + pairUrl + '" target="_blank">' +
            '<span class="coin-rank">#' + (i + 1) + '</span>' +
            logoHtml +
            '<div class="coin-info"><div class="coin-name">' + name + '</div><div class="coin-ticker">$' + symbol + '</div>' +
            (ageStr ? '<div class="coin-age">🚀 ' + ageStr + '</div>' : '') +
            '</div>' +
            '<div class="coin-right"><div class="coin-price">' + priceStr + '</div><span class="coin-change ' + changeClass + '">' + changeStr + '</span></div>' +
            '</a>';
    }).join('');
}

// === UI Helpers ===
function showLoading(show) {
    document.getElementById('loadingState').classList.toggle('active', show);
    if (show) document.getElementById('coinList').innerHTML = '';
}
function showError() { document.getElementById('errorState').classList.add('active'); }
function hideError() { document.getElementById('errorState').classList.remove('active'); }

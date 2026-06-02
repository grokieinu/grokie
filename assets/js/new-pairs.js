/**
 * Grokie Inu - New Pair Alert
 * Real-time feed of new token launches on Solana
 * Refreshes every 10 seconds seamlessly
 */

let allNewPairs = [];
let isFirstLoad = true;

// Start
fetchNewPairs();
setInterval(fetchNewPairs, 10000);

async function fetchNewPairs() {
    try {
        // Fetch latest token profiles from DexScreener
        const resp = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (!resp.ok) return;
        const profiles = await resp.json();
        if (!Array.isArray(profiles)) return;

        // Filter Solana only
        const solanaTokens = profiles.filter(t => t.chainId === 'solana').slice(0, 50);
        if (solanaTokens.length === 0) return;

        // Fetch pair data for these tokens
        const addresses = solanaTokens.map(t => t.tokenAddress).filter(Boolean);
        let pairs = [];
        for (let i = 0; i < addresses.length; i += 30) {
            const batch = addresses.slice(i, i + 30).join(',');
            try {
                const pResp = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + batch);
                if (pResp.ok) {
                    const pData = await pResp.json();
                    if (pData && pData.pairs) pairs = pairs.concat(pData.pairs);
                }
            } catch(e) {}
        }

        // Filter: Solana, has liquidity, created recently (last 2 hours)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        const stablecoins = ['SOL', 'USDC', 'USDT', 'WBTC', 'WETH', 'WSOL', 'RAY'];

        pairs = pairs.filter(p =>
            p.chainId === 'solana' &&
            p.baseToken && p.baseToken.symbol &&
            !stablecoins.includes(p.baseToken.symbol.toUpperCase()) &&
            p.pairCreatedAt && p.pairCreatedAt > twoHoursAgo &&
            p.liquidity && p.liquidity.usd > 0
        );

        // Deduplicate by token address
        const pairMap = {};
        pairs.forEach(p => {
            const addr = p.baseToken.address;
            if (!pairMap[addr] || (p.liquidity.usd > (pairMap[addr].liquidity ? pairMap[addr].liquidity.usd : 0))) {
                pairMap[addr] = p;
            }
        });

        // Sort by newest first
        const newPairs = Object.values(pairMap).sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));

        // Mark new entries (pairs not in previous list)
        const prevAddresses = allNewPairs.map(p => p.baseToken ? p.baseToken.address : '');
        newPairs.forEach(p => {
            p._isNew = !isFirstLoad && !prevAddresses.includes(p.baseToken.address);
        });

        allNewPairs = newPairs;
        isFirstLoad = false;

        // Update UI
        document.getElementById('loadingState').style.display = 'none';
        updateStats();
        renderPairs();

    } catch(e) {
        console.error('Fetch error:', e);
        if (isFirstLoad) {
            document.getElementById('loadingState').innerHTML = '<p>⚠️ Could not fetch data. Retrying...</p>';
        }
    }
}

function renderPairs() {
    const minLiq = parseInt(document.getElementById('minLiqFilter').value) || 0;
    const filtered = allNewPairs.filter(p => p.liquidity && p.liquidity.usd >= minLiq);

    const feed = document.getElementById('pairFeed');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        feed.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    feed.innerHTML = filtered.map(p => {
        const name = p.baseToken.name || 'Unknown';
        const symbol = p.baseToken.symbol || '???';
        const tokenAddr = p.baseToken.address || '';
        const logo = (p.info && p.info.imageUrl) ? p.info.imageUrl : '';
        const liq = p.liquidity ? p.liquidity.usd : 0;
        const vol = p.volume ? (p.volume.h24 || 0) : 0;
        const createdAt = p.pairCreatedAt || 0;
        const pairAddr = p.pairAddress || '';
        const isNew = p._isNew;

        // Calculate age
        const minsAgo = Math.floor((Date.now() - createdAt) / 60000);
        let ageStr;
        if (minsAgo < 1) ageStr = 'NOW';
        else if (minsAgo < 60) ageStr = minsAgo + 'm';
        else ageStr = Math.floor(minsAgo / 60) + 'h ' + (minsAgo % 60) + 'm';

        // Link
        let url;
        if (isMobile) {
            url = 'https://birdeye.so/token/' + tokenAddr + '?chain=solana';
        } else {
            url = p.url || ('https://dexscreener.com/solana/' + (pairAddr || tokenAddr));
        }

        const logoHtml = logo
            ? '<img class="pair-logo" src="' + logo + '" alt="' + symbol + '" onerror="this.style.display=\'none\'">'
            : '<div class="pair-logo" style="display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--accent)">' + symbol.charAt(0) + '</div>';

        return '<a class="pair-card' + (isNew ? ' new-entry' : '') + '" href="' + url + '" target="_blank">' +
            '<div class="pair-age"><span class="pair-age-val">' + ageStr + '</span><span class="pair-age-lbl">ago</span></div>' +
            logoHtml +
            '<div class="pair-info"><div class="pair-name">' + name + '</div><div class="pair-ticker">$' + symbol + '</div>' +
            '<div class="pair-meta"><span>💧 $' + formatNum(liq) + '</span><span>📊 $' + formatNum(vol) + '</span><span>📋 ' + tokenAddr.substring(0,6) + '...</span></div></div>' +
            '<div class="pair-right"><div class="pair-liq">$' + formatNum(liq) + '</div><div class="pair-liq-lbl">Liquidity</div>' +
            '<span class="pair-action">View →</span></div>' +
            '</a>';
    }).join('');
}

function updateStats() {
    const minLiq = parseInt(document.getElementById('minLiqFilter').value) || 0;
    const filtered = allNewPairs.filter(p => p.liquidity && p.liquidity.usd >= minLiq);

    document.getElementById('statTotal').textContent = filtered.length;

    // Last update time
    const now = new Date();
    document.getElementById('statLast').textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');

    // Average liquidity
    if (filtered.length > 0) {
        const avgLiq = filtered.reduce((sum, p) => sum + (p.liquidity ? p.liquidity.usd : 0), 0) / filtered.length;
        document.getElementById('statLiq').textContent = '$' + formatNum(avgLiq);
    }
}

function formatNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
}

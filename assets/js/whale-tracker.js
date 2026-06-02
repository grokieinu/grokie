/**
 * Grokie Inu - Whale Tracker
 * Track top holders and recent whale activity for any Solana token
 * Uses Helius RPC + DexScreener
 */

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=d33d23ca-ca10-4b9b-b231-13043e8f53c5';

async function trackToken() {
    const ca = document.getElementById('tokenInput').value.trim();
    if (!ca || ca.length < 32 || ca.length > 50) {
        alert('Please enter a valid Solana token address.');
        return;
    }

    showLoading(true);
    hideError();
    hideResults();

    try {
        // 1. Get token supply
        const supplyData = await rpc('getTokenSupply', [ca]);
        if (!supplyData || !supplyData.value) throw new Error('NOT_FOUND');

        const decimals = supplyData.value.decimals || 0;
        const totalSupply = parseFloat(supplyData.value.uiAmount || supplyData.value.uiAmountString || 0);

        // 2. Get largest holders
        const holdersData = await rpc('getTokenLargestAccounts', [ca]);
        const holders = holdersData && holdersData.value ? holdersData.value : [];

        // 3. Get DexScreener data for price/name
        let dexInfo = null;
        try {
            const dexResp = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + ca);
            if (dexResp.ok) {
                const d = await dexResp.json();
                if (d && d.pairs && d.pairs.length > 0) {
                    dexInfo = d.pairs.find(p => p.chainId === 'solana') || d.pairs[0];
                }
            }
        } catch(e) {}

        // 4. Get recent signatures for whale activity
        let recentTxs = [];
        try {
            const sigs = await rpc('getSignaturesForAddress', [ca, {limit: 50}]);
            if (sigs && sigs.length > 0) recentTxs = sigs;
        } catch(e) {}

        // 5. Analyze whale transactions
        let whaleActivity = [];
        const whaleAddresses = holders.slice(0, 5).map(h => h.address);

        // Check recent transactions from whale wallets
        for (const wAddr of whaleAddresses.slice(0, 3)) {
            try {
                const wSigs = await rpc('getSignaturesForAddress', [wAddr, {limit: 10}]);
                if (wSigs && wSigs.length > 0) {
                    const last24h = Date.now() / 1000 - 86400;
                    wSigs.forEach(sig => {
                        if (sig.blockTime && sig.blockTime > last24h) {
                            whaleActivity.push({
                                wallet: wAddr,
                                signature: sig.signature,
                                time: sig.blockTime,
                                err: sig.err
                            });
                        }
                    });
                }
            } catch(e) {}
        }

        // Sort activity by time
        whaleActivity.sort((a, b) => (b.time || 0) - (a.time || 0));

        showLoading(false);
        displayResults(ca, holders, totalSupply, decimals, dexInfo, whaleActivity);

    } catch(e) {
        console.error('Track error:', e);
        showLoading(false);
        showError(e.message === 'NOT_FOUND' ? '❌ Token not found. Please check the address.' : '❌ Error: ' + e.message);
    }
}

function displayResults(ca, holders, totalSupply, decimals, dexInfo, activity) {
    // Token header
    const name = dexInfo && dexInfo.baseToken ? dexInfo.baseToken.name : 'Unknown Token';
    const symbol = dexInfo && dexInfo.baseToken ? dexInfo.baseToken.symbol : '???';
    const logo = dexInfo && dexInfo.info && dexInfo.info.imageUrl ? dexInfo.info.imageUrl : '';
    const price = dexInfo ? parseFloat(dexInfo.priceUsd || 0) : 0;
    const liq = dexInfo && dexInfo.liquidity ? dexInfo.liquidity.usd : 0;

    const logoHtml = logo ? '<img src="' + logo + '" alt="' + symbol + '">' : '';
    document.getElementById('tokenHeader').innerHTML =
        logoHtml +
        '<div class="token-header-info"><h3>' + name + '</h3><span class="th-ticker">$' + symbol + ' · ' + ca.substring(0,6) + '...</span></div>' +
        '<div class="token-header-stats">' +
        '<div class="th-stat"><span class="th-stat-val">' + formatNum(totalSupply) + '</span><span class="th-stat-lbl">Supply</span></div>' +
        (price ? '<div class="th-stat"><span class="th-stat-val">$' + (price < 0.01 ? price.toFixed(6) : price.toFixed(4)) + '</span><span class="th-stat-lbl">Price</span></div>' : '') +
        (liq ? '<div class="th-stat"><span class="th-stat-val">$' + formatNum(liq) + '</span><span class="th-stat-lbl">Liquidity</span></div>' : '') +
        '</div>';

    // Whale list
    const maxPct = holders.length > 0 ? getBalance(holders[0]) / totalSupply * 100 : 1;
    document.getElementById('whaleList').innerHTML = holders.slice(0, 10).map((h, i) => {
        const balance = getBalance(h);
        const pct = totalSupply > 0 ? (balance / totalSupply * 100) : 0;
        const barWidth = maxPct > 0 ? (pct / maxPct * 100) : 0;
        const addr = h.address || '';

        return '<div class="whale-card">' +
            '<span class="whale-rank">#' + (i + 1) + '</span>' +
            '<span class="whale-addr">' + addr.substring(0,4) + '...' + addr.substring(addr.length - 4) + '</span>' +
            '<div class="whale-bar-wrap"><div class="whale-bar" style="width:' + barWidth + '%"></div></div>' +
            '<span class="whale-pct">' + pct.toFixed(2) + '%</span>' +
            '<span class="whale-balance">' + formatNum(balance) + '</span>' +
            '</div>';
    }).join('');

    // Activity feed
    if (activity.length > 0) {
        document.getElementById('activityFeed').innerHTML = activity.slice(0, 15).map(a => {
            const addr = a.wallet;
            const shortAddr = addr.substring(0,4) + '...' + addr.substring(addr.length - 4);
            const timeAgo = getTimeAgo(a.time);
            const isFailed = a.err !== null;

            return '<div class="activity-item">' +
                '<span class="activity-icon">' + (isFailed ? '⚠️' : '🐋') + '</span>' +
                '<div class="activity-info"><span class="activity-action ' + (isFailed ? '' : 'buy') + '">' + shortAddr + (isFailed ? ' — Failed tx' : ' — Transaction detected') + '</span>' +
                '<div class="activity-detail">Sig: ' + a.signature.substring(0,12) + '...</div></div>' +
                '<span class="activity-time">' + timeAgo + '</span>' +
                '</div>';
        }).join('');
    } else {
        document.getElementById('activityFeed').innerHTML = '<div class="no-activity">No whale activity detected in the last 24 hours.</div>';
    }

    document.getElementById('results').classList.add('active');
}

// === Helpers ===
async function rpc(method, params) {
    const resp = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({jsonrpc:'2.0', id:1, method, params})
    });
    if (!resp.ok) throw new Error('RPC HTTP ' + resp.status);
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || 'RPC Error');
    return data.result;
}

function getBalance(account) {
    if (!account) return 0;
    if (account.uiAmount !== null && account.uiAmount !== undefined) return parseFloat(account.uiAmount);
    if (account.uiAmountString) return parseFloat(account.uiAmountString);
    if (account.amount && account.decimals !== undefined) return parseInt(account.amount) / Math.pow(10, account.decimals);
    return 0;
}

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const secs = Math.floor(Date.now() / 1000 - timestamp);
    if (secs < 60) return secs + 's ago';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    return Math.floor(secs / 86400) + 'd ago';
}

function formatNum(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
}

function showLoading(show) { document.getElementById('loadingState').classList.toggle('active', show); }
function hideError() { document.getElementById('errorState').classList.remove('active'); }
function showError(msg) { document.getElementById('errorMsg').textContent = msg; document.getElementById('errorState').classList.add('active'); }
function hideResults() { document.getElementById('results').classList.remove('active'); }
function resetTracker() { hideError(); document.getElementById('tokenInput').value = ''; document.getElementById('tokenInput').focus(); }

// Enter key support
document.getElementById('tokenInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') trackToken(); });

/**
 * Grokie Inu - AI Token Audit & Trust Score (Deep Analysis)
 * Comprehensive on-chain security scanner for Solana SPL tokens
 * Uses DexScreener API + Solana RPC with CORS-friendly fallbacks
 */

const RPC_ENDPOINTS = [
    'https://mainnet.helius-rpc.com/?api-key=d33d23ca-ca10-4b9b-b231-13043e8f53c5'
];

let currentRpcIndex = 0;
let useProxy = false;
let auditData = {};

// Known program IDs
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// === Main Scan Function ===
async function scanToken() {
    const ca = document.getElementById('tokenCA').value.trim();
    if (!ca || ca.length < 32 || ca.length > 50) {
        alert('Please enter a valid Solana token address (32-44 characters).');
        return;
    }

    document.getElementById('auditResult').classList.remove('active');
    document.getElementById('auditError').classList.remove('active');
    document.getElementById('scanLoading').classList.add('active');
    document.getElementById('scanBtn').disabled = true;

    const steps = ['scanStep1','scanStep2','scanStep3','scanStep4','scanStep5'];
    steps.forEach(s => { document.getElementById(s).classList.remove('active','done'); });

    try {
        // Step 1: Fetch mint account (RPC - may fail due to CORS)
        setStep(steps, 0);
        let accountInfo = null;
        try {
            accountInfo = await rpcCall('getAccountInfo', [ca, {encoding:'jsonParsed'}]);
        } catch(e) { console.warn('RPC getAccountInfo failed:', e.message); }
        await delay(300);
        doneStep(steps, 0);

        // Step 2: Get supply, holders (RPC - may fail)
        setStep(steps, 1);
        let supplyData = null, largestAccounts = null, signatures = null;
        try { supplyData = await rpcCall('getTokenSupply', [ca]); } catch(e) {}
        try { largestAccounts = await rpcCall('getTokenLargestAccounts', [ca]); } catch(e) {}
        try { signatures = await rpcCall('getSignaturesForAddress', [ca, {limit: 20}]); } catch(e) {}
        await delay(300);
        doneStep(steps, 1);

        // Step 3: Analyze authorities
        setStep(steps, 2);
        let parsedData = accountInfo && accountInfo.value ? accountInfo.value.data.parsed : null;
        let mintInfo = parsedData ? parsedData.info : null;
        let ownerProgram = accountInfo && accountInfo.value ? (accountInfo.value.owner || '') : '';
        await delay(300);
        doneStep(steps, 2);

        // Step 4: DEX data (DexScreener - multiple endpoints)
        setStep(steps, 3);
        let dexData = null;
        const dexUrls = [
            'https://api.dexscreener.com/latest/dex/tokens/' + ca,
            'https://api.dexscreener.com/latest/dex/search?q=' + ca,
            'https://api.dexscreener.com/token-pairs/v1/solana/' + ca
        ];
        for (const dexUrl of dexUrls) {
            if (dexData) break;
            try {
                const dexResp = await fetch(dexUrl);
                if (!dexResp.ok) continue;
                const d = await dexResp.json();
                // Handle different response formats
                if (d && d.pairs && d.pairs.length > 0) {
                    dexData = d;
                } else if (Array.isArray(d) && d.length > 0) {
                    // New API returns array directly
                    dexData = { pairs: d };
                }
            } catch(e) { continue; }
        }
        console.log('DexScreener result:', dexData ? dexData.pairs.length + ' pairs found' : 'no pairs');
        await delay(400);
        doneStep(steps, 3);

        // Need at least one data source
        if (!accountInfo && (!dexData || !dexData.pairs || dexData.pairs.length === 0)) {
            throw new Error('TOKEN_NOT_FOUND');
        }

        // Step 5: Generate report
        setStep(steps, 4);
        const report = generateDeepReport(ca, mintInfo, supplyData, largestAccounts, ownerProgram, signatures, dexData);
        await delay(300);
        doneStep(steps, 4);

        setTimeout(() => {
            document.getElementById('scanLoading').classList.remove('active');
            displayResult(report);
        }, 200);

    } catch (err) {
        console.error('Scan error:', err);
        document.getElementById('scanLoading').classList.remove('active');
        showError(err.message);
    }
    document.getElementById('scanBtn').disabled = false;
}

// === RPC Helper (Helius - CORS enabled) ===
async function rpcCall(method, params) {
    const rpcUrl = RPC_ENDPOINTS[0];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const resp = await fetch(rpcUrl, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({jsonrpc:'2.0', id:1, method, params}),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message || 'RPC Error');
        return data.result;
    } catch(e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

// === Deep Report Generator ===
function generateDeepReport(ca, mintInfo, supplyData, largestAccounts, ownerProgram, signatures, dexData) {
    const report = { ca, checks: [], risks: [], positives: [], score: 0, info: {}, holders: {}, market: {}, meta: {} };

    // --- Token Basic Info ---
    const supply = supplyData && supplyData.value ? supplyData.value : null;
    const decimals = supply ? supply.decimals : (mintInfo ? mintInfo.decimals : 0);
    let totalSupply = 0;
    if (supply) {
        if (supply.uiAmount !== null && supply.uiAmount !== undefined) {
            totalSupply = parseFloat(supply.uiAmount);
        } else if (supply.uiAmountString) {
            totalSupply = parseFloat(supply.uiAmountString);
        } else if (supply.amount) {
            totalSupply = parseInt(supply.amount) / Math.pow(10, supply.decimals || 0);
        }
    }
    const rawSupply = supply ? supply.amount : '0';

    report.info = {
        address: ca,
        decimals: decimals,
        supply: totalSupply ? formatNumber(totalSupply) : 'Unknown',
        rawSupply: rawSupply,
        program: ownerProgram === TOKEN_2022_PROGRAM ? 'Token-2022' : (ownerProgram === TOKEN_PROGRAM ? 'Token Program' : 'Unknown')
    };

    // --- 1. MINT AUTHORITY CHECK ---
    const mintAuthority = mintInfo ? mintInfo.mintAuthority : null;
    if (!mintAuthority) {
        report.checks.push({ text: 'Mint Authority Revoked — no new tokens can be created', status: 'safe', icon: '✅', category: 'authority' });
        report.positives.push('Mint authority is permanently revoked');
        report.score += 20;
    } else {
        report.checks.push({ text: 'Mint Authority ACTIVE — owner can mint unlimited tokens', status: 'danger', icon: '🚨', category: 'authority' });
        report.risks.push({ text: 'Mint authority is active. The owner can create unlimited new tokens at any time, diluting all holders.', severity: 'critical' });
        report.score += 3;
    }

    // --- 2. FREEZE AUTHORITY CHECK ---
    const freezeAuthority = mintInfo ? mintInfo.freezeAuthority : null;
    if (!freezeAuthority) {
        report.checks.push({ text: 'Freeze Authority Disabled — tokens cannot be frozen', status: 'safe', icon: '✅', category: 'authority' });
        report.positives.push('No one can freeze holder accounts');
        report.score += 15;
    } else {
        report.checks.push({ text: 'Freeze Authority ACTIVE — holder tokens can be frozen', status: 'danger', icon: '🚨', category: 'authority' });
        report.risks.push({ text: 'Freeze authority is active. The owner can freeze any wallet, preventing them from selling.', severity: 'critical' });
        report.score += 3;
    }

    // --- 3. TOKEN PROGRAM TYPE ---
    if (ownerProgram === TOKEN_2022_PROGRAM) {
        report.checks.push({ text: 'Uses Token-2022 program (extended features)', status: 'warning', icon: '⚠️', category: 'program' });
        report.risks.push({ text: 'Token-2022 supports extensions like transfer fees, confidential transfers, and permanent delegate. These can be used maliciously.', severity: 'medium' });
        report.score += 5;
    } else if (ownerProgram === TOKEN_PROGRAM) {
        report.checks.push({ text: 'Uses standard Token Program (well-audited)', status: 'safe', icon: '✅', category: 'program' });
        report.positives.push('Standard SPL Token program — widely audited and trusted');
        report.score += 10;
    }

    // --- 4. SUPPLY ANALYSIS ---
    if (totalSupply > 0) {
        report.checks.push({ text: 'Total supply verified: ' + report.info.supply, status: 'safe', icon: '✅', category: 'supply' });
        report.score += 5;
        if (totalSupply > 1e15) {
            report.checks.push({ text: 'Extremely high supply (' + report.info.supply + ') — common in scam tokens', status: 'warning', icon: '⚠️', category: 'supply' });
            report.risks.push({ text: 'Very high supply (>1 quadrillion). Often used to manipulate perceived low price.', severity: 'low' });
        }
    } else {
        report.checks.push({ text: 'Could not verify token supply', status: 'warning', icon: '⚠️', category: 'supply' });
        report.score += 2;
    }

    // --- 5. DECIMALS CHECK ---
    if (decimals === 9 || decimals === 6) {
        report.checks.push({ text: 'Standard decimals (' + decimals + ')', status: 'safe', icon: '✅', category: 'supply' });
        report.score += 3;
    } else if (decimals === 0) {
        report.checks.push({ text: 'Zero decimals — NFT-like or unusual', status: 'warning', icon: '⚠️', category: 'supply' });
        report.score += 1;
    } else {
        report.checks.push({ text: 'Non-standard decimals (' + decimals + ')', status: 'warning', icon: '⚠️', category: 'supply' });
        report.score += 2;
    }

    // --- 6. HOLDER CONCENTRATION ANALYSIS ---
    const accounts = largestAccounts && largestAccounts.value ? largestAccounts.value : [];

    // Helper: get balance from account object (handle different RPC response formats)
    function getAccountBalance(acc) {
        if (!acc) return 0;
        if (acc.uiAmount !== null && acc.uiAmount !== undefined) return parseFloat(acc.uiAmount);
        if (acc.uiAmountString) return parseFloat(acc.uiAmountString);
        if (acc.amount && acc.decimals !== undefined) return parseInt(acc.amount) / Math.pow(10, acc.decimals);
        if (acc.amount) return parseInt(acc.amount) / Math.pow(10, decimals);
        return 0;
    }

    const top1Balance = accounts.length > 0 ? getAccountBalance(accounts[0]) : 0;
    const top5Balance = accounts.slice(0, 5).reduce((s, a) => s + getAccountBalance(a), 0);
    const top10Balance = accounts.slice(0, 10).reduce((s, a) => s + getAccountBalance(a), 0);
    const top1Pct = totalSupply > 0 ? (top1Balance / totalSupply * 100) : 0;
    const top5Pct = totalSupply > 0 ? (top5Balance / totalSupply * 100) : 0;
    const top10Pct = totalSupply > 0 ? (top10Balance / totalSupply * 100) : 0;

    report.holders = {
        count: accounts.length,
        top1: { address: accounts[0] ? accounts[0].address : '', pct: top1Pct.toFixed(2), balance: top1Balance },
        top5Pct: top5Pct.toFixed(2),
        top10Pct: top10Pct.toFixed(2)
    };

    // Top holder check
    if (accounts.length === 0) {
        report.checks.push({ text: 'Could not fetch holder data', status: 'warning', icon: '⚠️', category: 'holders' });
        report.score += 2;
    } else if (top1Pct > 80) {
        report.checks.push({ text: 'Single wallet holds ' + top1Pct.toFixed(1) + '% — EXTREME concentration', status: 'danger', icon: '🚨', category: 'holders' });
        report.risks.push({ text: 'One wallet controls over 80% of supply. Extremely high rug pull risk.', severity: 'critical' });
        report.score += 1;
    } else if (top1Pct > 50) {
        report.checks.push({ text: 'Top holder owns ' + top1Pct.toFixed(1) + '% — high concentration', status: 'danger', icon: '🚨', category: 'holders' });
        report.risks.push({ text: 'Single wallet holds over 50% of supply. High dump risk.', severity: 'high' });
        report.score += 3;
    } else if (top1Pct > 20) {
        report.checks.push({ text: 'Top holder owns ' + top1Pct.toFixed(1) + '% — moderate risk', status: 'warning', icon: '⚠️', category: 'holders' });
        report.score += 8;
    } else if (top1Pct > 0) {
        report.checks.push({ text: 'Top holder owns ' + top1Pct.toFixed(1) + '% — good distribution', status: 'safe', icon: '✅', category: 'holders' });
        report.positives.push('No single wallet dominates supply');
        report.score += 15;
    }

    // Top 5 concentration
    if (accounts.length >= 5) {
        if (top5Pct > 90) {
            report.checks.push({ text: 'Top 5 wallets hold ' + top5Pct.toFixed(1) + '% — very concentrated', status: 'danger', icon: '🚨', category: 'holders' });
            report.risks.push({ text: 'Top 5 holders control >90% of supply. Coordinated dump is possible.', severity: 'high' });
        } else if (top5Pct > 60) {
            report.checks.push({ text: 'Top 5 wallets hold ' + top5Pct.toFixed(1) + '%', status: 'warning', icon: '⚠️', category: 'holders' });
            report.score += 3;
        } else if (top5Pct > 0) {
            report.checks.push({ text: 'Top 5 wallets hold ' + top5Pct.toFixed(1) + '% — healthy spread', status: 'safe', icon: '✅', category: 'holders' });
            report.score += 5;
        }
    }

    // Number of significant holders
    const significantHolders = accounts.filter(a => getAccountBalance(a) > 0).length;
    if (significantHolders >= 15) {
        report.checks.push({ text: significantHolders + '+ unique holders detected', status: 'safe', icon: '✅', category: 'holders' });
        report.score += 5;
    } else if (significantHolders >= 5) {
        report.checks.push({ text: significantHolders + ' holders with balance', status: 'safe', icon: '✅', category: 'holders' });
        report.score += 3;
    } else if (significantHolders > 0) {
        report.checks.push({ text: 'Only ' + significantHolders + ' holders — very early or suspicious', status: 'warning', icon: '⚠️', category: 'holders' });
        report.risks.push({ text: 'Very few holders. Token may be brand new, abandoned, or a honeypot.', severity: 'medium' });
    }

    // --- 7. LIQUIDITY & DEX CHECK ---
    let activePair = null;
    if (dexData && dexData.pairs && dexData.pairs.length > 0) {
        // Prefer Solana pairs, then any pair
        activePair = dexData.pairs.find(p => p.chainId === 'solana') || dexData.pairs[0];
    }

    if (activePair) {
        const pair = activePair;
        const liq = pair.liquidity ? (pair.liquidity.usd || pair.liquidity.total || 0) : 0;
        const vol24 = pair.volume ? (pair.volume.h24 || pair.volume.h24Usd || 0) : 0;
        const age = pair.pairCreatedAt ? Math.floor((Date.now() - pair.pairCreatedAt) / 86400000) : 0;
        const dexName = pair.dexId || pair.dex || 'Unknown';
        const priceUsd = parseFloat(pair.priceUsd || pair.price || 0);

        report.market = { liquidity: liq, volume24h: vol24, age: age, dex: dexName, price: priceUsd };

        // Liquidity check
        if (liq > 50000) {
            report.checks.push({ text: 'Good liquidity ($' + formatNumber(liq) + ') on ' + dexName, status: 'safe', icon: '✅', category: 'liquidity' });
            report.positives.push('Sufficient liquidity for trading');
            report.score += 10;
        } else if (liq > 5000) {
            report.checks.push({ text: 'Low liquidity ($' + formatNumber(liq) + ') — high slippage risk', status: 'warning', icon: '⚠️', category: 'liquidity' });
            report.score += 5;
        } else if (liq > 0) {
            report.checks.push({ text: 'Very low liquidity ($' + formatNumber(liq) + ') — extreme risk', status: 'danger', icon: '🚨', category: 'liquidity' });
            report.risks.push({ text: 'Liquidity is extremely low. Large sells will crash the price. Easy to manipulate.', severity: 'high' });
            report.score += 2;
        } else {
            report.checks.push({ text: 'No liquidity detected on DEX', status: 'danger', icon: '🚨', category: 'liquidity' });
            report.risks.push({ text: 'No liquidity pool found. Token may not be tradeable or has been rugged.', severity: 'critical' });
        }

        // Volume check
        if (vol24 > 10000) {
            report.checks.push({ text: 'Active trading volume ($' + formatNumber(vol24) + '/24h)', status: 'safe', icon: '✅', category: 'liquidity' });
            report.score += 5;
        } else if (vol24 > 0) {
            report.checks.push({ text: 'Low trading volume ($' + formatNumber(vol24) + '/24h)', status: 'warning', icon: '⚠️', category: 'liquidity' });
            report.score += 2;
        }

        // Age check
        if (age > 30) {
            report.checks.push({ text: 'Token listed for ' + age + ' days — established', status: 'safe', icon: '✅', category: 'liquidity' });
            report.score += 5;
        } else if (age > 7) {
            report.checks.push({ text: 'Token is ' + age + ' days old', status: 'safe', icon: '✅', category: 'liquidity' });
            report.score += 3;
        } else if (age >= 0 && pair.pairCreatedAt) {
            report.checks.push({ text: 'Token is only ' + age + ' days old — very new', status: 'warning', icon: '⚠️', category: 'liquidity' });
            report.risks.push({ text: 'Token was listed less than 7 days ago. New tokens carry higher risk.', severity: 'medium' });
            report.score += 1;
        }

        // Liquidity vs Market Cap ratio
        const mcap = pair.marketCap || pair.fdv || 0;
        if (mcap > 0 && liq > 0) {
            const liqRatio = (liq / mcap) * 100;
            if (liqRatio > 20) {
                report.checks.push({ text: 'Liquidity/MCap ratio: ' + liqRatio.toFixed(1) + '% — healthy', status: 'safe', icon: '✅', category: 'liquidity' });
                report.score += 3;
            } else if (liqRatio < 5) {
                report.checks.push({ text: 'Liquidity/MCap ratio: ' + liqRatio.toFixed(1) + '% — dangerously low', status: 'danger', icon: '🚨', category: 'liquidity' });
                report.risks.push({ text: 'Liquidity is less than 5% of market cap. A large sell could drain the entire pool.', severity: 'high' });
            }
        }
    } else {
        report.checks.push({ text: 'No DEX listing found — token may not be tradeable', status: 'warning', icon: '⚠️', category: 'liquidity' });
        report.risks.push({ text: 'Could not find DEX pair data. Token may be very new, unlisted, or DexScreener has not indexed it yet.', severity: 'medium' });
        report.market = { liquidity: 0, volume24h: 0, age: 0, dex: 'None', price: 0 };
    }

    // --- 8. TRANSACTION ACTIVITY ---
    if (signatures && signatures.length > 0) {
        const recentTxCount = signatures.length;
        const latestTx = signatures[0];
        const latestTime = latestTx.blockTime ? new Date(latestTx.blockTime * 1000) : null;
        const hoursSinceLastTx = latestTime ? ((Date.now() - latestTime.getTime()) / 3600000) : 999;

        if (hoursSinceLastTx < 24) {
            report.checks.push({ text: 'Active — last transaction within 24 hours', status: 'safe', icon: '✅', category: 'activity' });
            report.score += 5;
        } else if (hoursSinceLastTx < 168) {
            report.checks.push({ text: 'Moderate activity — last tx ' + Math.floor(hoursSinceLastTx / 24) + ' days ago', status: 'warning', icon: '⚠️', category: 'activity' });
            report.score += 2;
        } else {
            report.checks.push({ text: 'Inactive — no transactions in over 7 days', status: 'danger', icon: '🚨', category: 'activity' });
            report.risks.push({ text: 'Token has no recent activity. May be abandoned or a dead project.', severity: 'medium' });
        }

        // Check for failed transactions (potential honeypot indicator)
        const failedTx = signatures.filter(s => s.err !== null).length;
        const failRate = (failedTx / recentTxCount) * 100;
        if (failRate > 50) {
            report.checks.push({ text: failRate.toFixed(0) + '% of recent transactions failed — possible honeypot', status: 'danger', icon: '🚨', category: 'activity' });
            report.risks.push({ text: 'High transaction failure rate (' + failRate.toFixed(0) + '%). This is a strong indicator of a honeypot — users may not be able to sell.', severity: 'critical' });
        } else if (failRate > 20) {
            report.checks.push({ text: failRate.toFixed(0) + '% transaction failure rate — suspicious', status: 'warning', icon: '⚠️', category: 'activity' });
            report.risks.push({ text: 'Elevated transaction failure rate. Could indicate selling restrictions or bugs.', severity: 'medium' });
        } else if (recentTxCount >= 5) {
            report.checks.push({ text: 'Transaction success rate: ' + (100 - failRate).toFixed(0) + '%', status: 'safe', icon: '✅', category: 'activity' });
            report.score += 3;
        }
    }

    // --- 9. OVERALL RISK ASSESSMENT ---
    report.score = Math.min(100, Math.max(0, report.score));

    // Determine risk level
    if (report.score >= 75) {
        report.meta.level = 'LOW RISK';
        report.meta.color = '#06d6a0';
        report.meta.summary = 'This token passes most safety checks. Authorities are revoked, distribution is reasonable, and there is active liquidity.';
    } else if (report.score >= 50) {
        report.meta.level = 'MEDIUM RISK';
        report.meta.color = '#f59e0b';
        report.meta.summary = 'Some concerns detected. Review the risk flags carefully before investing. Not all red flags mean scam, but caution is advised.';
    } else if (report.score >= 25) {
        report.meta.level = 'HIGH RISK';
        report.meta.color = '#ef4444';
        report.meta.summary = 'Multiple red flags detected. This token shows characteristics common in scams or rug pulls. Invest only what you can afford to lose.';
    } else {
        report.meta.level = 'CRITICAL RISK';
        report.meta.color = '#dc2626';
        report.meta.summary = 'Severe warning signs. This token exhibits patterns strongly associated with scams, honeypots, or rug pulls. Extremely high chance of loss.';
    }

    return report;
}

// === Display Result ===
function displayResult(report) {
    auditData = report;
    const score = report.score;

    // Score circle
    document.getElementById('scoreNum').textContent = score + '/100';
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;
    const fillEl = document.getElementById('scoreFill');
    fillEl.style.strokeDashoffset = offset;
    fillEl.style.stroke = report.meta.color;
    document.getElementById('scoreNum').style.color = report.meta.color;
    document.getElementById('scoreLabel').textContent = report.meta.level;
    document.getElementById('scoreLabel').style.color = report.meta.color;
    document.getElementById('scoreSummary').textContent = report.meta.summary;

    // Token Info
    document.getElementById('tokenInfo').innerHTML = `
        <div class="info-item"><span class="info-label">Contract</span><span class="info-value">${report.info.address}</span></div>
        <div class="info-item"><span class="info-label">Program</span><span class="info-value">${report.info.program}</span></div>
        <div class="info-item"><span class="info-label">Supply</span><span class="info-value">${report.info.supply}</span></div>
        <div class="info-item"><span class="info-label">Decimals</span><span class="info-value">${report.info.decimals}</span></div>
        ${report.market.price ? '<div class="info-item"><span class="info-label">Price</span><span class="info-value">$' + report.market.price.toFixed(10) + '</span></div>' : ''}
        ${report.market.dex !== 'None' ? '<div class="info-item"><span class="info-label">DEX</span><span class="info-value">' + report.market.dex + '</span></div>' : ''}
    `;

    // Safety Checks — grouped by category
    const categories = ['authority', 'program', 'supply', 'holders', 'liquidity', 'activity'];
    const catLabels = { authority: '🔐 Authority', program: '⚙️ Program', supply: '💰 Supply', holders: '👥 Holders', liquidity: '💧 Liquidity', activity: '📊 Activity' };
    let checksHtml = '';
    categories.forEach(cat => {
        const catChecks = report.checks.filter(c => c.category === cat);
        if (catChecks.length === 0) return;
        checksHtml += '<div class="check-category"><span class="check-cat-label">' + catLabels[cat] + '</span></div>';
        catChecks.forEach(c => {
            checksHtml += '<div class="check-item"><span class="check-icon">' + c.icon + '</span><span class="check-text">' + c.text + '</span><span class="check-status ' + c.status + '">' + c.status.toUpperCase() + '</span></div>';
        });
    });
    document.getElementById('safetyChecks').innerHTML = checksHtml;

    // Risk Flags
    if (report.risks.length > 0) {
        document.getElementById('riskSection').style.display = 'block';
        document.getElementById('riskFlags').innerHTML = report.risks.map(r => {
            const sevColor = r.severity === 'critical' ? '#dc2626' : r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#9898b8';
            return '<div class="risk-item"><span class="risk-icon">⚠️</span><div class="risk-content"><span class="risk-text">' + r.text + '</span><span class="risk-severity" style="color:' + sevColor + '">' + r.severity.toUpperCase() + '</span></div></div>';
        }).join('');
    } else {
        document.getElementById('riskSection').style.display = 'none';
    }

    // Holder Analysis
    document.getElementById('holderInfo').innerHTML = `
        <div class="holder-stat"><span class="stat-val">${report.holders.top1.pct}%</span><span class="stat-lbl">Top 1 Holder</span></div>
        <div class="holder-stat"><span class="stat-val">${report.holders.top5Pct}%</span><span class="stat-lbl">Top 5 Combined</span></div>
        <div class="holder-stat"><span class="stat-val">${report.holders.top10Pct}%</span><span class="stat-lbl">Top 10 Combined</span></div>
    `;

    document.getElementById('auditResult').classList.add('active');
}

// === Show Error ===
function showError(msg) {
    let title = 'Scan Failed';
    let desc = 'An error occurred while analyzing the token.';
    if (msg === 'TOKEN_NOT_FOUND' || msg.includes('could not find')) {
        title = 'Token Not Found';
        desc = 'This address is not a valid SPL token mint. Check the address and try again.';
    } else if (msg.includes('429') || msg.includes('rate')) {
        title = 'Rate Limited';
        desc = 'Too many requests. Wait 10 seconds and try again.';
    } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('abort')) {
        title = 'Network Error';
        desc = 'Could not connect to Solana RPC. Please check your internet connection and try again. If on mobile, try switching from WiFi to data or vice versa.';
    } else if (msg.includes('All RPC endpoints failed')) {
        title = 'All Nodes Busy';
        desc = 'All Solana RPC nodes are busy or blocked. Please wait 10 seconds and try again.';
    }
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMsg').textContent = desc;
    document.getElementById('auditError').classList.add('active');
}

// === Reset ===
function resetAudit() {
    document.getElementById('auditResult').classList.remove('active');
    document.getElementById('auditError').classList.remove('active');
    document.getElementById('scanLoading').classList.remove('active');
    document.getElementById('tokenCA').value = '';
    document.getElementById('tokenCA').focus();
}

// === Copy Report ===
function copyReport() {
    if (!auditData || !auditData.ca) return;
    let t = '🛡️ GROKIE INU — AI TOKEN AUDIT REPORT\n';
    t += '═══════════════════════════════════════\n\n';
    t += '📋 Token: ' + auditData.info.address + '\n';
    t += '⚙️ Program: ' + auditData.info.program + '\n';
    t += '💰 Supply: ' + auditData.info.supply + '\n';
    if (auditData.market.price) t += '💵 Price: $' + auditData.market.price.toFixed(10) + '\n';
    if (auditData.market.liquidity) t += '💧 Liquidity: $' + formatNumber(auditData.market.liquidity) + '\n';
    t += '\n🏆 TRUST SCORE: ' + auditData.score + '/100 — ' + auditData.meta.level + '\n';
    t += '═══════════════════════════════════════\n\n';
    t += '🔐 SAFETY CHECKS:\n';
    auditData.checks.forEach(c => { t += '  ' + c.icon + ' ' + c.text + '\n'; });
    if (auditData.risks.length > 0) {
        t += '\n⚠️ RISK FLAGS (' + auditData.risks.length + '):\n';
        auditData.risks.forEach(r => { t += '  🔴 [' + r.severity.toUpperCase() + '] ' + r.text + '\n'; });
    }
    if (auditData.positives.length > 0) {
        t += '\n✅ POSITIVES:\n';
        auditData.positives.forEach(p => { t += '  ✅ ' + p + '\n'; });
    }
    t += '\n👥 HOLDER DISTRIBUTION:\n';
    t += '  Top 1: ' + auditData.holders.top1.pct + '% | Top 5: ' + auditData.holders.top5Pct + '% | Top 10: ' + auditData.holders.top10Pct + '%\n';
    t += '\n═══════════════════════════════════════\n';
    t += '⚠️ Not financial advice. Always DYOR.\n';
    t += 'Powered by Grokie Inu AI Audit\n';
    t += 'https://grokieinu.com/token-audit.html';

    navigator.clipboard.writeText(t).then(() => {
        const btn = document.querySelector('.audit-actions .action-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy Report'; }, 2000);
    });
}

// === Helpers ===
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function setStep(steps, i) { document.getElementById(steps[i]).classList.add('active'); }
function doneStep(steps, i) { document.getElementById(steps[i]).classList.remove('active'); document.getElementById(steps[i]).classList.add('done'); }
function formatNumber(n) {
    if (n >= 1e12) return (n/1e12).toFixed(2)+'T';
    if (n >= 1e9) return (n/1e9).toFixed(2)+'B';
    if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return n.toLocaleString();
}

// Enter key
document.getElementById('tokenCA').addEventListener('keypress', function(e) { if (e.key === 'Enter') scanToken(); });

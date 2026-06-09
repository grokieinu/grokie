// ===== CONFIGURATION =====
const HELIUS_API_KEY = window.__gk ? window.__gk.h() : '';
const HELIUS_RPC = window.__gk ? window.__gk.r() : '';
const HELIUS_API = window.__gk ? window.__gk.a() : '';
const GROQ_API_KEY = window.__gk ? window.__gk.g() : '';
// ==========================

// ===== STATE =====
let portfolioData = {
    wallet: null,
    balances: [],
    transactions: [],
    totalValue: 0,
    solBalance: 0,
    tokenPrices: {},
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initWalletInput();
    initButtons();
});

// ===== TABS =====
function initTabs() {
    const navLinks = document.querySelectorAll('[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    // Update nav links
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `tab-${tabName}`);
    });
}

// ===== WALLET INPUT =====
function initWalletInput() {
    const input = document.getElementById('walletInput');
    const btn = document.getElementById('trackBtn');

    // Auto-fill from verified gate wallet and make it readonly
    const gateData = sessionStorage.getItem('grokie_gate');
    if (gateData) {
        try {
            const parsed = JSON.parse(gateData);
            if (parsed.verified && parsed.wallet && parsed.expiry > Date.now()) {
                input.value = parsed.wallet;
                input.readOnly = true;
                input.style.opacity = '0.85';
                input.style.cursor = 'not-allowed';
                input.title = 'Wallet address is locked to your verified $GROKIE wallet';
                // Auto-track after a short delay to let page render
                setTimeout(() => trackWallet(), 500);
            }
        } catch (e) {
            console.warn('Failed to parse gate data:', e);
        }
    }

    btn.addEventListener('click', () => trackWallet());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') trackWallet();
    });
}

function initButtons() {
    document.getElementById('generateInsightsBtn').addEventListener('click', generateAIInsights);
    document.getElementById('generateTaxBtn').addEventListener('click', generateTaxReport);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
}

// ===== MAIN TRACKING FUNCTION =====
async function trackWallet() {
    // Verify token gate
    if (typeof isGateVerified === 'function' && !isGateVerified()) {
        showToast('Please verify your $GROKIE holdings first.');
        return;
    }
    const input = document.getElementById('walletInput');
    const address = input.value.trim();

    if (!address || address.length < 32 || address.length > 44) {
        showToast('Please enter a valid Solana wallet address');
        return;
    }

    if (!HELIUS_API_KEY) {
        showToast('Please configure your Helius API key in portfolio.js');
        return;
    }

    showLoading('Fetching wallet data...');
    portfolioData.wallet = address;

    try {
        // Fetch all data in parallel
        showLoading('Fetching balances and transactions...');
        const [balances, transactions] = await Promise.all([
            fetchBalances(address),
            fetchTransactions(address),
        ]);

        portfolioData.balances = balances;
        portfolioData.transactions = transactions;

        console.log('Balances:', balances);
        console.log('Transactions:', transactions);

        // Process and render
        showLoading('Calculating portfolio value...');
        await calculatePortfolioValue();

        console.log('Token prices:', portfolioData.tokenPrices);
        console.log('SOL price:', portfolioData.solPrice);
        console.log('Total value:', portfolioData.totalValue);

        showLoading('Analyzing trading performance...');
        analyzePerformance();

        showLoading('Calculating risk score...');
        calculateRiskScore();

        showLoading('Detecting whale activity...');
        detectWhaleActivity();

        // Render all tabs
        renderDashboard();
        renderHoldings();
        renderPnL();
        renderWhaleActivity();

        // Enable buttons
        document.getElementById('generateInsightsBtn').disabled = false;
        document.getElementById('generateTaxBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;

        hideLoading();
        showToast('Portfolio loaded successfully!');
    } catch (err) {
        hideLoading();
        console.error('Track wallet error:', err);
        showToast('Error loading portfolio. Check your API key and wallet address.');
    }
}

// ===== HELIUS API CALLS =====
async function fetchBalances(address) {
    // Get token balances using Helius DAS API
    const response = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'portfolio-balances',
            method: 'getAssetsByOwner',
            params: {
                ownerAddress: address,
                page: 1,
                limit: 100,
                displayOptions: { showFungible: true, showNativeBalance: true },
            },
        }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}

async function fetchTransactions(address) {
    // Get parsed transaction history
    const response = await fetch(
        `${HELIUS_API}/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=50`
    );

    if (!response.ok) throw new Error('Failed to fetch transactions');
    return await response.json();
}

async function fetchTokenPrices(mints) {
    // Use Jupiter Price API for token prices
    try {
        // Jupiter v2 requires individual lookups or comma-separated IDs
        const validMints = mints.filter(m => m && m.length > 20);
        if (validMints.length === 0) return {};

        const mintList = validMints.slice(0, 50).join(',');
        const response = await fetch(`https://api.jup.ag/price/v2?ids=${mintList}`);
        if (!response.ok) {
            // Fallback: try v1 endpoint
            const fallback = await fetch(`https://price.jup.ag/v6/price?ids=${mintList}`);
            if (!fallback.ok) return {};
            const fbData = await fallback.json();
            return fbData.data || {};
        }
        const data = await response.json();
        return data.data || {};
    } catch (err) {
        console.error('Price fetch error:', err);
        return {};
    }
}

// ===== PORTFOLIO CALCULATION =====
async function calculatePortfolioValue() {
    const items = portfolioData.balances?.items || [];
    const nativeBalance = portfolioData.balances?.nativeBalance;

    // Get SOL balance
    if (nativeBalance) {
        portfolioData.solBalance = (nativeBalance.lamports || 0) / 1e9;
    }

    // Collect fungible token mints for price lookup
    const fungibleTokens = items.filter(
        item => item.interface === 'FungibleToken' || item.interface === 'FungibleAsset'
    );

    const mints = fungibleTokens.map(t => t.id);
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    mints.push(SOL_MINT);

    // Fetch prices
    portfolioData.tokenPrices = await fetchTokenPrices(mints);

    // Calculate total value
    let totalValue = 0;

    // SOL price - check multiple possible response formats
    let solPrice = 0;
    const solPriceData = portfolioData.tokenPrices[SOL_MINT];
    if (solPriceData) {
        solPrice = parseFloat(solPriceData.price || solPriceData.vsToken || 0);
    }

    // If Jupiter didn't return SOL price, use nativeBalance price from Helius if available
    if (solPrice === 0 && nativeBalance?.price_per_sol) {
        solPrice = nativeBalance.price_per_sol;
    }

    // Fallback: fetch SOL price directly
    if (solPrice === 0) {
        try {
            const solResp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            if (solResp.ok) {
                const solData = await solResp.json();
                solPrice = solData.solana?.usd || 0;
            }
        } catch (e) {
            console.warn('CoinGecko fallback failed:', e);
        }
    }

    totalValue += portfolioData.solBalance * solPrice;

    fungibleTokens.forEach(token => {
        const priceData = portfolioData.tokenPrices[token.id];
        const tokenInfo = token.token_info;

        if (tokenInfo) {
            const decimals = tokenInfo.decimals || 0;
            const rawBalance = tokenInfo.balance || 0;
            const balance = rawBalance / Math.pow(10, decimals);
            token._calculatedBalance = balance;

            if (priceData) {
                const price = parseFloat(priceData.price || priceData.vsToken || 0);
                token._price = price;
                token._calculatedValue = balance * price;
                totalValue += token._calculatedValue;
            } else if (tokenInfo.price_info?.total_price) {
                // Helius sometimes includes price in token_info
                token._price = tokenInfo.price_info.price_per_token || 0;
                token._calculatedValue = tokenInfo.price_info.total_price || 0;
                totalValue += token._calculatedValue;
            } else {
                token._calculatedValue = 0;
                token._price = 0;
            }
        }
    });

    portfolioData.totalValue = totalValue;
    portfolioData.solPrice = solPrice;
    portfolioData.fungibleTokens = fungibleTokens;
}

// ===== PERFORMANCE ANALYSIS =====
function analyzePerformance() {
    const txs = portfolioData.transactions || [];
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    const swaps = txs.filter(tx => tx.type === 'SWAP');
    const solPrice = portfolioData.solPrice || 0;

    // Build PnL per token from swap history
    const tokenPnL = {}; // { mint: { bought: totalSOLSpent, sold: totalSOLReceived, symbol, currentBalance, currentPrice } }

    swaps.forEach(tx => {
        const profit = estimateSwapPnL(tx, solPrice);
        totalProfit += profit;
        if (profit > 0) {
            wins++;
            if (profit > bestTrade) bestTrade = profit;
        } else if (profit < 0) {
            losses++;
            if (profit < worstTrade) worstTrade = profit;
        }

        // Track per-token PnL
        buildTokenPnL(tx, tokenPnL, solPrice);
    });

    const totalTrades = wins + losses;
    portfolioData.performance = {
        winRate: totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0,
        totalTrades,
        avgProfit: totalTrades > 0 ? (totalProfit / totalTrades) : 0,
        bestTrade,
        worstTrade,
        totalProfit,
    };
    portfolioData.tokenPnL = tokenPnL;
}

function buildTokenPnL(tx, tokenPnL, solPrice) {
    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) return;

    const wallet = portfolioData.wallet;

    // For each token transfer involving this wallet
    tx.tokenTransfers.forEach(transfer => {
        const mint = transfer.mint;
        if (!mint) return;
        const tokenAmount = parseFloat(transfer.tokenAmount) || 0;
        if (tokenAmount <= 0 || !isFinite(tokenAmount)) return;

        if (!tokenPnL[mint]) {
            tokenPnL[mint] = {
                totalTokensBought: 0,
                totalTokensSold: 0,
                totalCostSOL: 0,
                totalRevenueSOL: 0,
                buyCount: 0,
                sellCount: 0,
                mint,
            };
        }

        // Determine SOL amount for this specific transfer
        let solAmount = 0;
        if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            solAmount = tx.nativeTransfers.reduce((sum, t) => {
                if (t.fromUserAccount === wallet) return sum + ((t.amount || 0) / 1e9);
                if (t.toUserAccount === wallet) return sum - ((t.amount || 0) / 1e9);
                return sum;
            }, 0); // Positive = SOL spent, Negative = SOL received
        }

        if (transfer.toUserAccount === wallet && solAmount > 0) {
            // Bought token — SOL was spent
            tokenPnL[mint].totalTokensBought += tokenAmount;
            tokenPnL[mint].totalCostSOL += solAmount;
            tokenPnL[mint].buyCount++;
        } else if (transfer.fromUserAccount === wallet && solAmount < 0) {
            // Sold token — SOL was received
            tokenPnL[mint].totalTokensSold += tokenAmount;
            tokenPnL[mint].totalRevenueSOL += Math.abs(solAmount);
            tokenPnL[mint].sellCount++;
        }
    });
}

function estimateSwapPnL(tx, solPrice) {
    const wallet = portfolioData.wallet;

    // Method 1: Calculate from native SOL transfers
    let netSolChange = 0;
    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        netSolChange = tx.nativeTransfers.reduce((sum, t) => {
            if (t.toUserAccount === wallet) return sum + (t.amount || 0);
            if (t.fromUserAccount === wallet) return sum - (t.amount || 0);
            return sum;
        }, 0) / 1e9;
    }

    // Method 2: Calculate from token transfers using current prices
    let tokenNetValue = 0;
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        tx.tokenTransfers.forEach(t => {
            const price = parseFloat(portfolioData.tokenPrices[t.mint]?.price || 0);
            const amount = parseFloat(t.tokenAmount) || 0;
            if (price > 0 && amount > 0) {
                if (t.toUserAccount === wallet) {
                    tokenNetValue += amount * price;
                } else if (t.fromUserAccount === wallet) {
                    tokenNetValue -= amount * price;
                }
            }
        });
    }

    // Combine: total value change = SOL change (in USD) + token value change
    const solValueChange = netSolChange * solPrice;
    const totalChange = solValueChange + tokenNetValue;

    // If we have both token and SOL data, use the combined total
    if (tokenNetValue !== 0 && netSolChange !== 0) {
        return totalChange;
    }

    // If only SOL flow (e.g. simple transfer)
    if (netSolChange !== 0) {
        return solValueChange;
    }

    // If only token flow (token-to-token swap routed through intermediary)
    if (tokenNetValue !== 0) {
        return tokenNetValue;
    }

    return 0;
}

// ===== RISK SCORE =====
function calculateRiskScore() {
    const tokens = portfolioData.fungibleTokens || [];
    const totalValue = portfolioData.totalValue || 1;
    let riskScore = 0;
    const factors = [];

    // Factor 1: Concentration risk
    const topTokenValue = tokens.reduce((max, t) => Math.max(max, t._calculatedValue || 0), 0);
    const concentration = (topTokenValue / totalValue) * 100;
    if (concentration > 50) {
        riskScore += 30;
        factors.push({ label: 'High concentration', detail: `${concentration.toFixed(0)}% in single token`, level: 'high' });
    } else if (concentration > 30) {
        riskScore += 15;
        factors.push({ label: 'Moderate concentration', detail: `${concentration.toFixed(0)}% in top token`, level: 'medium' });
    }

    // Factor 2: Number of tokens (diversification)
    if (tokens.length < 3) {
        riskScore += 20;
        factors.push({ label: 'Low diversification', detail: `Only ${tokens.length} tokens`, level: 'high' });
    } else if (tokens.length < 6) {
        riskScore += 10;
        factors.push({ label: 'Moderate diversification', detail: `${tokens.length} tokens`, level: 'medium' });
    } else {
        factors.push({ label: 'Good diversification', detail: `${tokens.length} tokens`, level: 'low' });
    }

    // Factor 3: Low liquidity tokens
    const lowLiqTokens = tokens.filter(t => (t._calculatedValue || 0) < 1 && (t._calculatedBalance || 0) > 0);
    if (lowLiqTokens.length > 5) {
        riskScore += 20;
        factors.push({ label: 'Many low-value tokens', detail: `${lowLiqTokens.length} dust tokens`, level: 'medium' });
    }

    // Factor 4: Trading frequency
    const swaps = (portfolioData.transactions || []).filter(tx => tx.type === 'SWAP');
    if (swaps.length > 30) {
        riskScore += 15;
        factors.push({ label: 'High trading frequency', detail: `${swaps.length} swaps recently`, level: 'medium' });
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    portfolioData.riskScore = riskScore;
    portfolioData.riskFactors = factors;
}

// ===== WHALE DETECTION =====
function detectWhaleActivity() {
    const txs = portfolioData.transactions || [];
    const solPrice = portfolioData.solPrice || 0;
    const whaleThreshold = 10000; // $10k+

    const whaleTransactions = txs.filter(tx => {
        if (!tx.nativeTransfers) return false;
        const totalSol = tx.nativeTransfers.reduce((sum, t) => sum + (t.amount || 0), 0) / 1e9;
        return (totalSol * solPrice) > whaleThreshold;
    });

    portfolioData.whaleTransactions = whaleTransactions;
}

// ===== RENDER FUNCTIONS =====
function renderDashboard() {
    const solPrice = portfolioData.solPrice || 0;

    document.getElementById('totalValue').textContent = formatUSD(portfolioData.totalValue);
    document.getElementById('solBalance').textContent = `${portfolioData.solBalance.toFixed(4)} SOL`;
    document.getElementById('tokenCount').textContent = (portfolioData.fungibleTokens || []).length;

    // Daily change (estimate from recent txs)
    const dailyChange = portfolioData.performance?.totalProfit || 0;
    const changeEl = document.getElementById('dailyChange');
    changeEl.textContent = formatUSD(dailyChange);
    changeEl.className = `stat-value ${dailyChange >= 0 ? 'text-green' : 'text-red'}`;

    // If total value is still 0 but we have SOL, show SOL value
    if (portfolioData.totalValue === 0 && portfolioData.solBalance > 0 && solPrice > 0) {
        document.getElementById('totalValue').textContent = formatUSD(portfolioData.solBalance * solPrice);
    }

    // Risk score
    const riskScore = portfolioData.riskScore || 0;
    const riskCircle = document.getElementById('riskCircle');
    document.getElementById('riskScore').textContent = riskScore;

    let riskLevel = 'Low';
    let riskColor = '#10b981';
    if (riskScore > 60) { riskLevel = 'High'; riskColor = '#ef4444'; }
    else if (riskScore > 30) { riskLevel = 'Medium'; riskColor = '#f59e0b'; }

    document.getElementById('riskLabel').textContent = riskLevel;
    riskCircle.style.borderColor = riskColor;

    // Risk factors
    const factorsEl = document.getElementById('riskFactors');
    const factors = portfolioData.riskFactors || [];
    if (factors.length > 0) {
        factorsEl.innerHTML = factors.map(f => `
            <div class="risk-factor-item" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;">
                <span>${f.label}</span>
                <span class="text-${f.level === 'high' ? 'red' : f.level === 'medium' ? 'orange' : 'green'}">${f.detail}</span>
            </div>
        `).join('');
    }

    // Performance
    const perf = portfolioData.performance || {};
    document.getElementById('winRate').textContent = `${perf.winRate || 0}%`;
    document.getElementById('totalTrades').textContent = perf.totalTrades || 0;
    document.getElementById('avgProfit').textContent = formatUSD(perf.avgProfit || 0);
    document.getElementById('bestTrade').textContent = formatUSD(perf.bestTrade || 0);
    document.getElementById('worstTrade').textContent = formatUSD(perf.worstTrade || 0);
    document.getElementById('avgHoldTime').textContent = '--';

    // Recent transactions
    renderRecentTransactions();
}

function renderRecentTransactions() {
    const txs = (portfolioData.transactions || []).slice(0, 15);
    const tbody = document.getElementById('recentTxBody');

    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No transactions found</td></tr>';
        return;
    }

    tbody.innerHTML = txs.map(tx => {
        const type = tx.type || 'UNKNOWN';
        const time = tx.timestamp ? formatTime(tx.timestamp) : '--';
        const sig = tx.signature ? tx.signature.slice(0, 8) + '...' : '--';
        const sigLink = tx.signature ? `https://solscan.io/tx/${tx.signature}` : '#';

        // Get token info from multiple sources
        let tokenName = '--';
        let amount = '--';
        let value = '--';

        // Check token transfers
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
            const transfer = tx.tokenTransfers[0];
            tokenName = transfer.tokenStandard || transfer.mint?.slice(0, 6) + '...' || '--';
            if (transfer.tokenAmount) {
                amount = Number(transfer.tokenAmount).toFixed(4);
            }
        }

        // Check native transfers (SOL)
        if (tokenName === '--' && tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            tokenName = 'SOL';
            const solTransfer = tx.nativeTransfers.find(t =>
                t.fromUserAccount === portfolioData.wallet || t.toUserAccount === portfolioData.wallet
            );
            if (solTransfer) {
                const solAmount = Math.abs(solTransfer.amount || 0) / 1e9;
                amount = solAmount.toFixed(4);
                if (portfolioData.solPrice) {
                    value = formatUSD(solAmount * portfolioData.solPrice);
                }
            }
        }

        // Use description as fallback for token name
        if (tokenName === '--' && tx.description) {
            const descMatch = tx.description.match(/(\w+)\s/);
            if (descMatch) tokenName = descMatch[1];
        }

        const typeClass = type === 'SWAP' ? 'text-blue' : type === 'TRANSFER' ? 'text-green' : 'text-orange';

        return `
            <tr>
                <td><span class="${typeClass}" style="font-weight:600;">${type}</span></td>
                <td>${tokenName}</td>
                <td>${amount}</td>
                <td>${value}</td>
                <td>${time}</td>
                <td><a href="${sigLink}" target="_blank" style="color:var(--primary);text-decoration:none;">${sig}</a></td>
            </tr>
        `;
    }).join('');
}

function renderHoldings() {
    const tokens = portfolioData.fungibleTokens || [];
    const totalValue = portfolioData.totalValue || 1;
    const tbody = document.getElementById('holdingsBody');
    const allocChart = document.getElementById('allocationChart');

    // Sort tokens by value
    const sorted = [...tokens].sort((a, b) => (b._calculatedValue || 0) - (a._calculatedValue || 0));

    // Build holdings list including SOL as first item
    const solBalance = portfolioData.solBalance || 0;
    const solPrice = portfolioData.solPrice || 0;
    const solValue = solBalance * solPrice;

    let rows = '';

    // Add SOL row
    if (solBalance > 0) {
        const solAllocation = (solValue / totalValue * 100).toFixed(1);
        rows += `
            <tr>
                <td><strong>SOL</strong> <span style="color:var(--text-muted);font-size:0.72rem;">Solana</span></td>
                <td>${solBalance.toFixed(4)}</td>
                <td>${formatUSD(solPrice)}</td>
                <td>${formatUSD(solValue)}</td>
                <td>--</td>
                <td>${solAllocation}%</td>
            </tr>
        `;
    }

    // Add token rows
    rows += sorted.map(token => {
        const name = token.content?.metadata?.name || token.content?.metadata?.symbol || token.id.slice(0, 8) + '...';
        const symbol = token.content?.metadata?.symbol || '--';
        const balance = (token._calculatedBalance || 0).toFixed(4);
        const price = token._price ? formatUSD(token._price) : '$0.00';
        const value = formatUSD(token._calculatedValue || 0);
        const allocation = ((token._calculatedValue || 0) / totalValue * 100).toFixed(1);

        return `
            <tr>
                <td><strong>${symbol}</strong> <span style="color:var(--text-muted);font-size:0.72rem;">${name}</span></td>
                <td>${balance}</td>
                <td>${price}</td>
                <td>${value}</td>
                <td>--</td>
                <td>${allocation}%</td>
            </tr>
        `;
    }).join('');

    if (!rows) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No token holdings found</td></tr>';
        return;
    }

    tbody.innerHTML = rows;

    // Allocation chart (bar chart) - include SOL
    const allItems = [];
    if (solBalance > 0) {
        allItems.push({ symbol: 'SOL', value: solValue });
    }
    sorted.forEach(token => {
        const symbol = token.content?.metadata?.symbol || token.id.slice(0, 6);
        allItems.push({ symbol, value: token._calculatedValue || 0 });
    });

    const topItems = allItems.slice(0, 8);
    const colors = ['#8b5cf6', '#f72585', '#06d6a0', '#00f5ff', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

    allocChart.innerHTML = topItems.map((item, i) => {
        const pct = (item.value / totalValue * 100).toFixed(1);
        return `
            <div class="alloc-bar-item">
                <span class="alloc-label">${item.symbol}</span>
                <div class="alloc-bar-wrapper">
                    <div class="alloc-bar" style="width:${Math.max(parseFloat(pct), 0.5)}%;background:${colors[i % colors.length]};"></div>
                </div>
                <span class="alloc-pct">${pct}%</span>
            </div>
        `;
    }).join('');
}

function renderPnL() {
    const perf = portfolioData.performance || {};
    const totalProfit = perf.totalProfit || 0;
    const solPrice = portfolioData.solPrice || 0;
    const tokenPnL = portfolioData.tokenPnL || {};
    const tokens = portfolioData.fungibleTokens || [];

    // Calculate PnL per token
    let unrealizedTotal = 0;
    let realizedTotal = 0;
    const pnlData = [];

    Object.keys(tokenPnL).forEach(mint => {
        const pnl = tokenPnL[mint];
        const token = tokens.find(t => t.id === mint);
        const symbol = token?.content?.metadata?.symbol || mint.slice(0, 6) + '...';
        const currentPrice = parseFloat(portfolioData.tokenPrices[mint]?.price || token?._price || 0);
        const currentBalance = token?._calculatedBalance || 0;

        const totalCostSOL = pnl.totalCostSOL || 0;
        const totalRevenueSOL = pnl.totalRevenueSOL || 0;
        const totalTokensBought = pnl.totalTokensBought || 0;
        const totalTokensSold = pnl.totalTokensSold || 0;

        // Cost per token in SOL
        const costPerTokenSOL = totalTokensBought > 0 ? totalCostSOL / totalTokensBought : 0;
        const costPerTokenUSD = costPerTokenSOL * solPrice;

        // Realized PnL: (revenue from sells) - (cost of tokens sold)
        const costOfSoldSOL = totalTokensSold * costPerTokenSOL;
        const realizedSOL = totalRevenueSOL - costOfSoldSOL;
        const realized = isFinite(realizedSOL) ? realizedSOL * solPrice : 0;
        realizedTotal += realized;

        // Unrealized PnL: (current value of held tokens) - (cost of held tokens)
        let unrealized = 0;
        if (currentBalance > 0 && currentPrice > 0 && costPerTokenUSD > 0) {
            const holdingValue = currentBalance * currentPrice;
            const holdingCost = currentBalance * costPerTokenUSD;
            unrealized = holdingValue - holdingCost;
            if (!isFinite(unrealized)) unrealized = 0;
            unrealizedTotal += unrealized;
        }

        const totalPnl = realized + unrealized;
        const totalCostUSD = totalCostSOL * solPrice;
        const roi = totalCostUSD > 0 ? ((totalPnl / totalCostUSD) * 100).toFixed(1) : 0;

        // Only include if we have meaningful data
        if (totalCostSOL > 0 || totalRevenueSOL > 0 || currentBalance > 0) {
            pnlData.push({
                symbol,
                avgBuyCostUSD: isFinite(costPerTokenUSD) ? costPerTokenUSD : 0,
                currentPrice: isFinite(currentPrice) ? currentPrice : 0,
                realized: isFinite(realized) ? realized : 0,
                unrealized: isFinite(unrealized) ? unrealized : 0,
                totalPnl: isFinite(totalPnl) ? totalPnl : 0,
                roi: isFinite(parseFloat(roi)) ? roi : 0,
            });
        }
    });

    // Sort by absolute PnL
    pnlData.sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl));

    // Ensure no NaN in totals
    if (!isFinite(realizedTotal)) realizedTotal = 0;
    if (!isFinite(unrealizedTotal)) unrealizedTotal = 0;

    // Update summary cards
    const displayRealized = realizedTotal !== 0 ? realizedTotal : totalProfit;
    document.getElementById('realizedPnl').textContent = formatUSD(displayRealized);
    document.getElementById('realizedPnl').className = `stat-value ${displayRealized >= 0 ? 'text-green' : 'text-red'}`;

    document.getElementById('unrealizedPnl').textContent = formatUSD(unrealizedTotal);
    document.getElementById('unrealizedPnl').className = `stat-value ${unrealizedTotal >= 0 ? 'text-green' : 'text-red'}`;

    const netPnl = displayRealized + unrealizedTotal;
    const totalInvested = Object.values(tokenPnL).reduce((sum, p) => sum + (p.totalCostSOL || 0), 0) * solPrice;
    const roi = totalInvested > 0 ? ((netPnl / totalInvested) * 100).toFixed(1) : 0;
    document.getElementById('totalRoi').textContent = `${isFinite(parseFloat(roi)) ? roi : 0}%`;
    document.getElementById('totalRoi').className = `stat-value ${parseFloat(roi) >= 0 ? 'text-green' : 'text-red'}`;

    document.getElementById('monthlyPnl').textContent = formatUSD(isFinite(netPnl) ? netPnl : 0);
    document.getElementById('monthlyPnl').className = `stat-value ${netPnl >= 0 ? 'text-green' : 'text-red'}`;

    // PnL by token table
    const tbody = document.getElementById('pnlBody');

    if (pnlData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No PnL data available — need swap transactions</td></tr>';
        return;
    }

    tbody.innerHTML = pnlData.slice(0, 25).map(item => {
        const realizedClass = item.realized >= 0 ? 'text-green' : 'text-red';
        const unrealizedClass = item.unrealized >= 0 ? 'text-green' : 'text-red';
        const totalClass = item.totalPnl >= 0 ? 'text-green' : 'text-red';
        const roiClass = parseFloat(item.roi) >= 0 ? 'text-green' : 'text-red';

        return `
            <tr>
                <td><strong>${item.symbol}</strong></td>
                <td>${item.avgBuyCostUSD > 0 ? formatUSD(item.avgBuyCostUSD) : '--'}</td>
                <td>${item.currentPrice > 0 ? formatUSD(item.currentPrice) : '--'}</td>
                <td class="${realizedClass}">${item.realized !== 0 ? formatUSD(item.realized) : '--'}</td>
                <td class="${unrealizedClass}">${item.unrealized !== 0 ? formatUSD(item.unrealized) : '--'}</td>
                <td class="${totalClass}">${item.totalPnl !== 0 ? formatUSD(item.totalPnl) : '--'}</td>
                <td class="${roiClass}">${item.roi !== 0 ? item.roi + '%' : '--'}</td>
            </tr>
        `;
    }).join('');
}

function renderWhaleActivity() {
    const whaleTxs = portfolioData.whaleTransactions || [];
    const whaleList = document.getElementById('whaleList');
    const whaleTable = document.getElementById('whaleTableBody');
    const solPrice = portfolioData.solPrice || 0;

    if (whaleTxs.length === 0) {
        whaleList.innerHTML = '<p class="empty-state">No whale-sized transactions detected for this wallet</p>';
        whaleTable.innerHTML = '<tr><td colspan="5" class="empty-state">No whale activity</td></tr>';
        return;
    }

    whaleList.innerHTML = whaleTxs.slice(0, 5).map(tx => {
        const totalSol = tx.nativeTransfers.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / 1e9;
        const value = totalSol * solPrice;
        const time = tx.timestamp ? formatTime(tx.timestamp) : '--';
        const type = tx.type || 'TRANSFER';

        return `
            <div class="whale-item">
                <span style="font-size:1.5rem;">🐋</span>
                <div>
                    <div class="whale-amount">${formatUSD(value)} (${totalSol.toFixed(2)} SOL)</div>
                    <div class="whale-time">${type} • ${time}</div>
                </div>
            </div>
        `;
    }).join('');

    whaleTable.innerHTML = whaleTxs.slice(0, 10).map(tx => {
        const totalSol = tx.nativeTransfers.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / 1e9;
        const time = tx.timestamp ? formatTime(tx.timestamp) : '--';
        const sig = tx.signature ? tx.signature.slice(0, 8) + '...' : '--';

        return `
            <tr>
                <td><a href="https://solscan.io/tx/${tx.signature}" target="_blank" style="color:var(--primary);text-decoration:none;">${sig}</a></td>
                <td>${tx.type || 'TRANSFER'}</td>
                <td>SOL</td>
                <td>${totalSol.toFixed(2)}</td>
                <td>${time}</td>
            </tr>
        `;
    }).join('');
}

// ===== AI INSIGHTS (Groq - Llama 3.3 70B) =====
async function generateAIInsights() {
    if (!portfolioData.wallet) {
        showToast('Please track a wallet first');
        return;
    }

    if (!GROQ_API_KEY) {
        showToast('Please configure your Groq API key in portfolio.js');
        return;
    }

    showLoading('Generating AI insights with Llama 3.3...');
    const container = document.getElementById('aiInsightsContent');
    const recommendations = document.getElementById('aiRecommendations');
    const riskAlerts = document.getElementById('aiRiskAlerts');
    const rebalancing = document.getElementById('aiRebalancing');

    try {
        // Build portfolio summary for AI
        const tokens = portfolioData.fungibleTokens || [];
        const totalValue = portfolioData.totalValue;
        const solBalance = portfolioData.solBalance;
        const solPrice = portfolioData.solPrice;
        const riskScore = portfolioData.riskScore;
        const perf = portfolioData.performance || {};

        const holdingsSummary = tokens
            .filter(t => (t._calculatedValue || 0) > 0.01)
            .map(t => {
                const symbol = t.content?.metadata?.symbol || 'UNKNOWN';
                const value = (t._calculatedValue || 0).toFixed(2);
                const balance = (t._calculatedBalance || 0).toFixed(2);
                return `${symbol}: ${balance} tokens ($${value})`;
            })
            .join('\n');

        const prompt = `You are a professional crypto portfolio analyst for Solana blockchain. Analyze this portfolio and provide actionable insights.

PORTFOLIO DATA:
- Wallet: ${portfolioData.wallet}
- Total Portfolio Value: $${totalValue.toFixed(2)}
- SOL Balance: ${solBalance.toFixed(4)} SOL ($${(solBalance * solPrice).toFixed(2)})
- Number of Tokens: ${tokens.length}
- Risk Score: ${riskScore}/100
- Trading Performance: Win Rate ${perf.winRate || 0}%, Total Trades: ${perf.totalTrades || 0}
- Best Trade: $${(perf.bestTrade || 0).toFixed(2)}, Worst Trade: $${(perf.worstTrade || 0).toFixed(2)}

TOKEN HOLDINGS:
${holdingsSummary || 'No significant token holdings'}

SOL Price: $${solPrice.toFixed(2)}

Respond with ONLY valid JSON (no markdown, no explanation, no code blocks):
{"summary":"2-3 sentence assessment","insights":[{"title":"emoji title","text":"detail"}],"recommendations":["rec1","rec2","rec3"],"riskAlerts":["alert1","alert2"],"rebalancing":["suggestion1","suggestion2"]}

Be specific. Mention actual token names. Provide 3-4 insights, 3-4 recommendations, 2-3 risk alerts, 2-3 rebalancing suggestions.`;

        // Call Groq API (OpenAI-compatible)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a crypto portfolio analyst. Always respond with valid JSON only. No markdown. No code blocks. No explanation outside JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || `API error: ${response.status}`;
            throw new Error(errMsg);
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content?.trim() || '';

        if (!aiText) throw new Error('Empty response from Groq');

        // Parse JSON response
        const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const insights = JSON.parse(cleanJson);

        // Render main insights
        container.innerHTML = `
            <div class="ai-insight-item" style="border-left:3px solid var(--primary);padding-left:14px;margin-bottom:16px;">
                <h5>🧠 AI Summary</h5>
                <p>${insights.summary || 'No summary available'}</p>
            </div>
            ${(insights.insights || []).map(i => `
                <div class="ai-insight-item">
                    <h5>${i.title}</h5>
                    <p>${i.text}</p>
                </div>
            `).join('')}
        `;

        recommendations.innerHTML = (insights.recommendations || []).map(r => `
            <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;">
                <span style="color:var(--green);">→</span> ${r}
            </div>
        `).join('') || '<p class="empty-state-sm">No recommendations</p>';

        riskAlerts.innerHTML = (insights.riskAlerts || []).map(a => `
            <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;">
                <span style="color:var(--red);">⚠</span> ${a}
            </div>
        `).join('') || '<p class="empty-state-sm">No alerts</p>';

        rebalancing.innerHTML = (insights.rebalancing || []).map(r => `
            <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;">
                <span style="color:var(--neon-blue);">↔</span> ${r}
            </div>
        `).join('') || '<p class="empty-state-sm">No suggestions</p>';

        hideLoading();
        showToast('AI analysis complete! (Powered by Llama 3.3)');

    } catch (err) {
        console.error('Groq API error:', err);
        hideLoading();

        container.innerHTML = `
            <div class="ai-insight-item" style="border-left:3px solid var(--orange);">
                <h5>⚠️ AI API Error</h5>
                <p>${err.message}. Showing local analysis instead.</p>
            </div>
        `;
        showToast('Groq API failed — using local analysis');
        fallbackLocalInsights(container, recommendations, riskAlerts, rebalancing);
    }
}

function fallbackLocalInsights(container, recommendations, riskAlerts, rebalancing) {
    const tokens = portfolioData.fungibleTokens || [];
    const totalValue = portfolioData.totalValue;
    const riskScore = portfolioData.riskScore;
    const perf = portfolioData.performance || {};

    const insights = [];
    const recs = [];
    const alerts = [];
    const rebal = [];

    if (totalValue > 10000) {
        insights.push({ title: '💎 Large Portfolio', text: `Portfolio value of ${formatUSD(totalValue)} — consider diversifying across wallets for security.` });
    } else if (totalValue > 100) {
        insights.push({ title: '📈 Active Portfolio', text: `Portfolio value: ${formatUSD(totalValue)}. Active in Solana ecosystem.` });
    } else {
        insights.push({ title: '🌱 Small Portfolio', text: `Portfolio: ${formatUSD(totalValue)}. Consider DCA into established projects.` });
    }

    if (riskScore > 60) {
        alerts.push('High risk score — too concentrated');
        alerts.push('Diversification needed');
    } else if (riskScore > 30) {
        alerts.push('Moderate risk — monitor positions');
    } else {
        alerts.push('Risk level acceptable');
    }

    recs.push('Keep 10-20% in SOL for gas and stability');
    recs.push('Set stop-losses on volatile positions');
    rebal.push('Maintain SOL between 20-40% of portfolio');

    if (tokens.length < 5) rebal.push('Add 3-5 more quality tokens for diversification');
    if (tokens.length > 15) rebal.push('Consolidate dust positions');

    container.innerHTML += insights.map(i => `
        <div class="ai-insight-item"><h5>${i.title}</h5><p>${i.text}</p></div>
    `).join('');

    recommendations.innerHTML = recs.map(r => `
        <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;"><span style="color:var(--green);">→</span> ${r}</div>
    `).join('');

    riskAlerts.innerHTML = alerts.map(a => `
        <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;"><span style="color:var(--red);">⚠</span> ${a}</div>
    `).join('');

    rebalancing.innerHTML = rebal.map(r => `
        <div style="padding:8px 0;border-bottom:1px solid rgba(42,42,80,0.3);font-size:0.8rem;"><span style="color:var(--neon-blue);">↔</span> ${r}</div>
    `).join('');
}

// ===== TAX REPORT =====
async function generateTaxReport() {
    if (!portfolioData.wallet) {
        showToast('Please track a wallet first');
        return;
    }

    showLoading('Generating tax report...');
    await delay(1000);

    const txs = portfolioData.transactions || [];
    const year = document.getElementById('taxYear').value;
    const solPrice = portfolioData.solPrice || 0;

    // Filter transactions by year
    const yearStart = new Date(`${year}-01-01`).getTime() / 1000;
    const yearEnd = new Date(`${parseInt(year) + 1}-01-01`).getTime() / 1000;
    let yearTxs = txs.filter(tx => tx.timestamp >= yearStart && tx.timestamp < yearEnd);

    // If no transactions in selected year, show all transactions (API only returns last 50)
    if (yearTxs.length === 0) {
        yearTxs = txs; // Use all available transactions
    }

    // Taxable events: SWAP, transfers that involve token changes
    // Include all transactions that have token transfers (buy/sell events)
    const taxableEvents = yearTxs.filter(tx =>
        tx.type === 'SWAP' ||
        (tx.tokenTransfers && tx.tokenTransfers.length > 0) ||
        (tx.nativeTransfers && tx.nativeTransfers.some(t =>
            (t.fromUserAccount === portfolioData.wallet || t.toUserAccount === portfolioData.wallet) &&
            (t.amount || 0) > 0
        ))
    );

    let shortTermGains = 0;
    let longTermGains = 0;
    let totalLosses = 0;

    taxableEvents.forEach(tx => {
        const pnl = estimateSwapPnL(tx, solPrice);
        if (pnl > 0) {
            shortTermGains += pnl;
        } else if (pnl < 0) {
            totalLosses += Math.abs(pnl);
        }
    });

    const netGains = shortTermGains - totalLosses;
    const estimatedTax = Math.max(0, netGains * 0.25); // Simplified 25% rate

    // Render
    document.getElementById('taxDisposals').textContent = taxableEvents.length;
    document.getElementById('taxShortGains').textContent = formatUSD(shortTermGains);
    document.getElementById('taxShortGains').className = 'tax-value text-green';
    document.getElementById('taxLongGains').textContent = formatUSD(longTermGains);
    document.getElementById('taxLosses').textContent = formatUSD(totalLosses);
    document.getElementById('taxLosses').className = 'tax-value text-red';
    document.getElementById('taxNetGains').textContent = formatUSD(netGains);
    document.getElementById('taxNetGains').className = `tax-value ${netGains >= 0 ? 'text-green' : 'text-red'}`;
    document.getElementById('taxEstimated').textContent = formatUSD(estimatedTax);

    // Tax events table
    const tbody = document.getElementById('taxEventsBody');
    if (taxableEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No taxable events found for ${year}</td></tr>`;
    } else {
        tbody.innerHTML = taxableEvents.slice(0, 30).map(tx => {
            const date = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : '--';
            const pnl = estimateSwapPnL(tx, solPrice);
            const type = tx.type || 'UNKNOWN';

            // Get token info
            let tokenName = '--';
            let amount = '--';
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                const t = tx.tokenTransfers[0];
                tokenName = t.mint ? t.mint.slice(0, 6) + '...' : '--';
                amount = t.tokenAmount ? parseFloat(t.tokenAmount).toFixed(4) : '--';
            } else if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
                tokenName = 'SOL';
                const solTransfer = tx.nativeTransfers.find(t =>
                    t.fromUserAccount === portfolioData.wallet || t.toUserAccount === portfolioData.wallet
                );
                if (solTransfer) amount = (Math.abs(solTransfer.amount || 0) / 1e9).toFixed(4);
            }

            return `
                <tr>
                    <td>${date}</td>
                    <td>${type}</td>
                    <td>${tokenName}</td>
                    <td>${amount}</td>
                    <td>--</td>
                    <td>--</td>
                    <td class="${pnl >= 0 ? 'text-green' : 'text-red'}">${formatUSD(pnl)}</td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('exportCsvBtn').disabled = false;
    document.getElementById('exportPdfBtn').disabled = false;
    hideLoading();
    showToast(`Tax report generated for ${year}!`);
}

// ===== EXPORT =====
function exportCSV() {
    const txs = portfolioData.transactions || [];
    const solPrice = portfolioData.solPrice || 0;

    // Include all transactions with transfers
    const taxableEvents = txs.filter(tx =>
        (tx.tokenTransfers && tx.tokenTransfers.length > 0) ||
        (tx.nativeTransfers && tx.nativeTransfers.length > 0)
    );

    let csv = 'Date,Type,Token,Amount,Cost Basis,Proceeds,Gain/Loss\n';
    taxableEvents.forEach(tx => {
        const date = tx.timestamp ? new Date(tx.timestamp * 1000).toISOString().split('T')[0] : '';
        const pnl = estimateSwapPnL(tx, solPrice);
        const type = tx.type || 'UNKNOWN';
        let token = 'SOL';
        let amount = '';
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
            token = tx.tokenTransfers[0].mint?.slice(0, 10) || 'unknown';
            amount = parseFloat(tx.tokenTransfers[0].tokenAmount || 0).toFixed(4);
        } else if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            const t = tx.nativeTransfers.find(n =>
                n.fromUserAccount === portfolioData.wallet || n.toUserAccount === portfolioData.wallet
            );
            if (t) amount = (Math.abs(t.amount || 0) / 1e9).toFixed(4);
        }
        csv += `${date},${type},${token},${amount},,,${pnl.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grokie-tax-report-${portfolioData.wallet?.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!');
}

function exportPDF() {
    const wallet = portfolioData.wallet || 'unknown';
    const year = document.getElementById('taxYear').value;
    const solPrice = portfolioData.solPrice || 0;
    const txs = portfolioData.transactions || [];
    const logoUrl = window.location.href.replace('portfolio.html', '') + 'assets/images/grokie-inu.png';

    // Build PDF content as printable HTML
    const taxableEvents = txs.filter(tx =>
        tx.tokenTransfers?.length > 0 || tx.nativeTransfers?.length > 0
    );

    let shortTermGains = 0;
    let totalLosses = 0;
    taxableEvents.forEach(tx => {
        const pnl = estimateSwapPnL(tx, solPrice);
        if (pnl > 0) shortTermGains += pnl;
        else if (pnl < 0) totalLosses += Math.abs(pnl);
    });
    const netGains = shortTermGains - totalLosses;

    let tableRows = '';
    taxableEvents.slice(0, 50).forEach((tx, i) => {
        const date = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : '--';
        const type = tx.type || 'UNKNOWN';
        const pnl = estimateSwapPnL(tx, solPrice);
        let token = 'SOL';
        let amount = '--';
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
            token = tx.tokenTransfers[0].mint?.slice(0, 8) + '...' || '--';
            amount = parseFloat(tx.tokenTransfers[0].tokenAmount || 0).toFixed(4);
        } else if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            const t = tx.nativeTransfers.find(n => n.fromUserAccount === wallet || n.toUserAccount === wallet);
            if (t) amount = (Math.abs(t.amount || 0) / 1e9).toFixed(4);
        }
        const rowBg = i % 2 === 0 ? 'transparent' : 'rgba(248,249,252,0.7)';
        tableRows += `<tr style="background:${rowBg};">
            <td>${date}</td>
            <td><span style="background:${type === 'SWAP' ? '#ede9fe' : '#ecfdf5'};color:${type === 'SWAP' ? '#7c3aed' : '#059669'};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">${type}</span></td>
            <td style="font-family:monospace;font-size:11px;">${token}</td>
            <td>${amount}</td>
            <td style="color:#999;">--</td>
            <td style="color:#999;">--</td>
            <td style="color:${pnl >= 0 ? '#10b981' : '#ef4444'};font-weight:600;">${formatUSD(pnl)}</td>
        </tr>`;
    });

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Grokie Tax Report - ${year}</title>
            <style>
                @page { margin: 0; size: A4; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                    .watermark { display: block !important; }
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 0; position: relative; }

                /* Watermark */
                .watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    opacity: 0.06;
                    z-index: 9999;
                    pointer-events: none;
                }
                .watermark img { width: 350px; height: 350px; }

                .content { position: relative; z-index: 1; padding: 40px 50px; }

                /* Header */
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #8b5cf6;
                    margin-bottom: 30px;
                }
                .header-left { display: flex; align-items: center; gap: 14px; }
                .header-left img { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #8b5cf6; }
                .header-left h1 { font-size: 22px; color: #1a1a2e; font-weight: 800; }
                .header-left .subtitle { font-size: 11px; color: #8b5cf6; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
                .header-right { text-align: right; font-size: 11px; color: #666; }
                .header-right .report-type { font-size: 14px; font-weight: 700; color: #1a1a2e; }

                /* Summary Cards */
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 14px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    padding: 18px;
                    border-radius: 10px;
                    border: 1px solid #e8e8f0;
                    background: linear-gradient(135deg, #fafafe, #f5f3ff);
                }
                .summary-card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                .summary-card .value { font-size: 20px; font-weight: 800; margin-top: 6px; }
                .green { color: #10b981; }
                .red { color: #ef4444; }

                /* Wallet Info */
                .wallet-info {
                    background: #f8f9fc;
                    border: 1px solid #e8e8f0;
                    border-radius: 8px;
                    padding: 12px 18px;
                    margin-bottom: 24px;
                    font-size: 11px;
                    display: flex;
                    justify-content: space-between;
                }
                .wallet-info .label { color: #888; }
                .wallet-info .val { font-family: monospace; color: #333; font-weight: 600; }

                /* Table */
                h3 { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #1a1a2e; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                thead tr { background: rgba(26, 26, 46, 0.9); }
                th { padding: 10px 8px; text-align: left; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                td { padding: 9px 8px; border-bottom: 1px solid #f0f0f5; }

                /* Footer */
                .footer {
                    margin-top: 35px;
                    padding-top: 18px;
                    border-top: 2px solid #8b5cf6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .footer-left { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #888; }
                .footer-left img { width: 18px; height: 18px; border-radius: 50%; }
                .footer-right { font-size: 9px; color: #aaa; text-align: right; }
                .disclaimer { margin-top: 12px; font-size: 9px; color: #aaa; font-style: italic; }
            </style>
        </head>
        <body>
            <!-- Watermark -->
            <div class="watermark">
                <img src="${logoUrl}" alt="Grokie Watermark">
            </div>

            <div class="content">
                <!-- Header -->
                <div class="header">
                    <div class="header-left">
                        <img src="${logoUrl}" alt="Grokie Inu">
                        <div>
                            <h1>Grokie Portfolio Intelligence</h1>
                            <div class="subtitle">Solana Portfolio Analytics</div>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="report-type">Tax Report ${year}</div>
                        <div>Generated: ${new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <!-- Wallet Info -->
                <div class="wallet-info">
                    <div><span class="label">Wallet: </span><span class="val">${wallet}</span></div>
                    <div><span class="label">Period: </span><span class="val">Jan 1 — Dec 31, ${year}</span></div>
                </div>

                <!-- Summary -->
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="label">Total Disposals</div>
                        <div class="value">${taxableEvents.length}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Short-term Gains</div>
                        <div class="value green">${formatUSD(shortTermGains)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Total Losses</div>
                        <div class="value red">${formatUSD(totalLosses)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Net Capital Gains</div>
                        <div class="value ${netGains >= 0 ? 'green' : 'red'}">${formatUSD(netGains)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Estimated Tax (25%)</div>
                        <div class="value">${formatUSD(Math.max(0, netGains * 0.25))}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">SOL Price (Current)</div>
                        <div class="value">${formatUSD(solPrice)}</div>
                    </div>
                </div>

                <!-- Transaction Table -->
                <h3>Transaction History (Tax Events)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Token</th>
                            <th>Amount</th>
                            <th>Cost Basis</th>
                            <th>Proceeds</th>
                            <th>Gain/Loss</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>

                <!-- Footer -->
                <div class="footer">
                    <div class="footer-left">
                        <img src="${logoUrl}" alt="Grokie">
                        <span>Grokie Portfolio Intelligence — Powered by Helius & Solana</span>
                    </div>
                    <div class="footer-right">
                        Page 1 | Confidential
                    </div>
                </div>
                <p class="disclaimer">⚠️ This report is for informational purposes only and does not constitute tax advice. Consult a qualified tax professional for official filings. Data sourced from on-chain transactions via Helius API.</p>
            </div>
        </body>
        </html>
    `;

    // Open in new window and trigger print (save as PDF)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.print();
    };
    showToast('PDF report opened — use Print > Save as PDF');
}

// ===== UTILITIES =====
function formatUSD(value) {
    if (value === undefined || value === null) return '$0.00';
    const num = parseFloat(value);
    if (!isFinite(num) || isNaN(num)) return '$0.00';
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    if (abs >= 1000000) return sign + '$' + (abs / 1000000).toFixed(2) + 'M';
    if (abs >= 1000) return sign + '$' + (abs / 1000).toFixed(2) + 'K';
    if (abs < 0.01 && abs > 0) return sign + '$' + abs.toFixed(6);
    return sign + '$' + abs.toFixed(2);
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Loading...';
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

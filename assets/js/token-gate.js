// ===== TOKEN GATE - $GROKIE HOLDER VERIFICATION =====
const GROKIE_MINT_ADDRESS = window.__gk ? window.__gk.ca() : '';
const HELIUS_RPC_GATE = window.__gk ? window.__gk.r() : '';
const MIN_GROKIE_BALANCE = 1; // Minimum tokens required
const GATE_EXPIRY_HOURS = 1; // Verification valid for 1 hour

function isGateVerified() {
    const data = sessionStorage.getItem('grokie_gate');
    if (!data) return false;
    try {
        const parsed = JSON.parse(data);
        const now = Date.now();
        if (parsed.verified && parsed.expiry > now) {
            return true;
        }
        sessionStorage.removeItem('grokie_gate');
        return false;
    } catch {
        return false;
    }
}

function setGateVerified(walletAddress) {
    const expiry = Date.now() + (GATE_EXPIRY_HOURS * 60 * 60 * 1000);
    sessionStorage.setItem('grokie_gate', JSON.stringify({
        verified: true,
        wallet: walletAddress,
        expiry: expiry
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('tokenGate');
    if (!gate) return; // No gate on this page

    const connectBtn = document.getElementById('gateConnectBtn');
    const status = document.getElementById('gateStatus');

    // Check if already verified
    if (isGateVerified()) {
        gate.style.display = 'none';
        return;
    }

    // Show gate, hide main content
    gate.style.display = 'flex';

    // Hide page-specific content
    const main = document.querySelector('.main');
    const mobileNav = document.querySelector('.mobile-nav');
    const headerNav = document.querySelector('.header-nav');
    const heroSection = document.querySelector('section.hero');
    const container = document.querySelector('.container');

    if (main) main.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    if (headerNav) headerNav.style.display = 'none';
    if (heroSection) heroSection.style.display = 'none';
    if (container) container.style.display = 'none';

    connectBtn.addEventListener('click', connectAndVerify);
});

async function connectAndVerify() {
    const status = document.getElementById('gateStatus');
    const connectBtn = document.getElementById('gateConnectBtn');

    // Check for wallet providers
    const provider = getWalletProvider();
    if (!provider) {
        status.innerHTML = '<span class="gate-error">❌ No Solana wallet detected. Please install <a href="https://phantom.app" target="_blank">Phantom</a>, <a href="https://solflare.com" target="_blank">Solflare</a>, or <a href="https://trustwallet.com" target="_blank">Trust Wallet</a>.</span>';
        return;
    }

    try {
        connectBtn.textContent = '⏳ Connecting...';
        connectBtn.disabled = true;

        // Connect wallet
        const resp = await provider.connect();
        const walletAddress = resp.publicKey.toString();

        status.innerHTML = '<span class="gate-loading">🔍 Verifying $GROKIE balance...</span>';

        // Check GROKIE balance
        const hasGrokie = await checkGrokieBalance(walletAddress);

        if (hasGrokie) {
            status.innerHTML = '<span class="gate-success">✅ Verified! Welcome, Grokie Army! 🐾</span>';
            setGateVerified(walletAddress);

            // Unlock access after short delay
            setTimeout(() => {
                document.getElementById('tokenGate').style.display = 'none';

                // Restore all hidden elements
                const main = document.querySelector('.main');
                const mobileNav = document.querySelector('.mobile-nav');
                const headerNav = document.querySelector('.header-nav');
                const heroSection = document.querySelector('section.hero');
                const container = document.querySelector('.container');

                if (main) main.style.display = '';
                if (mobileNav) mobileNav.style.display = '';
                if (headerNav) headerNav.style.display = '';
                if (heroSection) heroSection.style.display = '';
                if (container) container.style.display = '';

                // Pre-fill wallet input and lock it
                const walletInput = document.getElementById('walletInput');
                if (walletInput) {
                    walletInput.value = walletAddress;
                    walletInput.readOnly = true;
                    walletInput.style.opacity = '0.85';
                    walletInput.style.cursor = 'not-allowed';
                    walletInput.title = 'Wallet address is locked to your verified $GROKIE wallet';
                }
            }, 1200);
        } else {
            status.innerHTML = '<span class="gate-error">❌ No $GROKIE found in this wallet. You need at least ' + MIN_GROKIE_BALANCE + ' $GROKIE to access this tool.</span>';
            connectBtn.textContent = '🔗 Try Another Wallet';
            connectBtn.disabled = false;
        }
    } catch (err) {
        if (err.message && err.message.includes('User rejected')) {
            status.innerHTML = '<span class="gate-error">Connection cancelled by user.</span>';
        } else {
            status.innerHTML = '<span class="gate-error">❌ Connection failed: ' + err.message + '</span>';
        }
        connectBtn.textContent = '🔗 Connect Wallet';
        connectBtn.disabled = false;
    }
}

function getWalletProvider() {
    if (window.solana && window.solana.isPhantom) return window.solana;
    if (window.solflare && window.solflare.isSolflare) return window.solflare;
    if (window.trustwallet && window.trustwallet.solana) return window.trustwallet.solana;
    if (window.backpack) return window.backpack;
    if (window.solana) return window.solana; // Fallback: any Solana provider (includes Trust Wallet injected as window.solana)
    return null;
}

async function checkGrokieBalance(walletAddress) {
    try {
        // Use Helius DAS API to get token balances
        const response = await fetch(HELIUS_RPC_GATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'token-gate',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: walletAddress,
                    page: 1,
                    limit: 100,
                    displayOptions: { showFungible: true },
                },
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const items = data.result?.items || [];

        // Find GROKIE token
        const grokieToken = items.find(item =>
            item.id === GROKIE_MINT_ADDRESS &&
            (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset')
        );

        if (grokieToken && grokieToken.token_info) {
            const decimals = grokieToken.token_info.decimals || 0;
            const balance = grokieToken.token_info.balance / Math.pow(10, decimals);
            return balance >= MIN_GROKIE_BALANCE;
        }

        return false;
    } catch (err) {
        console.error('Token gate check failed:', err);
        // Fallback: try getTokenAccountsByOwner
        return await checkGrokieBalanceFallback(walletAddress);
    }
}

async function checkGrokieBalanceFallback(walletAddress) {
    try {
        const response = await fetch(HELIUS_RPC_GATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'token-gate-fallback',
                method: 'getTokenAccountsByOwner',
                params: [
                    walletAddress,
                    { mint: GROKIE_MINT_ADDRESS },
                    { encoding: 'jsonParsed' }
                ],
            }),
        });

        const data = await response.json();
        const accounts = data.result?.value || [];

        if (accounts.length > 0) {
            const tokenAmount = accounts[0].account?.data?.parsed?.info?.tokenAmount;
            if (tokenAmount) {
                const balance = parseFloat(tokenAmount.uiAmount || 0);
                return balance >= MIN_GROKIE_BALANCE;
            }
        }
        return false;
    } catch (err) {
        console.error('Fallback token check failed:', err);
        return false;
    }
}

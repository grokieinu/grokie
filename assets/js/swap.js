// ===== CONFIGURATION =====
const REFERRAL_ACCOUNT = window.__gk ? window.__gk.ra() : '';
const REFERRAL_FEE_BPS = 50; // 0.5% fee per swap
const GROKIE_MINT = window.__gk ? window.__gk.ca() : '';
const SOL_MINT = window.__gk ? window.__gk.sm() : 'So11111111111111111111111111111111111111112';
// ==========================

let jupiterRetries = 0;
const MAX_RETRIES = 15;

// ===== INIT =====
window.onload = function () {
    checkWalletAvailability();
    waitForJupiter();
};

// ===== WALLET DETECTION =====
function checkWalletAvailability() {
    const hasPhantom = window.solana && window.solana.isPhantom;
    const hasSolflare = window.solflare && window.solflare.isSolflare;
    const hasBackpack = window.backpack;
    const hasAnyWallet = hasPhantom || hasSolflare || hasBackpack || window.solana;

    if (!hasAnyWallet) {
        // Short delay because some wallets inject slowly
        setTimeout(() => {
            const recheckPhantom = window.solana && window.solana.isPhantom;
            const recheckSolflare = window.solflare && window.solflare.isSolflare;
            const recheckAny = recheckPhantom || recheckSolflare || window.backpack || window.solana;

            if (!recheckAny) {
                document.getElementById('walletNotif').style.display = 'flex';
            }
        }, 2000);
    }
}

function dismissWalletNotif() {
    document.getElementById('walletNotif').style.display = 'none';
}

// ===== JUPITER WIDGET =====
function waitForJupiter() {
    if (window.Jupiter) {
        initJupiter();
    } else if (jupiterRetries < MAX_RETRIES) {
        jupiterRetries++;
        setTimeout(waitForJupiter, 800);
    } else {
        showFallback();
    }
}

function initJupiter() {
    document.getElementById('swapLoading').style.display = 'none';

    const config = {
        displayMode: 'integrated',
        integratedTargetId: 'jupiter-plugin',
        formProps: {
            initialInputMint: SOL_MINT,
            initialOutputMint: GROKIE_MINT,
            initialAmount: '',
        },
        branding: {
            logoUri: 'assets/images/grokie-inu.png',
            name: 'Grokie Swap',
        },
        onSuccess: ({ txid }) => {
            showToast('Swap successful! TX: ' + txid.slice(0, 8) + '...');
        },
        onSwapError: ({ error }) => {
            console.error('Swap error:', error);
            showToast('Swap failed. Please try again.');
        },
    };

    // Enable fee if referral account is set
    if (REFERRAL_ACCOUNT && REFERRAL_ACCOUNT.length > 30) {
        config.formProps.referralAccount = REFERRAL_ACCOUNT;
        config.formProps.referralFee = REFERRAL_FEE_BPS;
    }

    try {
        window.Jupiter.init(config);
        overrideJupiterBranding();
    } catch (err) {
        console.error('Jupiter init error:', err);
        showFallback();
    }
}

// ===== FALLBACK =====
function showFallback() {
    document.getElementById('swapLoading').innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
            <p style="color:#f59e0b;font-size:1.1rem;margin-bottom:15px;">⚠️ Widget failed to load</p>
            <p style="color:#9898b8;font-size:0.85rem;margin-bottom:20px;">Make sure you open this page via a web server (not file://). A wallet extension (Phantom/Solflare) must be installed.</p>
            <a href="https://jup.ag/swap/SOL-${GROKIE_MINT}" target="_blank"
               style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg,#f72585,#8b5cf6);color:white;text-decoration:none;border-radius:50px;font-weight:700;font-size:1rem;">
                Swap on Jupiter.ag
            </a>
            <br>
            <button onclick="location.reload()"
                    style="margin-top:12px;padding:10px 20px;background:transparent;color:#9898b8;border:1px solid #2a2a50;border-radius:8px;cursor:pointer;font-size:0.85rem;">
                ↻ Try Again
            </button>
        </div>
    `;
}

// ===== TOAST =====
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// ===== BRANDING OVERRIDE =====
function overrideJupiterBranding() {
    const container = document.getElementById('jupiter-plugin');
    const logo = 'assets/images/grokie-inu.png';

    function replace(root) {
        root.querySelectorAll('img').forEach(img => {
            const s = (img.src || '').toLowerCase();
            const a = (img.alt || '').toLowerCase();
            if (s.includes('jup') || s.includes('jupiter') || a.includes('jupiter')) {
                img.src = logo;
                img.alt = 'Grokie Swap';
                img.style.borderRadius = '50%';
            }
        });
        root.querySelectorAll('span, p, div, a').forEach(el => {
            if (el.children.length === 0 && el.textContent.trim() === 'Jupiter') {
                el.textContent = 'Grokie Swap';
            }
        });
    }

    setTimeout(() => replace(container), 2000);
    setTimeout(() => replace(container), 4000);
    setTimeout(() => replace(container), 6000);

    const obs = new MutationObserver(() => replace(container));
    obs.observe(container, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
}

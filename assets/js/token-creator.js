/**
 * Grokie Inu - Solana Token Creator
 * UI Logic: wallet connection, form handling, fee calculation
 */

// Toggle social fields
function toggleSocials() {
    var show = document.getElementById('optSocials').checked;
    document.getElementById('socialFields').style.display = show ? 'block' : 'none';
}

// Update fee display
function updateFee() {
    var total = 0.05;
    var freezeChecked = document.getElementById('optFreeze').checked;
    var mintChecked = document.getElementById('optMint').checked;
    var socialsChecked = document.getElementById('optSocials').checked;

    document.getElementById('feeFreeze').style.display = freezeChecked ? 'flex' : 'none';
    document.getElementById('feeMint').style.display = mintChecked ? 'flex' : 'none';
    document.getElementById('feeSocials').style.display = socialsChecked ? 'flex' : 'none';

    if (freezeChecked) total += 0.1;
    if (mintChecked) total += 0.1;
    if (socialsChecked) total += 0.1;

    document.getElementById('feeTotal').textContent = '~' + total.toFixed(2) + ' SOL';
}

// Logo upload
function handleLogoUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showStatus('Logo must be under 5MB', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        var preview = document.getElementById('logoPreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Status display
function showStatus(msg, type) {
    var el = document.getElementById('statusBox');
    el.className = 'status show ' + type;
    el.innerHTML = msg;
}

// Connect Phantom Wallet
async function connectWallet() {
    // Show wallet selection modal
    document.getElementById('walletModal').classList.add('show');
}

function closeWalletModal() {
    document.getElementById('walletModal').classList.remove('show');
}

// Connect specific wallet
async function connectSpecificWallet(walletType) {
    closeWalletModal();

    // Detect mobile
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var currentUrl = encodeURIComponent(window.location.href);

    try {
        var provider = null;

        switch(walletType) {
            case 'phantom':
                if (window.solana && window.solana.isPhantom) {
                    provider = window.solana;
                } else if (isMobile) {
                    // Deep link to Phantom app
                    window.location.href = 'https://phantom.app/ul/browse/' + currentUrl;
                    return;
                } else {
                    window.open('https://phantom.app/', '_blank');
                    showStatus('Please install Phantom Wallet', 'error');
                    return;
                }
                break;
            case 'solflare':
                if (window.solflare && window.solflare.isSolflare) {
                    provider = window.solflare;
                } else if (isMobile) {
                    window.location.href = 'https://solflare.com/ul/v1/browse/' + currentUrl;
                    return;
                } else {
                    window.open('https://solflare.com/', '_blank');
                    showStatus('Please install Solflare Wallet', 'error');
                    return;
                }
                break;
            case 'backpack':
                if (window.backpack) {
                    provider = window.backpack;
                } else if (isMobile) {
                    window.location.href = 'https://backpack.app/ul/browse/' + currentUrl;
                    return;
                } else {
                    window.open('https://backpack.app/', '_blank');
                    showStatus('Please install Backpack Wallet', 'error');
                    return;
                }
                break;
            case 'coinbase':
                if (window.coinbaseSolana) {
                    provider = window.coinbaseSolana;
                } else if (isMobile) {
                    window.location.href = 'https://go.cb-w.com/dapp?cb_url=' + currentUrl;
                    return;
                } else {
                    window.open('https://www.coinbase.com/wallet', '_blank');
                    showStatus('Please install Coinbase Wallet', 'error');
                    return;
                }
                break;
            case 'trust':
                if (window.trustwallet && window.trustwallet.solana) {
                    provider = window.trustwallet.solana;
                } else if (window.solana && window.solana.isTrust) {
                    provider = window.solana;
                } else if (isMobile) {
                    // Trust Wallet deep link - open dApp browser
                    var trustUrl = 'https://link.trustwallet.com/open_url?coin_id=501&url=' + currentUrl;
                    window.location.href = trustUrl;
                    return;
                } else {
                    window.open('https://trustwallet.com/', '_blank');
                    showStatus('Please install Trust Wallet', 'error');
                    return;
                }
                break;
            default:
                showStatus('Wallet not supported', 'error');
                return;
        }

        var resp = await provider.connect();
        var pubkey = resp.publicKey.toString();

        // Store provider globally for transaction signing
        window._solanaProvider = provider;

        document.getElementById('connectBtn').textContent = pubkey.substring(0,4) + '...' + pubkey.substring(pubkey.length-4);
        document.getElementById('connectBtn').classList.add('connected');
        document.getElementById('walletAddress').textContent = pubkey;
        document.getElementById('walletInfo').classList.add('show');
        document.getElementById('createBtn').disabled = false;

        // Get balance
        try {
            if (window.solanaWeb3) {
                var connection = new window.solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=d33d23ca-ca10-4b9b-b231-13043e8f53c5', 'confirmed');
                var balance = await connection.getBalance(new window.solanaWeb3.PublicKey(pubkey));
                document.getElementById('walletBalance').textContent = (balance / 1000000000).toFixed(4);
            } else {
                // Fallback: try fetch RPC directly
                var rpcResp = await fetch('https://mainnet.helius-rpc.com/?api-key=d33d23ca-ca10-4b9b-b231-13043e8f53c5', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[pubkey]})
                });
                var rpcData = await rpcResp.json();
                if (rpcData.result) {
                    document.getElementById('walletBalance').textContent = (rpcData.result.value / 1000000000).toFixed(4);
                }
            }
        } catch(e) {
            document.getElementById('walletBalance').textContent = '—';
        }

        showStatus('Wallet connected successfully!', 'success');

    } catch (err) {
        if (err.code === 4001) {
            showStatus('Connection rejected by user.', 'error');
        } else {
            showStatus('Failed to connect: ' + err.message, 'error');
        }
    }
}

// Success Popup
function showSuccessPopup(mintAddress, name, symbol, supply) {
    document.getElementById('popupMint').textContent = mintAddress;
    document.getElementById('popupName').textContent = name;
    document.getElementById('popupSymbol').textContent = symbol;
    document.getElementById('popupSupply').textContent = Number(supply).toLocaleString();
    document.getElementById('popupSolscan').href = 'https://solscan.io/token/' + mintAddress;
    document.getElementById('popupLiquidity').href = 'https://raydium.io/liquidity/create-pool/?coin0=' + mintAddress + '&coin1=sol';
    document.getElementById('successPopup').classList.add('show');
}

function closeSuccessPopup() {
    document.getElementById('successPopup').classList.remove('show');
}

// Progress Steps
function showProgress() {
    document.getElementById('progressSteps').style.display = 'block';
    // Reset all steps
    for (var i = 1; i <= 5; i++) {
        var step = document.getElementById('pStep' + i);
        step.className = 'progress-step';
    }
}

function setProgressStep(stepNum, state) {
    // state: 'active', 'done', 'error'
    var step = document.getElementById('pStep' + stepNum);
    step.className = 'progress-step ' + state;
}

function hideProgress() {
    document.getElementById('progressSteps').style.display = 'none';
}

// Disconnect Wallet
async function disconnectWallet() {
    try {
        if (window._solanaProvider && window._solanaProvider.disconnect) {
            await window._solanaProvider.disconnect();
        }
    } catch(e) {}

    window._solanaProvider = null;
    document.getElementById('connectBtn').textContent = 'Connect Wallet';
    document.getElementById('connectBtn').classList.remove('connected');
    document.getElementById('walletInfo').classList.remove('show');
    document.getElementById('walletAddress').textContent = '';
    document.getElementById('walletBalance').textContent = '0';
    document.getElementById('createBtn').disabled = true;
    showStatus('Wallet disconnected.', 'error');
}

// Mobile detection & notice
(function() {
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var isInWalletBrowser = (window.solana && window.solana.isPhantom) || (window.solflare) || (window.backpack) || (window.trustwallet);

    if (isMobile && !isInWalletBrowser) {
        var notice = document.getElementById('mobileNotice');
        if (notice) {
            notice.style.display = 'block';
            document.getElementById('pageUrl').textContent = window.location.href;
        }
    }
})();

function copyPageUrl() {
    navigator.clipboard.writeText(window.location.href).then(function() {
        var el = document.querySelector('.mobile-notice-url small');
        if (el) { el.textContent = '✅ Copied!'; setTimeout(function() { el.textContent = 'Tap to copy'; }, 2000); }
    });
}

// Copy Contract Address
function copyCA(elementId) {
    var text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(elementId).nextElementSibling;
        if (btn) { btn.textContent = '✅ Copied!'; setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000); }
    }).catch(function() {
        var textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        var btn = document.getElementById(elementId).nextElementSibling;
        if (btn) { btn.textContent = '✅ Copied!'; setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000); }
    });
}

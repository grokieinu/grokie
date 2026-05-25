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
                    window.location.href = 'trust://browser_enable?coin=501&url=' + currentUrl;
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
            var connection = new window.solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
            var balance = await connection.getBalance(resp.publicKey);
            document.getElementById('walletBalance').textContent = (balance / 1000000000).toFixed(4);
        } catch(e) {
            document.getElementById('walletBalance').textContent = 'Connected';
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
    document.getElementById('successPopup').classList.add('show');
}

function closeSuccessPopup() {
    document.getElementById('successPopup').classList.remove('show');
}

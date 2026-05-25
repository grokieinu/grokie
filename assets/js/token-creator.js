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
    try {
        if (!window.solana || !window.solana.isPhantom) {
            showStatus('Phantom Wallet not detected. Please install it from phantom.app', 'error');
            window.open('https://phantom.app/', '_blank');
            return;
        }

        var resp = await window.solana.connect();
        var pubkey = resp.publicKey.toString();

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

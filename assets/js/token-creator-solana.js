/**
 * Grokie Inu - Solana Token Creator
 * Blockchain Logic: SPL token creation via Solana Web3
 * This is a module script (type="module")
 */

import { createMint, getOrCreateAssociatedTokenAccount, mintTo, setAuthority, AuthorityType } from 'https://esm.sh/@solana/spl-token@0.3.9';
import { Connection } from 'https://esm.sh/@solana/web3.js@1.87.6';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

window.createToken = async function() {
    const name = document.getElementById('tokenName').value.trim();
    const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
    const supply = parseInt(document.getElementById('tokenSupply').value);
    const decimals = parseInt(document.getElementById('tokenDecimals').value);
    const disableFreeze = document.getElementById('optFreeze').checked;
    const revokeMint = document.getElementById('optMint').checked;

    if (!name || !symbol || !supply) {
        showStatus('Please fill in Token Name, Symbol, and Supply.', 'error');
        return;
    }

    if (!window.solana || !window.solana.isConnected) {
        showStatus('Please connect your wallet first.', 'error');
        return;
    }

    const walletPubkey = window.solana.publicKey;

    if (supply <= 0) {
        showStatus('Supply must be greater than 0.', 'error');
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = 'Creating Token...';

    try {
        showStatus('Step 1/4: Creating mint account on Solana mainnet...', 'loading');

        const walletAdapter = {
            publicKey: walletPubkey,
            signTransaction: async (tx) => await window.solana.signTransaction(tx),
            signAllTransactions: async (txs) => await window.solana.signAllTransactions(txs),
        };

        // Create mint
        const mint = await createMint(
            connection,
            walletAdapter,
            walletPubkey,
            disableFreeze ? null : walletPubkey,
            decimals
        );

        showStatus('Step 2/4: Creating token account...', 'loading');

        // Create associated token account
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            walletAdapter,
            mint,
            walletPubkey
        );

        showStatus('Step 3/4: Minting ' + supply.toLocaleString() + ' tokens...', 'loading');

        // Mint tokens
        const mintAmount = BigInt(supply) * BigInt(10 ** decimals);
        await mintTo(
            connection,
            walletAdapter,
            mint,
            tokenAccount.address,
            walletPubkey,
            mintAmount
        );

        // Revoke mint authority if selected
        if (revokeMint) {
            showStatus('Step 4/4: Revoking mint authority...', 'loading');
            await setAuthority(
                connection,
                walletAdapter,
                mint,
                walletPubkey,
                AuthorityType.MintTokens,
                null
            );
        }

        // Show success
        const mintAddress = mint.toString();
        const explorerUrl = 'https://solscan.io/token/' + mintAddress;

        showStatus('✅ Token created successfully on Solana mainnet!', 'success');

        document.getElementById('resultMint').textContent = mintAddress;
        document.getElementById('resultAccount').textContent = tokenAccount.address.toString();
        document.getElementById('resultName').textContent = name;
        document.getElementById('resultSymbol').textContent = symbol;
        document.getElementById('resultSupply').textContent = supply.toLocaleString();
        document.getElementById('resultDecimals').textContent = decimals;
        document.getElementById('resultExplorer').href = explorerUrl;
        document.getElementById('resultBox').classList.add('show');

        btn.textContent = 'Token Created!';

    } catch (err) {
        console.error(err);
        let errorMsg = err.message || 'Transaction failed.';
        if (errorMsg.includes('insufficient')) errorMsg = 'Insufficient SOL balance. You need at least 0.05 SOL.';
        if (errorMsg.includes('rejected')) errorMsg = 'Transaction was rejected by wallet.';
        showStatus('Error: ' + errorMsg, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Token';
    }
};

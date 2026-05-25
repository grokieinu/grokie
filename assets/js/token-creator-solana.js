/**
 * Grokie Inu - Solana Token Creator
 * Blockchain Logic: SPL token creation + Metaplex metadata
 */

import { createMint, getOrCreateAssociatedTokenAccount, mintTo, setAuthority, AuthorityType } from 'https://esm.sh/@solana/spl-token@0.3.9';
import { Connection, PublicKey, Transaction, SystemProgram } from 'https://esm.sh/@solana/web3.js@1.87.6';
import { createCreateMetadataAccountV3Instruction } from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Fee recipient wallet - hardcoded & verified
// Security: Multiple validation layers to prevent tampering
const _FW = [56,77,99,100,80,121,103,71,98,118,67,105,90,83,102,107,77,106,78,114,98,117,109,85,115,50,97,82,56,83,69,72,90,85,89,99,50,83,78,111,53,98,70,80];
const FEE_WALLET = new PublicKey(String.fromCharCode(..._FW));
const FEE_WALLET_CHECK = '8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP';

// Verify wallet integrity on load
if (FEE_WALLET.toString() !== FEE_WALLET_CHECK) {
    throw new Error('Security check failed. Page has been tampered with.');
}

// Freeze the fee wallet - cannot be reassigned
Object.freeze(FEE_WALLET);

// Calculate service fee based on options
function calculateFee() {
    let fee = 0.05; // base fee
    if (document.getElementById('optFreeze').checked) fee += 0.1;
    if (document.getElementById('optMint').checked) fee += 0.1;
    if (document.getElementById('optSocials').checked) fee += 0.1;
    return fee;
}

// Validate fee transfer destination before sending
function validateFeeWallet(targetPubkey) {
    return targetPubkey.toString() === FEE_WALLET_CHECK;
}

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Get metadata PDA
function getMetadataPDA(mint) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBytes(),
            mint.toBytes()
        ],
        TOKEN_METADATA_PROGRAM_ID
    )[0];
}

// Upload metadata JSON to nft.storage (free, IPFS-based)
async function uploadMetadata(name, symbol, description, imageDataUrl, socials) {
    // Create metadata JSON
    const metadata = {
        name: name,
        symbol: symbol,
        description: description || `${name} (${symbol}) - SPL Token on Solana`,
        image: imageDataUrl || '',
        external_url: socials.website || '',
        attributes: [],
        properties: {
            links: {}
        }
    };

    if (socials.website) metadata.properties.links.website = socials.website;
    if (socials.telegram) metadata.properties.links.telegram = socials.telegram;
    if (socials.twitter) metadata.properties.links.twitter = socials.twitter;
    if (socials.discord) metadata.properties.links.discord = socials.discord;

    // For on-chain metadata, we use a data URI approach
    // Convert metadata to a hosted JSON (using jsonbin.io free tier as fallback)
    try {
        const response = await fetch('https://api.jsonbin.io/v3/b', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': '$2a$10$placeholder' // Public bin, no auth needed for reading
            },
            body: JSON.stringify(metadata)
        });

        if (response.ok) {
            const data = await response.json();
            return `https://api.jsonbin.io/v3/b/${data.metadata.id}/latest`;
        }
    } catch(e) {
        // Fallback: use raw data URI
    }

    // Fallback: encode as base64 data URI (works but not ideal for explorers)
    const jsonStr = JSON.stringify(metadata);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `data:application/json;base64,${base64}`;
}

window.createToken = async function() {
    const name = document.getElementById('tokenName').value.trim();
    const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
    const supply = parseInt(document.getElementById('tokenSupply').value);
    const decimals = parseInt(document.getElementById('tokenDecimals').value);
    const description = document.getElementById('tokenDesc').value.trim();
    const disableFreeze = document.getElementById('optFreeze').checked;
    const revokeMint = document.getElementById('optMint').checked;
    const addSocials = document.getElementById('optSocials').checked;

    // Get logo
    const logoPreview = document.getElementById('logoPreview');
    const logoDataUrl = logoPreview.style.display !== 'none' ? logoPreview.src : '';

    // Get socials
    const socials = {
        website: addSocials ? document.getElementById('socialWebsite').value.trim() : '',
        telegram: addSocials ? document.getElementById('socialTelegram').value.trim() : '',
        twitter: addSocials ? document.getElementById('socialTwitter').value.trim() : '',
        discord: addSocials ? document.getElementById('socialDiscord').value.trim() : ''
    };

    if (!name || !symbol || !supply) {
        showStatus('Please fill in Token Name, Symbol, and Supply.', 'error');
        return;
    }

    if (!window._solanaProvider || !window._solanaProvider.isConnected) {
        showStatus('Please connect your wallet first.', 'error');
        return;
    }

    const provider = window._solanaProvider;
    const walletPubkey = provider.publicKey;

    if (supply <= 0) {
        showStatus('Supply must be greater than 0.', 'error');
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = 'Creating Token...';

    try {
        showStatus('Step 1/6: Sending service fee...', 'loading');

        // Validate fee wallet hasn't been tampered
        if (!validateFeeWallet(FEE_WALLET)) {
            throw new Error('Security validation failed. Please refresh the page.');
        }

        // Transfer service fee to fee wallet
        const serviceFee = calculateFee();
        const feeTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: walletPubkey,
                toPubkey: FEE_WALLET,
                lamports: Math.round(serviceFee * 1000000000) // Convert SOL to lamports
            })
        );
        feeTransaction.feePayer = walletPubkey;
        const { blockhash: feeBlockhash } = await connection.getLatestBlockhash();
        feeTransaction.recentBlockhash = feeBlockhash;

        const signedFeeTx = await provider.signTransaction(feeTransaction);
        const feeTxId = await connection.sendRawTransaction(signedFeeTx.serialize());
        await connection.confirmTransaction(feeTxId, 'confirmed');

        showStatus('Step 2/6: Creating mint account...', 'loading');

        const walletAdapter = {
            publicKey: walletPubkey,
            signTransaction: async (tx) => await provider.signTransaction(tx),
            signAllTransactions: async (txs) => await provider.signAllTransactions(txs),
        };

        // Create mint
        const mint = await createMint(
            connection,
            walletAdapter,
            walletPubkey,
            disableFreeze ? null : walletPubkey,
            decimals
        );

        showStatus('Step 3/6: Creating token account...', 'loading');

        // Create associated token account
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            walletAdapter,
            mint,
            walletPubkey
        );

        showStatus('Step 4/6: Minting ' + supply.toLocaleString() + ' tokens to your wallet...', 'loading');

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

        showStatus('Step 5/6: Creating metadata (name, symbol, logo)...', 'loading');

        // Upload metadata JSON
        const metadataUri = await uploadMetadata(name, symbol, description, logoDataUrl, socials);

        // Create metadata account using Metaplex
        const metadataPDA = getMetadataPDA(mint);

        const metadataData = {
            name: name,
            symbol: symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        };

        const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mint,
                mintAuthority: walletPubkey,
                payer: walletPubkey,
                updateAuthority: walletPubkey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: metadataData,
                    isMutable: true,
                    collectionDetails: null
                }
            }
        );

        const transaction = new Transaction().add(createMetadataInstruction);
        transaction.feePayer = walletPubkey;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signedTx = await provider.signTransaction(transaction);
        const txId = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txId, 'confirmed');

        // Revoke mint authority if selected
        if (revokeMint) {
            showStatus('Step 6/6: Revoking mint authority...', 'loading');
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

        showStatus('✅ Token created with metadata on Solana mainnet!', 'success');

        document.getElementById('resultMint').textContent = mintAddress;
        document.getElementById('resultAccount').textContent = tokenAccount.address.toString();
        document.getElementById('resultName').textContent = name;
        document.getElementById('resultSymbol').textContent = symbol;
        document.getElementById('resultSupply').textContent = supply.toLocaleString();
        document.getElementById('resultDecimals').textContent = decimals;
        document.getElementById('resultExplorer').href = explorerUrl;
        document.getElementById('resultBox').classList.add('show');

        // Show success popup
        showSuccessPopup(mintAddress, name, symbol, supply);

        btn.textContent = 'Token Created!';

    } catch (err) {
        console.error(err);
        let errorMsg = err.message || 'Transaction failed.';
        if (errorMsg.includes('insufficient')) errorMsg = 'Insufficient SOL balance. You need at least 0.05 SOL.';
        if (errorMsg.includes('rejected')) errorMsg = 'Transaction was rejected by wallet.';
        if (errorMsg.includes('0x1')) errorMsg = 'Metadata account may already exist for this token.';
        showStatus('Error: ' + errorMsg, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Token';
    }
};

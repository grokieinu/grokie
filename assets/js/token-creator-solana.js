/**
 * Grokie Inu - Solana Token Creator
 * Using Token-2022 Program with built-in Metadata Extension
 */

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    Keypair,
    sendAndConfirmTransaction
} from 'https://esm.sh/@solana/web3.js@1.87.6';

import {
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createSetAuthorityInstruction,
    AuthorityType,
    getAssociatedTokenAddressSync,
    getMintLen,
    ExtensionType,
    createInitializeMetadataPointerInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from 'https://esm.sh/@solana/spl-token@0.4.6';

import {
    createInitializeInstruction,
    pack,
    TokenMetadata
} from 'https://esm.sh/@solana/spl-token-metadata@0.1.4';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Fee recipient wallet - secured
const _FW = [56,77,99,100,80,121,103,71,98,118,67,105,90,83,102,107,77,106,78,114,98,117,109,85,115,50,97,82,56,83,69,72,90,85,89,99,50,83,78,111,53,98,70,80];
const FEE_WALLET = new PublicKey(String.fromCharCode(..._FW));
const FEE_WALLET_CHECK = '8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP';

if (FEE_WALLET.toString() !== FEE_WALLET_CHECK) {
    throw new Error('Security check failed.');
}
Object.freeze(FEE_WALLET);

function calculateFee() {
    let fee = 0.05;
    if (document.getElementById('optFreeze').checked) fee += 0.1;
    if (document.getElementById('optMint').checked) fee += 0.1;
    if (document.getElementById('optSocials').checked) fee += 0.1;
    return fee;
}

function validateFeeWallet(target) {
    return target.toString() === FEE_WALLET_CHECK;
}

window.createToken = async function() {
    window._createTokenReady = true;
    const name = document.getElementById('tokenName').value.trim();
    const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
    const supply = parseInt(document.getElementById('tokenSupply').value);
    const decimals = parseInt(document.getElementById('tokenDecimals').value);
    const description = document.getElementById('tokenDesc').value.trim();
    const disableFreeze = document.getElementById('optFreeze').checked;
    const revokeMint = document.getElementById('optMint').checked;
    const addSocials = document.getElementById('optSocials').checked;

    const logoPreview = document.getElementById('logoPreview');
    const logoDataUrl = logoPreview.style.display !== 'none' ? logoPreview.src : '';

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

    if (supply <= 0) {
        showStatus('Supply must be greater than 0.', 'error');
        return;
    }

    const provider = window._solanaProvider;
    const walletPubkey = provider.publicKey;

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = 'Creating Token...';

    try {
        // Step 1: Transfer service fee
        showProgress();
        setProgressStep(1, 'active');
        showStatus('Step 1/5: Sending service fee...', 'loading');

        if (!validateFeeWallet(FEE_WALLET)) {
            throw new Error('Security validation failed.');
        }

        const serviceFee = calculateFee();
        const feeTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: walletPubkey,
                toPubkey: FEE_WALLET,
                lamports: Math.round(serviceFee * 1000000000)
            })
        );
        feeTransaction.feePayer = walletPubkey;
        const { blockhash: feeBlockhash } = await connection.getLatestBlockhash();
        feeTransaction.recentBlockhash = feeBlockhash;

        const signedFeeTx = await provider.signTransaction(feeTransaction);
        const feeTxId = await connection.sendRawTransaction(signedFeeTx.serialize());
        await connection.confirmTransaction(feeTxId, 'confirmed');

        // Step 2: Create Token-2022 mint with metadata extension
        setProgressStep(1, 'done');
        setProgressStep(2, 'active');
        showStatus('Step 2/5: Creating Token-2022 mint with metadata...', 'loading');

        const mintKeypair = Keypair.generate();
        const mint = mintKeypair.publicKey;

        // Build metadata
        const metadata = {
            mint: mint,
            name: name,
            symbol: symbol,
            uri: '',
            additionalMetadata: []
        };

        // Add description and socials as additional metadata
        if (description) {
            metadata.additionalMetadata.push(['description', description]);
        }
        if (logoDataUrl) {
            metadata.additionalMetadata.push(['image', logoDataUrl.substring(0, 200)]); // Truncate for on-chain
        }
        if (socials.website) metadata.additionalMetadata.push(['website', socials.website]);
        if (socials.telegram) metadata.additionalMetadata.push(['telegram', socials.telegram]);
        if (socials.twitter) metadata.additionalMetadata.push(['twitter', socials.twitter]);
        if (socials.discord) metadata.additionalMetadata.push(['discord', socials.discord]);

        // Calculate space needed
        const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
        const metadataLen = pack(metadata).length;
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);

        // Build transaction
        const transaction = new Transaction().add(
            // Create account for mint
            SystemProgram.createAccount({
                fromPubkey: walletPubkey,
                newAccountPubkey: mint,
                space: mintLen,
                lamports: lamports,
                programId: TOKEN_2022_PROGRAM_ID
            }),
            // Initialize metadata pointer (points to itself)
            createInitializeMetadataPointerInstruction(
                mint,
                walletPubkey,
                mint,
                TOKEN_2022_PROGRAM_ID
            ),
            // Initialize mint
            createInitializeMintInstruction(
                mint,
                decimals,
                walletPubkey,
                disableFreeze ? null : walletPubkey,
                TOKEN_2022_PROGRAM_ID
            ),
            // Initialize metadata
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: walletPubkey,
                mint: mint,
                mintAuthority: walletPubkey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri
            })
        );

        transaction.feePayer = walletPubkey;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        // Partially sign with mint keypair
        transaction.partialSign(mintKeypair);

        // User signs
        const signedTx = await provider.signTransaction(transaction);
        const txId = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txId, 'confirmed');

        // Step 3: Create token account
        setProgressStep(2, 'done');
        setProgressStep(3, 'active');
        showStatus('Step 3/5: Creating token account...', 'loading');

        const associatedToken = getAssociatedTokenAddressSync(
            mint,
            walletPubkey,
            false,
            TOKEN_2022_PROGRAM_ID
        );

        const ataTransaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                walletPubkey,
                associatedToken,
                walletPubkey,
                mint,
                TOKEN_2022_PROGRAM_ID
            )
        );
        ataTransaction.feePayer = walletPubkey;
        const { blockhash: ataBlockhash } = await connection.getLatestBlockhash();
        ataTransaction.recentBlockhash = ataBlockhash;

        const signedAtaTx = await provider.signTransaction(ataTransaction);
        const ataTxId = await connection.sendRawTransaction(signedAtaTx.serialize());
        await connection.confirmTransaction(ataTxId, 'confirmed');

        // Step 4: Mint tokens
        setProgressStep(3, 'done');
        setProgressStep(4, 'active');
        showStatus('Step 4/5: Minting ' + supply.toLocaleString() + ' tokens...', 'loading');

        const mintAmount = BigInt(supply) * BigInt(10 ** decimals);
        const mintTransaction = new Transaction().add(
            createMintToInstruction(
                mint,
                associatedToken,
                walletPubkey,
                mintAmount,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );
        mintTransaction.feePayer = walletPubkey;
        const { blockhash: mintBlockhash } = await connection.getLatestBlockhash();
        mintTransaction.recentBlockhash = mintBlockhash;

        const signedMintTx = await provider.signTransaction(mintTransaction);
        const mintTxId = await connection.sendRawTransaction(signedMintTx.serialize());
        await connection.confirmTransaction(mintTxId, 'confirmed');

        // Step 5: Revoke mint authority (optional)
        if (revokeMint) {
            setProgressStep(4, 'done');
            setProgressStep(5, 'active');
            showStatus('Step 5/5: Revoking mint authority...', 'loading');

            const revokeTransaction = new Transaction().add(
                createSetAuthorityInstruction(
                    mint,
                    walletPubkey,
                    AuthorityType.MintTokens,
                    null,
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );
            revokeTransaction.feePayer = walletPubkey;
            const { blockhash: revokeBlockhash } = await connection.getLatestBlockhash();
            revokeTransaction.recentBlockhash = revokeBlockhash;

            const signedRevokeTx = await provider.signTransaction(revokeTransaction);
            const revokeTxId = await connection.sendRawTransaction(signedRevokeTx.serialize());
            await connection.confirmTransaction(revokeTxId, 'confirmed');
        }

        // Success
        setProgressStep(4, 'done');
        if (revokeMint) setProgressStep(5, 'done');
        const mintAddress = mint.toString();
        const explorerUrl = 'https://solscan.io/token/' + mintAddress;

        showStatus('✅ Token-2022 created with on-chain metadata!', 'success');

        document.getElementById('resultMint').textContent = mintAddress;
        document.getElementById('resultAccount').textContent = associatedToken.toString();
        document.getElementById('resultName').textContent = name;
        document.getElementById('resultSymbol').textContent = symbol;
        document.getElementById('resultSupply').textContent = supply.toLocaleString();
        document.getElementById('resultDecimals').textContent = decimals;
        document.getElementById('resultExplorer').href = explorerUrl;
        document.getElementById('resultBox').classList.add('show');

        showSuccessPopup(mintAddress, name, symbol, supply);

        btn.textContent = 'Token Created!';

    } catch (err) {
        console.error(err);
        // Mark current active step as error
        for (var i = 1; i <= 5; i++) {
            var step = document.getElementById('pStep' + i);
            if (step && step.classList.contains('active')) {
                setProgressStep(i, 'error');
                break;
            }
        }
        let errorMsg = err.message || 'Transaction failed.';
        if (errorMsg.includes('insufficient')) errorMsg = 'Insufficient SOL balance. You need at least 0.1 SOL.';
        if (errorMsg.includes('rejected')) errorMsg = 'Transaction was rejected by wallet.';
        if (errorMsg.includes('0x1')) errorMsg = 'Account already exists or invalid instruction.';
        showStatus('Error: ' + errorMsg, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Token';
    }
};


// Signal that module is ready
window._createTokenReady = true;
console.log('Token Creator: Solana libraries loaded.');

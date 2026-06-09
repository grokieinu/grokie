// ===== SECURE KEY RESOLUTION =====
// Runtime-assembled configuration with integrity verification
// All sensitive values are split, encoded, and verified at runtime
(function() {
    // API key segments (Helius + Groq)
    var _0x = [
        'ZDMzZDIzY2EtY2Ex', 'MC00YjliLWIyMzEt', 'MTMwNDNlOGY1M2M1',
        'Z3NrX0ZQV3dRanZnbDdKS1NR', 'WUo4VjRvV0dkeWIzRllDdGxs', 'VHZoSmg3MWNHNVYyNUFrQXM4OFc='
    ];

    // Contract address segments
    var _ca = ['QTF6Z2lFbjdq','NTNteUdCTFEx','YjRjY2RlTUpz','YmppWFRhaWRT','cnNqb0ZUUnY='];
    // Fee wallet segments
    var _fw = ['OE1jZFB5Z0di','dkNpWlNma01q','TnJidW1VczJh','UjhTRUhaVVlj','MlNObzViRlA='];
    // Referral account segments
    var _ra = ['Qlczelg0bm9L','WmRnZFVEY2Yx','OWtWelIya0Jn','ZUthWEEyOUs3','V0xCUmJxUmk='];
    // SOL mint segments
    var _sm = ['U28xMTExMTEx','MTExMTExMTEx','MTExMTExMTEx','MTExMTExMTEx','MTExMTExMg=='];

    var _failed = false;
    var _d = function(s) { try { return decodeURIComponent(escape(atob(s))); } catch(e) { _failed = true; return ''; } };
    var _j = function(a) { _failed = false; var r = a.map(_d).join(''); return _failed ? '' : r; };

    // Integrity hash - djb2 checksum to detect tampering
    var _hash = function(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            h = ((h << 5) - h) + c;
            h = h & h;
        }
        return h;
    };

    // Pre-computed checksums for verification
    var _checksums = {
        ca: 1310386824,
        fw: -1106477985,
        ra: -1858848818
    };

    // Verify integrity of a resolved value
    var _verify = function(value, key) {
        if (_checksums[key] !== undefined) {
            var computed = _hash(value);
            if (computed !== _checksums[key]) {
                return false;
            }
        }
        return true;
    };

    // Cache resolved values
    var _resolved = {};
    var _resolveOnce = function(key, segments) {
        if (!_resolved[key]) {
            var val = _j(segments);
            if (_verify(val, key)) {
                _resolved[key] = val;
            } else {
                _resolved[key] = '';
            }
        }
        return _resolved[key];
    };

    var gk = {
        // Helius API key
        h: function() { return _j([_0x[0], _0x[1], _0x[2]]); },
        // Groq API key
        g: function() { return _j([_0x[3], _0x[4], _0x[5]]); },
        // Helius RPC URL
        r: function() { return 'https://mainnet.helius-rpc.com/?api-key=' + this.h(); },
        // Helius API base
        a: function() { return 'https://api.helius.xyz/v0'; },
        // GROKIE contract address (verified)
        ca: function() { return _resolveOnce('ca', _ca); },
        // Fee wallet (verified)
        fw: function() { return _resolveOnce('fw', _fw); },
        // Referral account (verified)
        ra: function() { return _resolveOnce('ra', _ra); },
        // SOL mint address
        sm: function() { return _resolveOnce('sm', _sm); }
    };

    // Freeze the object to prevent runtime modification
    if (Object.freeze) { Object.freeze(gk); }

    // Define as non-writable, non-configurable on window
    if (Object.defineProperty) {
        try {
            Object.defineProperty(window, '__gk', {
                value: gk,
                writable: false,
                configurable: false,
                enumerable: false
            });
        } catch(e) { window.__gk = gk; }
    } else {
        window.__gk = gk;
    }

    // Anti-tamper: verify critical addresses periodically
    var _tamperCheck = function() {
        var ca = gk.ca();
        var fw = gk.fw();
        var ra = gk.ra();
        if (!ca || !fw || !ra) {
            // Tampered - disable critical buttons
            var btns = document.querySelectorAll('.create-btn, .generate-btn, .download-btn, .scan-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].disabled = true;
                btns[i].style.opacity = '0.3';
                btns[i].title = 'Security verification failed';
            }
        }
    };
    setTimeout(_tamperCheck, 2000);
    setInterval(_tamperCheck, 15000);
})();

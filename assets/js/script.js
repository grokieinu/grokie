// ===== Mobile Menu =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Mobile dropdown toggle (touch devices)
document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            const dropdown = toggle.closest('.nav-dropdown');
            // Close other dropdowns
            document.querySelectorAll('.nav-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        }
    });
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (link.classList.contains('nav-dropdown-toggle')) return;
        navLinks.classList.remove('active');
        document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    });
});

// ===== Navbar Scroll Effect =====
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 10, 26, 0.98)';
        navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
    } else {
        navbar.style.background = 'rgba(10, 10, 26, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// ===== News Carousel (Continuous Slow Scroll via CSS) =====
(function() {
    var carousel = document.getElementById('newsCarousel');
    if (!carousel) return;

    // Hide dots
    var dotsContainer = document.getElementById('carouselDots');
    if (dotsContainer) dotsContainer.style.display = 'none';

    // Clone all cards for seamless infinite loop
    var cards = carousel.querySelectorAll('.news-card');
    for (var i = 0; i < cards.length; i++) {
        var clone = cards[i].cloneNode(true);
        carousel.appendChild(clone);
    }

    // Calculate total width of original cards
    var totalWidth = 0;
    for (var i = 0; i < cards.length; i++) {
        totalWidth += cards[i].offsetWidth + 16; // card width + gap
    }

    // Apply CSS animation
    carousel.style.animation = 'newsScroll ' + (totalWidth / 30) + 's linear infinite';

    // Inject keyframe
    var style = document.createElement('style');
    style.textContent = '@keyframes newsScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-' + totalWidth + 'px); } }';
    document.head.appendChild(style);

    // Pause on hover
    carousel.addEventListener('mouseenter', function() {
        carousel.style.animationPlayState = 'paused';
    });
    carousel.addEventListener('mouseleave', function() {
        carousel.style.animationPlayState = 'running';
    });
})();

// ===== Live Price Data =====
const GROKIE_MINT = window.__gk ? window.__gk.ca() : '';

async function fetchLiveData() {
    try {
        // Fetch price from Jupiter
        const priceResp = await fetch(`https://api.jup.ag/price/v2?ids=${GROKIE_MINT}`);
        if (priceResp.ok) {
            const priceData = await priceResp.json();
            const tokenData = priceData.data?.[GROKIE_MINT];
            if (tokenData) {
                const price = parseFloat(tokenData.price);
                document.getElementById('livePrice').textContent = price < 0.01
                    ? '$' + price.toFixed(8)
                    : '$' + price.toFixed(4);
            }
        }
    } catch (e) {
        console.warn('Price fetch failed:', e);
    }

    // Try fetching market data from DexScreener
    try {
        const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${GROKIE_MINT}`);
        if (dexResp.ok) {
            const dexData = await dexResp.json();
            const pairs = dexData.pairs || [];

            // Find the pair with the most volume/liquidity
            let bestPair = pairs[0];
            for (const p of pairs) {
                if ((p.volume?.h24 || 0) > (bestPair?.volume?.h24 || 0)) {
                    bestPair = p;
                }
            }

            if (bestPair) {
                const mcap = bestPair.marketCap || bestPair.fdv || 0;
                const volume = bestPair.volume?.h24 || 0;
                const change = bestPair.priceChange?.h24 || 0;

                // Market Cap
                if (mcap > 0) {
                    document.getElementById('liveMcap').textContent = mcap >= 1000000
                        ? '$' + (mcap / 1000000).toFixed(2) + 'M'
                        : mcap >= 1000
                        ? '$' + (mcap / 1000).toFixed(1) + 'K'
                        : '$' + mcap.toFixed(0);
                }

                // Volume - show even if small
                const volEl = document.getElementById('liveVolume');
                if (volume >= 1000000) {
                    volEl.textContent = '$' + (volume / 1000000).toFixed(2) + 'M';
                } else if (volume >= 1000) {
                    volEl.textContent = '$' + (volume / 1000).toFixed(1) + 'K';
                } else if (volume > 0) {
                    volEl.textContent = '$' + volume.toFixed(2);
                } else {
                    // Sum volume from all pairs
                    const totalVol = pairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
                    if (totalVol > 0) {
                        volEl.textContent = totalVol >= 1000
                            ? '$' + (totalVol / 1000).toFixed(1) + 'K'
                            : '$' + totalVol.toFixed(2);
                    } else {
                        volEl.textContent = '<$1';
                    }
                }

                // 24h Change
                const changeEl = document.getElementById('liveChange');
                changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';

                // Update price from dexscreener if available
                if (bestPair.priceUsd) {
                    const p = parseFloat(bestPair.priceUsd);
                    document.getElementById('livePrice').textContent = p < 0.01
                        ? '$' + p.toFixed(8)
                        : '$' + p.toFixed(6);
                }
            }
        }
    } catch (e) {
        console.warn('DexScreener fetch failed:', e);
    }
}

// Fetch on load and every 30s
fetchLiveData();
setInterval(fetchLiveData, 30000);

// ===== Scroll Animations =====
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'all 0.6s ease';
    observer.observe(section);
});

// Don't animate hero (already visible)
const hero = document.querySelector('.hero');
if (hero) { hero.style.opacity = '1'; hero.style.transform = 'none'; }

// ===== ANIMATED BACKGROUND (Particles + Constellation) =====
(function() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], mouse = { x: null, y: null };

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track mouse for interactive effect
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 1.8 + 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
            // Random color between pink, purple, and cyan
            const colors = ['247,37,133', '139,92,246', '0,245,255'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.pulseSpeed = Math.random() * 0.02 + 0.01;
            this.pulseOffset = Math.random() * Math.PI * 2;
        }
        update(time) {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges
            if (this.x < 0) this.x = w;
            if (this.x > w) this.x = 0;
            if (this.y < 0) this.y = h;
            if (this.y > h) this.y = 0;

            // Mouse repulsion
            if (mouse.x !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const force = (120 - dist) / 120 * 0.8;
                    this.x += (dx / dist) * force;
                    this.y += (dy / dist) * force;
                }
            }

            // Pulsing opacity
            this.currentOpacity = this.opacity + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.15;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color},${this.currentOpacity})`;
            ctx.fill();
        }
    }

    // Create particles
    const particleCount = Math.min(80, Math.floor((w * h) / 15000));
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Draw connections
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 140) {
                    const opacity = (1 - dist / 140) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(139,92,246,${opacity})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        // Mouse connections
        if (mouse.x !== null) {
            for (let i = 0; i < particles.length; i++) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    const opacity = (1 - dist / 180) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(247,37,133,${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    // Animation loop
    let time = 0;
    function animate() {
        time++;
        ctx.clearRect(0, 0, w, h);

        // Update and draw particles
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });

        // Draw connection lines
        drawConnections();

        requestAnimationFrame(animate);
    }
    animate();
})();

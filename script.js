// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Copy Contract Address
function copyAddress() {
    const address = document.getElementById('contractAddress').textContent;
    navigator.clipboard.writeText(address).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = '📋 Copy';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = '📋 Copy';
        }, 2000);
    });
}

// Navbar scroll effect
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

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply animation to cards
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.about-card, .step-card, .community-card, .roadmap-item, .token-item, .ai-step'
    );

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s ease ${index * 0.08}s`;
        observer.observe(el);
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add particle effect to hero (lightweight)
function createParticle() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        background: ${['#f72585', '#8b5cf6', '#00f5ff', '#06d6a0'][Math.floor(Math.random() * 4)]};
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: 0;
        pointer-events: none;
        animation: particleFade 3s ease-in-out forwards;
    `;
    hero.appendChild(particle);
    
    setTimeout(() => particle.remove(), 3000);
}

// Add particle animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFade {
        0% { opacity: 0; transform: translateY(0) scale(0); }
        50% { opacity: 0.8; transform: translateY(-20px) scale(1); }
        100% { opacity: 0; transform: translateY(-40px) scale(0.5); }
    }
`;
document.head.appendChild(style);

// Spawn particles periodically
setInterval(createParticle, 500);

// ===== Tech Background Animation (Network Nodes + Circuit + Data Particles) =====
const canvas = document.getElementById('techCanvas');
const ctx = canvas.getContext('2d');

let width, height, nodes, dataParticles;
const isMobile = window.innerWidth < 768;
const NODE_COUNT = isMobile ? 40 : 80;
const PARTICLE_COUNT = isMobile ? 15 : 30;
const CONNECTION_DISTANCE = isMobile ? 120 : 180;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Node {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 1;
        this.color = ['#8b5cf6', '#00f5ff', '#f72585', '#06d6a0'][Math.floor(Math.random() * 4)];
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulsePhase += 0.02;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.5 + 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class DataParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.targetX = Math.random() * width;
        this.targetY = Math.random() * height;
        this.speed = Math.random() * 1.5 + 0.5;
        this.size = Math.random() * 3 + 1;
        this.color = ['#00f5ff', '#8b5cf6', '#f72585'][Math.floor(Math.random() * 3)];
        this.trail = [];
        this.maxTrail = 8;
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.reset();
            return;
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }

    draw() {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.4;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.size * 0.5, 0, Math.PI * 2);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONNECTION_DISTANCE) {
                const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
}

function drawCircuitGrid() {
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
    ctx.lineWidth = 1;

    for (let y = 0; y < height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    for (let x = 0; x < width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

function initTechBg() {
    resizeCanvas();
    nodes = Array.from({ length: NODE_COUNT }, () => new Node());
    dataParticles = Array.from({ length: PARTICLE_COUNT }, () => new DataParticle());
}

function animateTechBg() {
    ctx.clearRect(0, 0, width, height);

    drawCircuitGrid();
    drawConnections();

    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    dataParticles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animateTechBg);
}

window.addEventListener('resize', resizeCanvas);

initTechBg();
animateTechBg();

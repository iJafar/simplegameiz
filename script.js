const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('final-score');
const finalLevelElement = document.getElementById('final-level');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const BASE_SPEED = 4.5; // Start slower
const FLOOR_HEIGHT = 100;

// Game State
let animationId;
let gameSpeed = BASE_SPEED;
let score = 0;
let level = 1;
let isPlaying = false;
let frameCount = 0;

// Entities
let player;
let obstacles = [];
let particles = [];
let stars = [];

class Player {
    constructor() {
        this.width = 40;
        this.normalHeight = 40;
        this.crouchHeight = 20;
        this.height = this.normalHeight;
        this.x = 100;
        this.y = canvas.height - FLOOR_HEIGHT - this.height;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpsCount = 0;
        this.maxJumps = 2;
        this.isCrouching = false;
        this.color = '#00f3ff';
        this.trail = [];
    }

    jump() {
        if (this.jumpsCount < this.maxJumps && !this.isCrouching) {
            this.vy = JUMP_FORCE;
            this.isGrounded = false;
            this.jumpsCount++;
            createJumpParticles(this.x + this.width/2, this.y + this.height);
        }
    }

    crouch() {
        if (!this.isCrouching && this.isGrounded) {
            this.isCrouching = true;
            this.height = this.crouchHeight;
            this.y = canvas.height - FLOOR_HEIGHT - this.height;
        }
    }

    standUp() {
        if (this.isCrouching) {
            this.isCrouching = false;
            this.height = this.normalHeight;
            this.y = canvas.height - FLOOR_HEIGHT - this.height;
        }
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Floor collision
        if (this.y + this.height >= canvas.height - FLOOR_HEIGHT) {
            this.y = canvas.height - FLOOR_HEIGHT - this.height;
            this.vy = 0;
            this.isGrounded = true;
            this.jumpsCount = 0;
        }

        // Trail effect
        this.trail.push({x: this.x, y: this.y, h: this.height});
        if (this.trail.length > 10) {
            this.trail.shift();
        }
    }

    draw() {
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const opacity = i / this.trail.length;
            ctx.fillStyle = `rgba(0, 243, 255, ${opacity * 0.3})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillRect(pos.x, pos.y, this.width, pos.h);
        }

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        ctx.shadowBlur = 0;
    }
}

class Obstacle {
    constructor() {
        const rand = Math.random();
        this.passed = false;
        
        if (rand < 0.3) {
            // Flying Obstacle (requires ducking)
            this.isFlying = true;
            this.width = 30 + Math.random() * 20;
            this.color = '#ff00ff';
            const bottomY = canvas.height - FLOOR_HEIGHT - 25;
            this.y = 0;
            this.height = bottomY;
        } else if (rand < 0.6) {
            // Tall Ground Obstacle (requires double jump)
            this.isFlying = false;
            this.width = 40 + Math.random() * 20;
            this.height = 140 + Math.random() * 30; // 140 to 170px tall
            this.color = '#00ffaa'; // Neon green
            this.y = canvas.height - FLOOR_HEIGHT - this.height;
        } else {
            // Normal Ground Obstacle (requires single jump)
            this.isFlying = false;
            this.width = 30 + Math.random() * 20;
            this.height = 40 + Math.random() * 40; // 40 to 80px tall
            this.color = '#ff003c'; // Neon red
            this.y = canvas.height - FLOOR_HEIGHT - this.height;
        }
        this.x = canvas.width;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color, speedMulti) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10 * speedMulti;
        this.vy = (Math.random() - 0.5) * 10 * speedMulti;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * (canvas.height - FLOOR_HEIGHT);
        this.size = Math.random() * 2;
        this.speed = Math.random() * 2 + 0.5;
        this.opacity = Math.random();
    }

    update() {
        this.x -= this.speed * (gameSpeed / BASE_SPEED);
        if (this.x < 0) {
            this.x = canvas.width;
            this.y = Math.random() * (canvas.height - FLOOR_HEIGHT);
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }
}

function createJumpParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, '#00f3ff', 0.5));
    }
}

function createDeathParticles(x, y) {
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(x, y, '#ff003c', 1.5));
    }
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    if (player) {
        player.y = canvas.height - FLOOR_HEIGHT - player.height;
    }
}

function checkCollision(p, o) {
    const margin = 5;
    return (
        p.x + margin < o.x + o.width &&
        p.x + p.width - margin > o.x &&
        p.y + margin < o.y + o.height &&
        p.y + p.height - margin > o.y
    );
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    
    createDeathParticles(player.x + player.width/2, player.y + player.height/2);
    
    draw();
    
    finalScoreElement.innerText = Math.floor(score);
    finalLevelElement.innerText = level;
    gameOverScreen.classList.add('active');
}

function spawnObstacle() {
    const spawnRate = Math.max(60, 120 - gameSpeed * 5);
    if (frameCount % Math.floor(spawnRate) === 0) {
        obstacles.push(new Obstacle());
    }
}

function update() {
    if (!isPlaying) return;

    frameCount++;
    score += 0.1 * (gameSpeed / BASE_SPEED);
    scoreElement.innerText = Math.floor(score);

    let newLevel = 1;
    if (score >= 2500) newLevel = 5;
    else if (score >= 1000) newLevel = 4;
    else if (score >= 500) newLevel = 3;
    else if (score >= 100) newLevel = 2;
    
    if (newLevel > level) {
        level = newLevel;
        levelElement.innerText = level;
        celebrateLevelUp();
    }

    if (frameCount % 400 === 0 && gameSpeed < 15) {
        gameSpeed += 0.25; // Increase more smoothly
    }

    stars.forEach(star => star.update());
    player.update();
    spawnObstacle();

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update();

        if (checkCollision(player, obs)) {
            gameOver();
            return;
        }

        if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true;
            score += 10;
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => star.draw());

    ctx.beginPath();
    ctx.moveTo(0, canvas.height - FLOOR_HEIGHT);
    ctx.lineTo(canvas.width, canvas.height - FLOOR_HEIGHT);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff';
    ctx.stroke();
    ctx.shadowBlur = 0;

    const gridOffset = (frameCount * gameSpeed) % 40;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    for(let i = -gridOffset; i < canvas.width; i+= 40) {
        ctx.moveTo(i, canvas.height - FLOOR_HEIGHT);
        ctx.lineTo(i - 40, canvas.height);
    }
    ctx.stroke();

    obstacles.forEach(obs => obs.draw());
    
    if (isPlaying) player.draw();
    particles.forEach(p => p.draw());
}

function initGame() {
    resizeCanvas();
    player = new Player();
    obstacles = [];
    particles = [];
    score = 0;
    level = 1;
    gameSpeed = BASE_SPEED;
    frameCount = 0;
    scoreElement.innerText = '0';
    levelElement.innerText = '1';
    initStars();
    draw(); 
}

function startGame() {
    if (isPlaying) return; // Prevent multiple instances of the game loop
    initGame();
    isPlaying = true;
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    update();
}

function celebrateLevelUp() {
    // Show "LEVEL UP!" text
    const levelUpText = document.createElement('div');
    levelUpText.innerText = 'LEVEL ' + level;
    levelUpText.style.position = 'absolute';
    levelUpText.style.top = '30%';
    levelUpText.style.left = '50%';
    levelUpText.style.transform = 'translate(-50%, -50%)';
    levelUpText.style.color = '#ff00ff';
    levelUpText.style.fontSize = '80px';
    levelUpText.style.fontWeight = '900';
    levelUpText.style.fontFamily = 'Outfit, sans-serif';
    levelUpText.style.textShadow = '0 0 30px #ff00ff';
    levelUpText.style.pointerEvents = 'none';
    levelUpText.style.zIndex = '1000';
    levelUpText.style.animation = 'fadeOutUp 3.5s forwards';
    document.getElementById('ui-layer').appendChild(levelUpText);

    setTimeout(() => {
        if(levelUpText.parentNode) levelUpText.parentNode.removeChild(levelUpText);
    }, 3500);

    // Create confetti particles across the screen
    const colors = ['#00f3ff', '#ff003c', '#ff00ff', '#00ffaa'];
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, 1.5));
    }
}

window.addEventListener('resize', resizeCanvas);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') player.jump();
    if (e.code === 'KeyZ' || e.code === 'ArrowDown') player.crouch();
});

window.addEventListener('keyup', (e) => {
    if (!isPlaying) return;
    if (e.code === 'KeyZ' || e.code === 'ArrowDown') player.standUp();
});

const duckBtn = document.getElementById('duck-btn');

window.addEventListener('mousedown', (e) => {
    if (isPlaying) {
        if (e.target.tagName !== 'BUTTON' && e.target.id !== 'duck-btn') {
            player.jump();
        }
    }
});

window.addEventListener('touchstart', (e) => {
    if (isPlaying) {
        if (e.target.tagName !== 'BUTTON' && e.target.id !== 'duck-btn') {
            player.jump();
        }
    }
}, {passive: false});

const handleCrouchStart = (e) => {
    e.preventDefault();
    if (isPlaying) player.crouch();
};

const handleCrouchEnd = (e) => {
    e.preventDefault();
    if (isPlaying) player.standUp();
};

duckBtn.addEventListener('touchstart', handleCrouchStart, {passive: false});
duckBtn.addEventListener('touchend', handleCrouchEnd);
duckBtn.addEventListener('mousedown', handleCrouchStart);
duckBtn.addEventListener('mouseup', handleCrouchEnd);
duckBtn.addEventListener('mouseleave', handleCrouchEnd);

window.addEventListener('load', () => {
    resizeCanvas();
    initStars();
    draw();
});

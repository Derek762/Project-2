window.onload = function() {
// Cuphead-style Boss Fight Game
// Main game logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 40;
const PLAYER_SPEED = 8; // Faster player
const PLAYER_BULLET_SPEED = 14; // Faster player bullet
const BOSS_WIDTH = 120;
const BOSS_HEIGHT = 120;
const BOSS_START_X = 600;
const BOSS_START_Y = 100;
const BOSS_MAX_HEALTH = 250; // Reduced boss health (was 400)
const PLAYER_MAX_HEALTH = 5;

// Set arena size larger
canvas.width = 900;
canvas.height = 500;

// Game state
let keys = {};
let player = {
    x: 60,
    y: canvas.height - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#6cf',
    health: PLAYER_MAX_HEALTH,
    bullets: [],
    vy: 0,
    onGround: false
};

let boss = {
    x: canvas.width - BOSS_WIDTH - 60,
    y: canvas.height - BOSS_HEIGHT - 20,
    width: BOSS_WIDTH,
    height: BOSS_HEIGHT,
    color: '#f44',
    health: BOSS_MAX_HEALTH,
    attackCooldown: 0,
    attackType: null,
    attackTimer: 0,
    bullets: [],
    swordSlashing: false,
    vy: 0,
    onGround: false
};

// Homing projectile variables
let bossHomingProjectiles = [];
// Add explosion effect state
let bossHomingExplosions = [];

// EX attack state
let exCharge = 0;
const EX_CHARGE_MAX = 20; // Slower EX charge (was 10)
let exReady = false;
let exActive = false;

const GRAVITY = 1.5; // Faster fall
const GROUND_Y = canvas.height - 20;

// Platforms
const platforms = [
    { x: 180, y: 340, w: 120, h: 16 },
    { x: 400, y: 260, w: 120, h: 16 }
    // Removed the platform closest to the boss (the rightmost one)
];

// Gap variables for boss shoot pattern
let shootPatternGapY = 0;
let shootPatternGapHeight = PLAYER_HEIGHT * 3.5; // Even larger gap for easier dodging

function drawPlayer() {
    // Knight: blue armor, helmet, plume, shield
    ctx.save();
    // Body (armor)
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height/2 + 4, player.width/2, player.height/2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Helmet
    ctx.fillStyle = '#bfc9ca';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height/2 - 10, player.width/2.2, player.height/3.2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Helmet visor
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2 - 10, player.width/2.2, Math.PI*0.15, Math.PI*0.85);
    ctx.stroke();
    // Plume
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y + player.height/2 - 18);
    ctx.bezierCurveTo(player.x + player.width/2 + 2, player.y + player.height/2 - 28, player.x + player.width/2 - 8, player.y + player.height/2 - 32, player.x + player.width/2, player.y + player.height/2 - 22);
    ctx.stroke();
    // Eyes (visor slit)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2 - 6, player.y + player.height/2 - 10);
    ctx.lineTo(player.x + player.width/2 + 6, player.y + player.height/2 - 10);
    ctx.stroke();
    // Shield
    ctx.save();
    ctx.translate(player.x - 8, player.y + player.height/2 + 2);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#bfc9ca';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 13, 0, 0, 2*Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // Arms
    ctx.strokeStyle = '#bfc9ca';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x + 4, player.y + player.height/2);
    ctx.lineTo(player.x - 4, player.y + player.height/2 + 10);
    ctx.moveTo(player.x + player.width - 4, player.y + player.height/2);
    ctx.lineTo(player.x + player.width + 4, player.y + player.height/2 + 10);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2 - 6, player.y + player.height);
    ctx.lineTo(player.x + player.width/2 - 6, player.y + player.height + 10);
    ctx.moveTo(player.x + player.width/2 + 6, player.y + player.height);
    ctx.lineTo(player.x + player.width/2 + 6, player.y + player.height + 10);
    ctx.stroke();
    ctx.restore();
}

function drawBoss() {
    // Intimidating boss: darker body, big horns, fangs, glowing eyes, angry mouth
    ctx.save();
    // Body
    let grad = ctx.createRadialGradient(boss.x + boss.width/2, boss.y + boss.height/2, 30, boss.x + boss.width/2, boss.y + boss.height/2, boss.width/2);
    grad.addColorStop(0, '#a00');
    grad.addColorStop(1, '#222');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(boss.x + boss.width/2, boss.y + boss.height/2, boss.width/2, boss.height/2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Eyes (glowing)
    ctx.save();
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(boss.x + boss.width/2 - 22, boss.y + boss.height/2 - 18, 12, 16, 0, 0, 2*Math.PI);
    ctx.ellipse(boss.x + boss.width/2 + 22, boss.y + boss.height/2 - 18, 12, 16, 0, 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(boss.x + boss.width/2 - 22, boss.y + boss.height/2 - 14, 5, 0, 2*Math.PI);
    ctx.arc(boss.x + boss.width/2 + 22, boss.y + boss.height/2 - 14, 5, 0, 2*Math.PI);
    ctx.fill();
    // Big horns
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width/2 - 36, boss.y + boss.height/2 - 44);
    ctx.bezierCurveTo(boss.x + boss.width/2 - 60, boss.y + boss.height/2 - 80, boss.x + boss.width/2 - 10, boss.y + boss.height/2 - 80, boss.x + boss.width/2 - 8, boss.y + boss.height/2 - 44);
    ctx.moveTo(boss.x + boss.width/2 + 36, boss.y + boss.height/2 - 44);
    ctx.bezierCurveTo(boss.x + boss.width/2 + 60, boss.y + boss.height/2 - 80, boss.x + boss.width/2 + 10, boss.y + boss.height/2 - 80, boss.x + boss.width/2 + 8, boss.y + boss.height/2 - 44);
    ctx.stroke();
    // Fangs
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width/2 - 10, boss.y + boss.height/2 + 38);
    ctx.lineTo(boss.x + boss.width/2 - 14, boss.y + boss.height/2 + 54);
    ctx.lineTo(boss.x + boss.width/2 - 4, boss.y + boss.height/2 + 44);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width/2 + 10, boss.y + boss.height/2 + 38);
    ctx.lineTo(boss.x + boss.width/2 + 14, boss.y + boss.height/2 + 54);
    ctx.lineTo(boss.x + boss.width/2 + 4, boss.y + boss.height/2 + 44);
    ctx.closePath();
    ctx.fill();
    // Angry mouth
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.x + boss.width/2, boss.y + boss.height/2 + 32, 22, Math.PI*0.15, Math.PI*0.85, false);
    ctx.stroke();
    ctx.restore();
}

function drawHealthBars() {
    // Player
    ctx.save();
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Player', 20, 30);
    // Player health bar background
    ctx.fillStyle = '#222';
    ctx.fillRect(90, 40, PLAYER_MAX_HEALTH * 30, 18);
    // Player health bar foreground (rounded)
    ctx.fillStyle = '#6cf';
    ctx.beginPath();
    // Clamp player.health to not go below 0
    let playerHealthClamped = Math.max(0, player.health);
    ctx.moveTo(90 + 9, 40);
    ctx.lineTo(90 + playerHealthClamped * 30 - 9, 40);
    ctx.quadraticCurveTo(90 + playerHealthClamped * 30, 40, 90 + playerHealthClamped * 30, 40 + 9);
    ctx.lineTo(90 + playerHealthClamped * 30, 40 + 9);
    ctx.quadraticCurveTo(90 + playerHealthClamped * 30, 40 + 18, 90 + playerHealthClamped * 30 - 9, 40 + 18);
    ctx.lineTo(90 + 9, 40 + 18);
    ctx.quadraticCurveTo(90, 40 + 18, 90, 40 + 9);
    ctx.lineTo(90, 40 + 9);
    ctx.quadraticCurveTo(90, 40, 90 + 9, 40);
    ctx.closePath();
    ctx.fill();
    // Player health bar border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 40, PLAYER_MAX_HEALTH * 30, 18);
    ctx.restore();

    // Boss
    ctx.save();
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Boss', 600, 30);
    // Boss health bar background
    // Place boss bar at top right, with margin, and reduce width to fit
    const bossBarWidth = 200;
    const bossBarX = canvas.width - bossBarWidth - 30;
    const bossBarY = 40;
    ctx.fillStyle = '#222';
    ctx.fillRect(bossBarX, bossBarY, bossBarWidth, 18);
    // Boss health bar foreground (gradient, rounded)
    let grad = ctx.createLinearGradient(bossBarX, bossBarY, bossBarX + bossBarWidth, bossBarY);
    grad.addColorStop(0, '#f44');
    grad.addColorStop(1, '#fa0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bossBarX + 9, bossBarY);
    ctx.lineTo(bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth) - 9, bossBarY);
    ctx.quadraticCurveTo(bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth), bossBarY, bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth), bossBarY + 9);
    ctx.lineTo(bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth), bossBarY + 9);
    ctx.quadraticCurveTo(bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth), bossBarY + 18, bossBarX + Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth) - 9, bossBarY + 18);
    ctx.lineTo(bossBarX + 9, bossBarY + 18);
    ctx.quadraticCurveTo(bossBarX, bossBarY + 18, bossBarX, bossBarY + 9);
    ctx.lineTo(bossBarX, bossBarY + 9);
    ctx.quadraticCurveTo(bossBarX, bossBarY, bossBarX + 9, bossBarY);
    ctx.closePath();
    ctx.fill();
    // Boss health bar border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(bossBarX, bossBarY, bossBarWidth, 18);
    ctx.restore();
}

function handleInput() {
    if (keys['ArrowLeft'] && player.x > 0) player.x -= PLAYER_SPEED;
    if (keys['ArrowRight'] && player.x + player.width < canvas.width) player.x += PLAYER_SPEED;
}

window.addEventListener('keydown', e => {
    if (!gameOver) {
        keys[e.key] = true;
        // Shoot with 'Z'
        if ((e.key === 'z' || e.key === 'Z')) {
            if (player.bullets.length < 3) {
                shootPlayerBullet();
            }
        }
        // EX attack with 'X'
        if ((e.key === 'x' || e.key === 'X') && exReady && !exActive) {
            shootEXAttack();
            exReady = false;
            exCharge = 0;
            exActive = true;
        }
        // Jump with ArrowUp, only on keydown and only if on ground
        if (e.key === 'ArrowUp' && player.onGround) {
            player.vy = JUMP_VELOCITY;
            player.onGround = false;
            jumpHeld = true;
            glideActive = false;
            glideFrames = 0;
        }
        // Drop through platform with ArrowDown
        if (e.key === 'ArrowDown' && player.onGround) {
            // Only allow drop if standing on a platform (not ground)
            let onPlatform = false;
            platforms.forEach(p => {
                if (
                    player.x + player.width > p.x &&
                    player.x < p.x + p.w &&
                    Math.abs(player.y + player.height - p.y) < 2 // standing on platform
                ) {
                    onPlatform = true;
                }
            });
            if (onPlatform) {
                droppingThroughPlatform = true;
                dropBuffer = 10; // frames to ignore platform collision
                player.onGround = false;
            }
        }
    }
    if ((e.key === 'r' || e.key === 'R') && gameOver) {
        restartGame();
    }
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'ArrowUp') {
        jumpHeld = false;
    }
});

// Prevent arrow keys from scrolling the page
window.addEventListener('keydown', function(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
    }
}, { passive: false });

// Jump height control
// Calculate jump velocity so player can reach first platform (platform at y=340, player starts at y=440)
const JUMP_VELOCITY = -22; // Increased jump height to reach first platform
let jumpHeld = false;
let glideActive = false;
let glideFrames = 0;

// Glide control
const GLIDE_GRAVITY = 0.18; // even slower fall when gliding
const GLIDE_FRAMES = 32; // glide lasts longer

// Dropping Through Platforms:
// When the player presses the Down Arrow (ArrowDown) while standing on a platform,
// the player temporarily ignores platform collisions and falls through.
// This is controlled by the variables `droppingThroughPlatform` (true/false) and `dropBuffer` (frames to ignore collision).
// After a short duration (`dropBuffer` frames), platform collision is re-enabled.
let droppingThroughPlatform = false;
let dropBuffer = 0;

function updatePhysics() {
    // Remove variable jump height logic, just apply gravity
    let gravityToApply = GRAVITY;
    if (player.vy > 0 && jumpHeld) {
        if (!glideActive) {
            glideActive = true;
            glideFrames = 0;
        }
        if (glideFrames < GLIDE_FRAMES) {
            gravityToApply = GLIDE_GRAVITY;
            glideFrames++;
        }
    } else {
        glideActive = false;
        glideFrames = 0;
    }
    // Player gravity
    player.vy += gravityToApply;
    player.y += player.vy;
    if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.onGround = true;
        glideActive = false;
    } else {
        player.onGround = false;
    }
    // Platform collision for player
    let onAnyPlatform = false;
    if (!droppingThroughPlatform) {
        platforms.forEach(p => {
            if (
                player.x + player.width > p.x &&
                player.x < p.x + p.w &&
                player.y + player.height > p.y &&
                player.y + player.height - player.vy <= p.y
            ) {
                player.y = p.y - player.height;
                player.vy = 0;
                onAnyPlatform = true;
            }
        });
    }
    if (onAnyPlatform && player.vy >= 0) {
        player.onGround = true;
    }
    if (droppingThroughPlatform) {
        dropBuffer--;
        if (dropBuffer <= 0) {
            droppingThroughPlatform = false;
        }
    }
    // Boss gravity
    boss.vy += GRAVITY;
    boss.y += boss.vy;
    if (boss.y + boss.height >= GROUND_Y) {
        boss.y = GROUND_Y - boss.height;
        boss.vy = 0;
        boss.onGround = true;
    } else {
        boss.onGround = false;
    }
    // Platform collision for boss (separate variable)
    let bossOnAnyPlatform = false;
    platforms.forEach(p => {
        if (
            boss.x + boss.width > p.x &&
            boss.x < p.x + p.w &&
            boss.y + boss.height > p.y &&
            boss.y + boss.height - boss.vy <= p.y
        ) {
            boss.y = p.y - boss.height;
            boss.vy = 0;
            bossOnAnyPlatform = true;
        }
    });
    if (bossOnAnyPlatform && boss.vy >= 0) {
        boss.onGround = true;
    }
}

function shootPlayerBullet() {
    player.bullets.push({
        x: player.x + player.width,
        y: player.y + player.height / 2 - 4,
        w: 12,
        h: 8,
        speed: PLAYER_BULLET_SPEED
    });
}

function shootEXAttack() {
    // Big, fast, powerful projectile
    player.bullets.push({
        x: player.x + player.width,
        y: player.y + player.height / 2 - 16,
        w: 48,
        h: 32,
        speed: PLAYER_BULLET_SPEED + 6,
        ex: true
    });
}

function updatePlayerBullets() {
    player.bullets.forEach((b, i) => {
        b.x += b.speed;
        // Remove if off screen
        if (b.x > canvas.width) {
            player.bullets.splice(i, 1);
        }
        // Collision with boss
        else if (
            b.x < boss.x + boss.width &&
            b.x + b.w > boss.x &&
            b.y < boss.y + boss.height &&
            b.y + b.h > boss.y &&
            boss.health > 0
        ) {
            if (b.ex) {
                boss.health -= 30; // EX does even more damage now
                exActive = false;
            } else {
                boss.health -= 2;
                exCharge = Math.min(EX_CHARGE_MAX, exCharge + 1);
            }
            // Only set exReady if exCharge reaches max and not already ready
            if (exCharge >= EX_CHARGE_MAX && !exReady) exReady = true;
            player.bullets.splice(i, 1);
        }
    });
}

function updateBossBullets() {
    boss.bullets.forEach((b, i) => {
        // Use direction property to determine movement
        b.x += (b.direction || -1) * b.speed;
        // Remove if off screen
        if (b.x > canvas.width || b.x + b.w < 0) {
            boss.bullets.splice(i, 1);
        }
        // Collision with player
        else if (
            b.x < player.x + player.width &&
            b.x + b.w > player.x &&
            b.y < player.y + player.height &&
            b.y + b.h > player.y &&
            player.health > 0
        ) {
            player.health -= 1;
            boss.bullets.splice(i, 1);
        }
    });
}

function updateBossAimingProjectiles() {
    const MAX_AIMING_SPEED = 18;
    for (let i = bossAimingProjectiles.length - 1; i >= 0; i--) {
        let proj = bossAimingProjectiles[i];
        // Add age and speed if not present
        if (proj.age === undefined) proj.age = 0;
        if (proj.speed === undefined) proj.speed = 11;
        proj.age++;
        // Gradually increase speed up to a cap
        proj.speed = Math.min(MAX_AIMING_SPEED, proj.speed + 0.18);
        // Homing strength reduced for blue aiming projectiles
        let homingStrength = 0.003; // Reduced homing
        // Add homing effect: slightly adjust velocity toward player each frame
        let px = player.x + player.width / 2;
        let py = player.y + player.height / 2;
        let cx = proj.x + proj.w / 2;
        let cy = proj.y + proj.h / 2;
        let dx = px - cx;
        let dy = py - cy;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            let targetVx = (dx / dist) * proj.speed;
            let targetVy = (dy / dist) * proj.speed;
            proj.vx = proj.vx * (1 - homingStrength) + targetVx * homingStrength;
            proj.vy = proj.vy * (1 - homingStrength) + targetVy * homingStrength;
        }
        proj.x += proj.vx;
        proj.y += proj.vy;
        // Remove if off screen
        if (
            proj.x > canvas.width ||
            proj.x + proj.w < 0 ||
            proj.y > canvas.height ||
            proj.y + proj.h < 0
        ) {
            bossAimingProjectiles.splice(i, 1);
            continue;
        }
        // Collision with player
        if (
            proj.x < player.x + player.width &&
            proj.x + proj.w > player.x &&
            proj.y < player.y + player.height &&
            proj.y + proj.h > player.y &&
            player.health > 0
        ) {
            player.health -= 1.5; // Heavy damage
            bossAimingProjectiles.splice(i, 1);
        }
    }
}

function updateBossHomingProjectiles() {
    bossHomingProjectiles.forEach((proj, i) => {
        // Homing logic (fixed speed, much faster, lasts until end of next attack)
        let dx = (player.x + player.width / 2) - (proj.x + proj.w / 2);
        let dy = (player.y + player.height / 2) - (proj.y + proj.h / 2);
        let dist = Math.sqrt(dx * dx + dy * dy);
        let homingStrength = 0.003; // Keep homing as before
        let speed = 6.5; // Much faster, fixed speed
        proj.speed = speed;
        if (dist !== 0) {
            let targetVx = (dx / dist) * speed;
            let targetVy = (dy / dist) * speed;
            proj.vx = (proj.vx || 0) * (1 - homingStrength) + targetVx * homingStrength;
            proj.vy = (proj.vy || 0) * (1 - homingStrength) + targetVy * homingStrength;
        }
        proj.x += proj.vx;
        proj.y += proj.vy;
        // No lifetime decrement here; removal is handled after the next attack
        // Remove if off screen
        if (
            proj.x > canvas.width ||
            proj.x + proj.w < 0 ||
            proj.y > canvas.height ||
            proj.y + proj.h < 0
        ) {
            bossHomingProjectiles.splice(i, 1);
            return;
        }
        // Collision with player
        if (
            proj.x < player.x + player.width &&
            proj.x + proj.w > player.x &&
            proj.y < player.y + player.height &&
            proj.y + proj.h > player.y &&
            player.health > 0
        ) {
            bossHomingExplosions.push({x: proj.x + proj.w/2, y: proj.y + proj.h/2, r: 80, timer: 0}); // Larger explosion radius
            player.health -= 0.1; // Even less damage
            bossHomingProjectiles.splice(i, 1);
            homingBallPersistent = false;
            homingBallAttackCount = 0;
            return;
        }
    });
}

function updateBossHomingExplosions() {
    bossHomingExplosions.forEach((exp, i) => {
        exp.timer++;
        // Damage player if in radius (only first 10 frames)
        if (exp.timer < 10) {
            let dx = (player.x + player.width/2) - exp.x;
            let dy = (player.y + player.height/2) - exp.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < exp.r) {
                player.health -= 0.2; // Even less explosion damage
            }
        }
        if (exp.timer > 20) bossHomingExplosions.splice(i, 1);
    });
}

function drawBossHomingProjectiles() {
    bossHomingProjectiles.forEach(proj => {
        ctx.save();
        ctx.shadowColor = '#fa0';
        ctx.shadowBlur = 18;
        let grad = ctx.createRadialGradient(proj.x + proj.w/2, proj.y + proj.h/2, 4, proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#fa0');
        grad.addColorStop(1, '#f44');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    });
}

function drawBossAimingProjectiles() {
    ctx.save();
    bossAimingProjectiles.forEach(proj => {
        ctx.save();
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 16;
        let grad = ctx.createRadialGradient(proj.x + proj.w/2, proj.y + proj.h/2, 2, proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#0ff');
        grad.addColorStop(1, '#09c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(
            proj.x + proj.w / 2,
            proj.y + proj.h / 2,
            proj.w / 2, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();
}

function drawBossHomingExplosions() {
    bossHomingExplosions.forEach(exp => {
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - exp.timer/20);
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0';
        ctx.fill();
        ctx.restore();
    });
}

function drawPlatforms() {
    ctx.save();
    platforms.forEach(p => {
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.w, p.h);
        ctx.fill();
        ctx.stroke();
    });
    ctx.restore();
}

// Track if player is in boss attack zones for continuous damage
let swordSlashActive = false;
let swordSlashPosition = 'bottom';
let homingBallPersistent = false;
let homingBallAttackCount = 0;
let shootPatternIndex = 0;

// Boss windup state
let bossWindup = false;
let bossWindupType = null;
let bossWindupTimer = 0;
// Add aiming attack state
let bossAimingProjectiles = [];

// Fix: define gameOver and fightStarted before use
let gameOver = false;
let fightStarted = false;

// Fix: define countdownTimer and countdown before use
let countdown = 3;
let countdownTimer = 0;

function checkBossAttackDamage() {
    // Sword slash zone
    if (swordSlashActive) {
        // Find the lowest platform
        let lowestPlatform = platforms.reduce((a, b) => (a.y > b.y ? a : b));
        if (swordSlashPosition === 'bottom') {
            // Hit everything below the lowest platform
            if (
                player.y > lowestPlatform.y + lowestPlatform.h - 1 &&
                player.y < canvas.height
            ) {
                player.health -= 0.25; // Less sword slash damage
            }
        } else {
            // Hit everything above the lowest platform
            if (
                player.y + player.height < lowestPlatform.y + 1 &&
                player.y + player.height > 0
            ) {
                player.health -= 0.25; // Less sword slash damage
            }
        }
    }
}

function bossAttack() {
    if (boss.attackCooldown > 0) {
        boss.attackCooldown--;
        swordSlashActive = false;
        bossWindup = false;
        return;
    }
    if (!boss.attackType && !bossWindup) {
        if (bossHomingProjectiles.length > 0 && homingBallPersistent) {
            homingBallAttackCount++;
            if (homingBallAttackCount > 1) {
                bossHomingProjectiles = [];
                homingBallPersistent = false;
                homingBallAttackCount = 0;
            }
        }
        let attacks = ['sword', 'homing', 'aim'];
        // Prevent homing attack if a homing projectile is still on screen
        if (bossHomingProjectiles.length > 0) {
            attacks = attacks.filter(a => a !== 'homing');
        }
        if (bossHomingProjectiles.length > 0) {
            attacks = attacks.filter(a => a !== 'sword');
        }
        bossWindupType = attacks[Math.floor(Math.random() * attacks.length)];
        bossWindup = true;
        bossWindupTimer = 0;
        if (bossWindupType === 'sword') {
            if (bossHomingProjectiles.length > 0) {
                swordSlashPosition = 'bottom';
            } else {
                swordSlashPosition = Math.random() < 0.5 ? 'top' : 'bottom';
            }
        }
        return;
    }
    if (bossWindup) {
        bossWindupTimer++;
        if (bossWindupTimer >= 40) {
            boss.attackType = bossWindupType;
            boss.attackTimer = 0;
            bossWindup = false;
        }
        swordSlashActive = false;
        return;
    }
    if (boss.attackType === 'sword') {
        if (boss.attackTimer === 0) {
            boss.swordSlashing = true;
        }
        swordSlashActive = boss.attackTimer > 20 && boss.attackTimer <= 60;
        boss.attackTimer++;
        if (boss.attackTimer > 60) {
            boss.swordSlashing = false;
            boss.attackType = null;
            boss.attackCooldown = 80;
            swordSlashActive = false;
        }
    } else if (boss.attackType === 'homing') {
        if (boss.attackTimer === 0 && bossHomingProjectiles.length === 0) {
            bossHomingProjectiles.push({
                x: boss.x + boss.width / 2 - 16,
                y: boss.y + boss.height / 2 - 16,
                w: 32,
                h: 32,
                speed: 6.5, // much faster
                vx: 0,
                vy: 0,
                // No lifetime property needed
            });
            homingBallPersistent = true;
            homingBallAttackCount = 0;
        }
        boss.attackTimer++;
        if (boss.attackTimer > 120) {
            boss.attackType = null;
            boss.attackCooldown = 80;
        }
    } else if (boss.attackType === 'aim') {
        // Improved aiming attack: fire 3 fast projectiles in sequence
        if (boss.attackTimer % 8 === 0 && boss.attackTimer < 24) {
            let bx = boss.x + boss.width / 2 - 10;
            let by = boss.y + boss.height / 2 - 10;
            let px = player.x + player.width / 2;
            let py = player.y + player.height / 2;
            let dx = px - bx;
            let dy = py - by;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let speed = 11;
            bossAimingProjectiles.push({
                x: bx,
                y: by,
                w: 20,
                h: 20,
                vx: (dx / dist) * speed,
                vy: (dy / dist) * speed
            });
        }
        boss.attackTimer++;
        if (boss.attackTimer > 32) {
            boss.attackType = null;
            boss.attackCooldown = 70;
        }
    }
}

function drawSwordSlash() {
    if (boss.swordSlashing) {
        ctx.save();
        // Improved sword slash look: animated energy wave
        // Find the lowest platform
        let lowestPlatform = platforms.reduce((a, b) => (a.y > b.y ? a : b));
        let slashY, slashHeight, textY;
        if (swordSlashPosition === 'bottom') {
            slashY = lowestPlatform.y + lowestPlatform.h;
            slashHeight = canvas.height - slashY;
            textY = slashY + 40;
        } else {
            slashY = 0;
            slashHeight = lowestPlatform.y;
            textY = lowestPlatform.y - 20;
        }
        // Animated energy wave
        let time = Date.now() / 120;
        for (let i = 0; i < 5; i++) {
            ctx.globalAlpha = 0.18 - i * 0.03;
            ctx.fillStyle = i % 2 === 0 ? '#bfc9ca' : '#6cf';
            ctx.beginPath();
            ctx.moveTo(0, slashY + i * 6 + Math.sin(time + i) * 8);
            ctx.lineTo(canvas.width, slashY + i * 6 + Math.sin(time + i + 1) * 8);
            ctx.lineTo(canvas.width, slashY + slashHeight + i * 6);
            ctx.lineTo(0, slashY + slashHeight + i * 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SWORD SLASH!', canvas.width / 2, textY);
        ctx.restore();
    }
}

// Draws a visual warning when the boss is winding up for an attack
function drawBossWindup() {
    if (typeof bossWindup !== 'undefined' && bossWindup) {
        ctx.save();
        // Glowing red outline
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 32;
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(255,0,0,0.7)';
        ctx.beginPath();
        ctx.ellipse(boss.x + boss.width/2, boss.y + boss.height/2, boss.width/2 + 10, boss.height/2 + 10, 0, 0, 2*Math.PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Choose color based on attack type
        let markColor = '#ff0'; // default yellow
        if (bossWindupType === 'sword') markColor = '#bbb'; // gray for sword slash
        else if (bossWindupType === 'homing') markColor = '#fa0'; // orange/yellow
        else if (bossWindupType === 'aim') markColor = '#0ff'; // cyan
        // Draw warning text above boss
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = markColor;
        ctx.textAlign = 'center';
        ctx.fillText('!!', boss.x + boss.width/2, boss.y - 10);
        ctx.restore();
    }
}

function drawBullets() {
    // Draw player bullets
    player.bullets.forEach(b => {
        ctx.save();
        if (b.ex) {
            // EX attack: big, glowing, gold
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 18;
            let grad = ctx.createRadialGradient(b.x + b.w/2, b.y + b.h/2, 4, b.x + b.w/2, b.y + b.h/2, b.w/2);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, '#ffd700');
            grad.addColorStop(1, '#fa0');
            ctx.fillStyle = grad;
        } else {
            // Normal bullet: blue, glowing
            ctx.shadowColor = '#6cf';
            ctx.shadowBlur = 10;
            let grad = ctx.createRadialGradient(b.x + b.w/2, b.y + b.h/2, 2, b.x + b.w/2, b.y + b.h/2, b.w/2);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, '#6cf');
            grad.addColorStop(1, '#3498db');
            ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.ellipse(b.x + b.w/2, b.y + b.h/2, b.w/2, b.h/2, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();
    });
    // Draw boss bullets (if any)
    boss.bullets.forEach(b => {
        ctx.save();
        ctx.shadowColor = '#f44';
        ctx.shadowBlur = 10;
        let grad = ctx.createRadialGradient(b.x + b.w/2, b.y + b.h/2, 2, b.x + b.w/2, b.y + b.h/2, b.w/2);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#f44');
        grad.addColorStop(1, '#a00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(b.x + b.w/2, b.y + b.h/2, b.w/2, b.h/2, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();
    });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!fightStarted) {
        countdownTimer++;
        if (countdownTimer % 60 === 0 && countdown > 0) {
            countdown--;
        }
        if (countdown === 0 && countdownTimer > 60 * 1.5) {
            fightStarted = true;
        }
    }
    if (!gameOver && fightStarted) {
        handleInput();
        updatePhysics();
        updatePlayerBullets();
        updateBossBullets();
        updateBossHomingProjectiles();
        updateBossHomingExplosions();
        updateBossAimingProjectiles(); // update aiming attack
        bossAttack();
        checkBossAttackDamage();
    }
    drawPlatforms();
    drawPlayer();
    drawBoss();
    drawBullets();
    drawSwordSlash();
    drawBossHomingProjectiles();
    drawBossHomingExplosions();
    drawBossAimingProjectiles(); // draw aiming attack
    drawBossWindup();
    drawHealthBars();
    drawCountdown();
    drawEXChargeBar();
    checkGameOver();
    requestAnimationFrame(gameLoop);
}

gameLoop();
};

/*
INSTRUCTIONS:
- Arrow keys: Move and jump (Up to jump, Down to drop through platforms)
- Z: Shoot (max 3 bullets on screen)
- X: EX attack (when EX bar is full)
- R: Restart after game over/win

BOSS ATTACKS:
- Sword Slash: Covers top or bottom half of arena, now with animated energy wave effect.
- Orange Homing Ball: Much faster, fixed speed, lasts until the end of the next boss attack (not just a timer).
- Blue Aiming Attack: Fires 3 projectiles in sequence, each with reduced homing.
*/

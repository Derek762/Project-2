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

function drawPlayer() {
    // Improved player: blue body, white face, eyes, arms, legs
    ctx.save();
    // Body
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height/2 + 4, player.width/2, player.height/2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Face
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height/2 - 6, player.width/2.2, player.height/3.2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(player.x + player.width/2 - 5, player.y + player.height/2 - 8, 2, 0, 2*Math.PI);
    ctx.arc(player.x + player.width/2 + 5, player.y + player.height/2 - 8, 2, 0, 2*Math.PI);
    ctx.fill();
    // Arms
    ctx.strokeStyle = '#fff';
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
    // Improved boss: big red body, yellow eyes, horns, mouth
    ctx.save();
    // Body
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.ellipse(boss.x + boss.width/2, boss.y + boss.height/2, boss.width/2, boss.height/2, 0, 0, 2*Math.PI);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(boss.x + boss.width/2 - 22, boss.y + boss.height/2 - 18, 10, 14, 0, 0, 2*Math.PI);
    ctx.ellipse(boss.x + boss.width/2 + 22, boss.y + boss.height/2 - 18, 10, 14, 0, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(boss.x + boss.width/2 - 22, boss.y + boss.height/2 - 14, 4, 0, 2*Math.PI);
    ctx.arc(boss.x + boss.width/2 + 22, boss.y + boss.height/2 - 14, 4, 0, 2*Math.PI);
    ctx.fill();
    // Horns
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width/2 - 32, boss.y + boss.height/2 - 40);
    ctx.lineTo(boss.x + boss.width/2 - 44, boss.y + boss.height/2 - 60);
    ctx.moveTo(boss.x + boss.width/2 + 32, boss.y + boss.height/2 - 40);
    ctx.lineTo(boss.x + boss.width/2 + 44, boss.y + boss.height/2 - 60);
    ctx.stroke();
    // Mouth
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(boss.x + boss.width/2, boss.y + boss.height/2 + 24, 18, 0, Math.PI, false);
    ctx.stroke();
    ctx.restore();
}

function drawHealthBars() {
    // Player
    ctx.save();
    ctx.font = '20px Arial';
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
    ctx.font = '20px Arial';
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

function updateBossHomingProjectiles() {
    bossHomingProjectiles.forEach((proj, i) => {
        // Homing logic
        let dx = (player.x + player.width / 2) - (proj.x + proj.w / 2);
        let dy = (player.y + player.height / 2) - (proj.y + proj.h / 2);
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist !== 0) {
            dx /= dist;
            dy /= dist;
        }
        proj.vx = dx * proj.speed; // Slower, more dogfight style
        proj.vy = dy * proj.speed;
        proj.x += proj.vx;
        proj.y += proj.vy;
        // Timeout after 8 seconds (unless persistent through next attack)
        if (!homingBallPersistent) {
            proj.lifetime--;
            if (proj.lifetime <= 0) {
                bossHomingProjectiles.splice(i, 1);
                return;
            }
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
        // REMOVE: Collision with platforms (ball now passes through platforms)
        // REMOVE: Collision with walls (ball now passes through walls)
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
    ctx.fillStyle = '#fa0';
    bossHomingProjectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, 2 * Math.PI);
        ctx.fill();
    });
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

// Track if player is in boss attack zones for continuous damage
let swordSlashActive = false;

// Add windup state for boss attacks
let bossWindup = false;
let bossWindupType = null;
let bossWindupTimer = 0;
const WINDUP_DURATION = 40;

// Boss shooting pattern (now covers the whole screen except for a gap)
let shootPatternGapY = 0;
let shootPatternGapHeight = PLAYER_HEIGHT * 3.5; // Even larger gap for easier dodging

function bossAttack() {
    if (boss.attackCooldown > 0) {
        boss.attackCooldown--;
        swordSlashActive = false;
        bossWindup = false;
        return;
    }
    if (!boss.attackType && !bossWindup) {
        // If a persistent homing ball exists, increment attack count
        if (bossHomingProjectiles.length > 0 && homingBallPersistent) {
            homingBallAttackCount++;
            // Remove the ball at the end of the next attack
            if (homingBallAttackCount > 1) {
                bossHomingProjectiles = [];
                homingBallPersistent = false;
                homingBallAttackCount = 0;
            }
        }
        // Randomly pick attack and start windup
        let attacks = ['shoot', 'sword', 'homing'];
        // If a homing projectile is on screen, prevent 'sword' (top) as next attack
        if (bossHomingProjectiles.length > 0) {
            // Only allow 'sword' if it would be 'bottom' (set in windup below), so remove 'sword' from attacks for now
            attacks = attacks.filter(a => a !== 'sword');
        }
        bossWindupType = attacks[Math.floor(Math.random() * attacks.length)];
        bossWindup = true;
        bossWindupTimer = 0;
        // Set swordSlashPosition at the start of windup for sword
        if (bossWindupType === 'sword') {
            // If a homing projectile is on screen, force 'bottom' slash
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
            // No gap for reverted shooting attack
        }
        swordSlashActive = false;
        return;
    }
    if (boss.attackType === 'shoot') {
        swordSlashActive = false;
        let shootInterval = 22; // Even slower shooting
        if (boss.attackTimer % shootInterval === 0) {
            let projectileHeight = 40;
            // Restore original: fill the screen with bullets except for the gap
            for (let y = 0; y < platforms[0].y; y += projectileHeight) {
                if (
                    y + projectileHeight > shootPatternGapY &&
                    y < shootPatternGapY + shootPatternGapHeight
                ) {
                    continue;
                }
                boss.bullets.push({
                    x: canvas.width + 48, // Start just off the right edge
                    y: y,
                    w: 48,
                    h: projectileHeight,
                    speed: 3.5, // Slower boss bullet, moves left
                    direction: -1 // Leftward
                });
            }
        }
        boss.attackTimer++;
        if (boss.attackTimer > 36) { // Shorter attack duration
            boss.attackType = null;
            boss.attackCooldown = 60; // Longer cooldown
        }
    } else if (boss.attackType === 'sword') {
        if (boss.attackTimer === 0) {
            boss.swordSlashing = true;
            // swordSlashPosition is already set during windup
        }
        swordSlashActive = boss.attackTimer > 20 && boss.attackTimer <= 60; // Slower windup/active
        boss.attackTimer++;
        if (boss.attackTimer > 60) {
            boss.swordSlashing = false;
            boss.attackType = null;
            boss.attackCooldown = 80; // Longer cooldown
            swordSlashActive = false;
        }
    } else if (boss.attackType === 'homing') {
        // Only one homing ball at a time, fire at the start of the attack
        if (boss.attackTimer === 0 && bossHomingProjectiles.length === 0) {
            bossHomingProjectiles.push({
                x: boss.x + boss.width / 2 - 16,
                y: boss.y + boss.height / 2 - 16,
                w: 32,
                h: 32,
                speed: 2.5, // Slow for dogfight style
                vx: 0,
                vy: 0,
                lifetime: 480 // 8 seconds at 60 FPS (lasts through next attack)
            });
            homingBallPersistent = true;
            homingBallAttackCount = 0;
        }
        boss.attackTimer++;
        // End attack after a while, but let the ball persist
        if (boss.attackTimer > 120) {
            boss.attackType = null;
            boss.attackCooldown = 80;
        }
    }
}

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

function drawSwordSlash() {
    if (boss.swordSlashing) {
        ctx.fillStyle = 'rgba(200,200,255,0.4)';
        // Find the lowest platform
        let lowestPlatform = platforms.reduce((a, b) => (a.y > b.y ? a : b));
        if (swordSlashPosition === 'bottom') {
            // Cover everything below the lowest platform
            ctx.fillRect(0, lowestPlatform.y + lowestPlatform.h, canvas.width, canvas.height - (lowestPlatform.y + lowestPlatform.h));
            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.fillText('SWORD SLASH!', canvas.width / 2 - 90, lowestPlatform.y + lowestPlatform.h + 40);
        } else {
            // Cover everything above the lowest platform
            ctx.fillRect(0, 0, canvas.width, lowestPlatform.y);
            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.fillText('SWORD SLASH!', canvas.width / 2 - 90, lowestPlatform.y - 20);
        }
    }
}

function drawBossWindup() {
    if (gameOver) return; // Do not draw windup text if game is over
    if (bossWindup) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 6;
        ctx.strokeRect(boss.x - 8, boss.y - 8, boss.width + 16, boss.height + 16);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ff0';
        ctx.font = '24px Arial';
        let text = '';
        if (bossWindupType === 'shoot') text = 'Boss is aiming!';
        if (bossWindupType === 'sword') {
            if (typeof swordSlashPosition !== 'undefined' && swordSlashPosition) {
                let lowestPlatform = platforms.reduce((a, b) => (a.y > b.y ? a : b));
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#3af'; // Blue highlight
                if (swordSlashPosition === 'top') {
                    ctx.fillRect(0, 0, canvas.width, lowestPlatform.y);
                    text = 'Boss is winding up a TOP slash!';
                } else {
                    ctx.fillRect(0, lowestPlatform.y + lowestPlatform.h, canvas.width, canvas.height - (lowestPlatform.y + lowestPlatform.h));
                    text = 'Boss is winding up a BOTTOM slash!';
                }
                ctx.restore();
            } else {
                text = 'Boss is winding up a slash!';
            }
        }
        if (bossWindupType === 'homing') text = 'Boss is charging a homing shot!';
        ctx.fillText(text, boss.x - 40, boss.y - 20);
        ctx.restore();
    }
}

function drawPlatforms() {
    ctx.fillStyle = '#888';
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });
}

let gameOver = false;

// Countdown and fight start
let fightStarted = false;
let countdown = 3;
let countdownTimer = 0;

function drawCountdown() {
    if (!fightStarted) {
        ctx.save();
        }tx.fillStyle = '#fff';
        ctx.restore();px Arial';
    }   if (countdown > 0) {
}           ctx.fillText(countdown, canvas.width / 2 - 20, canvas.height / 2);
        } else {
function drawEXChargeBar() {GHT!', canvas.width / 2 - 90, canvas.height / 2);
    // Draw EX charge bar at bottom center
    const barWidth = 200;
    const barHeight = 18;
    const x = canvas.width / 2 - barWidth / 2;
    const y = canvas.height - 32;
    ctx.save();ChargeBar() {
    ctx.fillStyle = '#222';t bottom center
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = exReady ? '#ff0' : '#0cf';
    ctx.fillRect(x, y, (exCharge / EX_CHARGE_MAX) * barWidth, barHeight);
    ctx.strokeStyle = '#fff'; 32;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.font = '16px Arial';
    ctx.fillStyle = exReady ? '#ff0' : '#fff';
    ctx.fillText(exReady ? 'EX READY!' : 'EX CHARGE', x + barWidth / 2 - 40, y + 14);
    ctx.restore();, y, (exCharge / EX_CHARGE_MAX) * barWidth, barHeight);
}   ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, barWidth, barHeight);
function checkGameOver() {';
    if (player.health <= 0) { '#ff0' : '#fff';
        ctx.fillStyle = '#f00';READY!' : 'EX CHARGE', x + barWidth / 2 - 40, y + 14);
        ctx.font = '48px Arial';
        ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
        ctx.font = '28px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
        gameOver = true;'#f00';
        // Reset EX charge on loss
        exCharge = 0;'GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
        exReady = false; Arial';
        exActive = false;#fff';
        return true;('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
    } else if (boss.health <= 0) {
        ctx.fillStyle = '#0f0';oss
        ctx.font = '48px Arial';
        ctx.fillText('YOU WIN!', canvas.width / 2 - 120, canvas.height / 2);
        ctx.font = '28px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
        gameOver = true;'#0f0';
        return true;48px Arial';
    }   ctx.fillText('YOU WIN!', canvas.width / 2 - 120, canvas.height / 2);
    gameOver = false;8px Arial';
    return false;tyle = '#fff';
}       ctx.fillText('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
        gameOver = true;
function restartGame() {
    player.health = PLAYER_MAX_HEALTH;
    boss.health = BOSS_MAX_HEALTH;
    player.bullets = [];
    boss.bullets = [];
    bossHomingProjectiles = [];
    bossHomingExplosions = [];
    player.x = 60;= PLAYER_MAX_HEALTH;
    player.y = canvas.height - PLAYER_HEIGHT - 20;
    boss.x = canvas.width - BOSS_WIDTH - 60;
    boss.y = canvas.height - BOSS_HEIGHT - 20;
    gameOver = false;iles = [];
    fightStarted = false;= [];
    countdown = 3;
    countdownTimer = 0;eight - PLAYER_HEIGHT - 20;
    // Reset all boss attack statesDTH - 60;
    boss.swordSlashing = false;SS_HEIGHT - 20;
    swordSlashActive = false;
    bossWindup = false;e;
    bossWindupType = null;
    bossWindupTimer = 0;
    boss.attackType = null;k states
    boss.attackCooldown = 0;se;
    boss.attackTimer = 0;lse;
    swordSlashPosition = 'bottom';
    shootPatternIndex = 0;
    // Reset EX charge and state on restart
    exCharge = 0;pe = null;
    exReady = false;own = 0;
    exActive = false;= 0;
}   swordSlashPosition = 'bottom';
    shootPatternIndex = 0;
// Add back the drawBullets functionrestart
function drawBullets() {
    // Player bullets
    ctx.fillStyle = '#fff';
    player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    // Boss bullets
    ctx.fillStyle = '#ff0'; function
    boss.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
}   // Player bullets
    ctx.fillStyle = '#fff';
// Game loopullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!fightStarted) {(b => ctx.fillRect(b.x, b.y, b.w, b.h));
        countdownTimer++;
        if (countdownTimer % 60 === 0 && countdown > 0) {
            countdown--;
        }gameLoop() {
        if (countdown === 0 && countdownTimer > 60 * 1.5) {
            fightStarted = true;
        }ountdownTimer++;
    }   if (countdownTimer % 60 === 0 && countdown > 0) {
    if (!gameOver && fightStarted) {
        handleInput();
        updatePhysics();= 0 && countdownTimer > 60 * 1.5) {
        updatePlayerBullets();e;
        updateBossBullets();
        updateBossHomingProjectiles();
        updateBossHomingExplosions();
        bossAttack();;
        checkBossAttackDamage();
    }   updatePlayerBullets();
    drawPlatforms();llets();
    drawPlayer();sHomingProjectiles();
    drawBoss();ossHomingExplosions();
    drawBullets();();
    drawSwordSlash();ckDamage();
    drawBossHomingProjectiles();
    drawBossHomingExplosions();
    drawBossWindup();
    drawHealthBars();
    drawCountdown();
    drawEXChargeBar();
    checkGameOver();ojectiles();
    requestAnimationFrame(gameLoop);
}   drawBossWindup();
    drawHealthBars();
gameLoop();ntdown();
};  drawEXChargeBar();
    checkGameOver();
    requestAnimationFrame(gameLoop);
}

gameLoop();
};

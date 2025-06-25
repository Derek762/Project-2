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
    { x: 400, y: 260, w: 120, h: 16 },
    { x: 650, y: 340, w: 120, h: 16 }
];

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawBoss() {
    ctx.fillStyle = boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
}

function drawBullets() {
    // Player bullets
    ctx.fillStyle = '#fff';
    player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    // Boss bullets
    ctx.fillStyle = '#ff0';
    boss.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
}

function drawHealthBars() {
    // Player
    ctx.fillStyle = '#fff';
    ctx.fillText('Player', 20, 30);
    ctx.fillStyle = '#6cf';
    ctx.fillRect(90, 15, player.health * 30, 15);
    // Boss
    ctx.fillStyle = '#fff';
    ctx.fillText('Boss', 600, 30);
    ctx.fillStyle = '#f44';
    // Boss health bar: max width 240px, scales with health
    const bossBarWidth = 240;
    ctx.fillRect(660, 15, Math.max(0, boss.health / BOSS_MAX_HEALTH * bossBarWidth), 15);
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
        b.x -= b.speed;
        // Remove if off screen
        if (b.x + b.w < 0) {
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
        proj.vx = dx * (proj.speed + 2); // Make homing attack faster (was proj.speed)
        proj.vy = dy * (proj.speed + 2);
        proj.x += proj.vx;
        proj.y += proj.vy;
        // Collision with player
        if (
            proj.x < player.x + player.width &&
            proj.x + proj.w > player.x &&
            proj.y < player.y + player.height &&
            proj.y + proj.h > player.y &&
            player.health > 0
        ) {
            bossHomingExplosions.push({x: proj.x + proj.w/2, y: proj.y + proj.h/2, r: 56, timer: 0});
            player.health -= 1;
            bossHomingProjectiles.splice(i, 1);
            return;
        }
        // Collision with platforms
        for (let p of platforms) {
            if (
                proj.x + proj.w > p.x &&
                proj.x < p.x + p.w &&
                proj.y + proj.h > p.y &&
                proj.y < p.y + p.h
            ) {
                bossHomingExplosions.push({x: proj.x + proj.w/2, y: proj.y + proj.h/2, r: 56, timer: 0});
                bossHomingProjectiles.splice(i, 1);
                return;
            }
        }
        // Collision with walls
        if (
            proj.x < 0 || proj.x + proj.w > canvas.width ||
            proj.y < 0 || proj.y + proj.h > canvas.height
        ) {
            bossHomingExplosions.push({x: proj.x + proj.w/2, y: proj.y + proj.h/2, r: 56, timer: 0});
            bossHomingProjectiles.splice(i, 1);
            return;
        }
        // REMOVE: Collision with player bullets (player can no longer destroy homing projectiles)
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
                player.health -= 0.5;
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
        // Randomly pick attack and start windup
        const attacks = ['shoot', 'sword', 'homing'];
        bossWindupType = attacks[Math.floor(Math.random() * attacks.length)];
        bossWindup = true;
        bossWindupTimer = 0;
        // Set swordSlashPosition at the start of windup for sword
        if (bossWindupType === 'sword') {
            swordSlashPosition = Math.random() < 0.5 ? 'top' : 'bottom';
        }
        return;
    }
    if (bossWindup) {
        bossWindupTimer++;
        if (bossWindupTimer >= 40) { // Slower windup
            boss.attackType = bossWindupType;
            boss.attackTimer = 0;
            bossWindup = false;
            if (bossWindupType === 'shoot') {
                // Make gap always at least as high as the first platform (platforms[0].y)
                const minGapY = 0;
                const maxGapY = platforms[0].y - shootPatternGapHeight - 10; // 10px buffer
                shootPatternGapY = minGapY + Math.random() * (maxGapY - minGapY);
            }
        }
        swordSlashActive = false;
        return;
    }
    if (boss.attackType === 'shoot') {
        swordSlashActive = false;
        let shootInterval = 18; // Slower shooting
        if (boss.attackTimer % shootInterval === 0) {
            let projectileHeight = 40;
            for (let y = 0; y < canvas.height; y += projectileHeight) {
                if (
                    y + projectileHeight > shootPatternGapY &&
                    y < shootPatternGapY + shootPatternGapHeight
                ) {
                    continue;
                }
                boss.bullets.push({
                    x: boss.x,
                    y: y,
                    w: 48,
                    h: projectileHeight,
                    speed: 7 // Slower boss bullet
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
        // Fire a homing projectile at the start and every 30 frames (max 3)
        if (boss.attackTimer % 30 === 0 && boss.attackTimer < 90) {
            bossHomingProjectiles.push({
                x: boss.x + boss.width / 2 - 16,
                y: boss.y + boss.height / 2 - 16,
                w: 32,
                h: 32,
                speed: 5,
                vx: 0,
                vy: 0
            });
        }
        boss.attackTimer++;
        if (boss.attackTimer > 90) {
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
                player.health -= 0.5; // More noticeable damage per frame
            }
        } else {
            // Hit everything above the lowest platform
            if (
                player.y + player.height < lowestPlatform.y + 1 &&
                player.y + player.height > 0
            ) {
                player.health -= 0.5;
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
        ctx.fillStyle = '#fff';
        ctx.font = '64px Arial';
        if (countdown > 0) {
            ctx.fillText(countdown, canvas.width / 2 - 20, canvas.height / 2);
        } else {
            ctx.fillText('FIGHT!', canvas.width / 2 - 90, canvas.height / 2);
        }
        ctx.restore();
    }
}

function drawEXChargeBar() {
    // Draw EX charge bar at bottom center
    const barWidth = 200;
    const barHeight = 18;
    const x = canvas.width / 2 - barWidth / 2;
    const y = canvas.height - 32;
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = exReady ? '#ff0' : '#0cf';
    ctx.fillRect(x, y, (exCharge / EX_CHARGE_MAX) * barWidth, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.font = '16px Arial';
    ctx.fillStyle = exReady ? '#ff0' : '#fff';
    ctx.fillText(exReady ? 'EX READY!' : 'EX CHARGE', x + barWidth / 2 - 40, y + 14);
    ctx.restore();
}

function checkGameOver() {
    if (player.health <= 0) {
        ctx.fillStyle = '#f00';
        ctx.font = '48px Arial';
        ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
        ctx.font = '28px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
        gameOver = true;
        // Reset EX charge on loss
        exCharge = 0;
        exReady = false;
        exActive = false;
        return true;
    } else if (boss.health <= 0) {
        ctx.fillStyle = '#0f0';
        ctx.font = '48px Arial';
        ctx.fillText('YOU WIN!', canvas.width / 2 - 120, canvas.height / 2);
        ctx.font = '28px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press R to Restart', canvas.width / 2 - 110, canvas.height / 2 + 50);
        gameOver = true;
        return true;
    }
    gameOver = false;
    return false;
}

function restartGame() {
    player.health = PLAYER_MAX_HEALTH;
    boss.health = BOSS_MAX_HEALTH;
    player.bullets = [];
    boss.bullets = [];
    bossHomingProjectiles = [];
    bossHomingExplosions = [];
    player.x = 60;
    player.y = canvas.height - PLAYER_HEIGHT - 20;
    boss.x = canvas.width - BOSS_WIDTH - 60;
    boss.y = canvas.height - BOSS_HEIGHT - 20;
    gameOver = false;
    fightStarted = false;
    countdown = 3;
    countdownTimer = 0;
    // Reset all boss attack states
    boss.swordSlashing = false;
    swordSlashActive = false;
    bossWindup = false;
    bossWindupType = null;
    bossWindupTimer = 0;
    boss.attackType = null;
    boss.attackCooldown = 0;
    boss.attackTimer = 0;
    swordSlashPosition = 'bottom';
    shootPatternIndex = 0;
    // Reset EX charge and state on restart
    exCharge = 0;
    exReady = false;
    exActive = false;
}

// Game loop
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
    drawBossWindup();
    drawHealthBars();
    drawCountdown();
    drawEXChargeBar();
    checkGameOver();
    requestAnimationFrame(gameLoop);
}

gameLoop();
};

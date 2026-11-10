// Contos da 17 - Jogo do Bombeiro com Facão
// Canvas & Contexto
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const scoreVal = document.getElementById('scoreVal');
const highScoreVal = document.getElementById('highScoreVal');
const meterFill = document.getElementById('meterFill');
const meterText = document.getElementById('meterText');
const speedLevel = document.getElementById('speedLevel');
const uiOverlay = document.getElementById('uiOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');

// Configurações do Grid
const COLS = 20;
const ROWS = 15;
const TILE_SIZE = 40; // 20 * 40 = 800, 15 * 40 = 600

// Estado do Áudio
let soundEnabled = true;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Sintetizador de efeitos sonoros
const SoundFX = {
  slash() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },

  cutGrass(combo = 1) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ruído de corte de grama / folhagem
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const freq = Math.min(1800 + combo * 100, 4000);
    filter.frequency.setValueAtTime(freq, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  },

  gameOver() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [220, 196, 174, 146];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.15 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.15);
      osc.stop(ctx.currentTime + idx * 0.15 + 0.22);
    });
  }
};

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? '🔊 Som: ON' : '🔇 Som: OFF';
});

// Estado do Jogo
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
let score = 0;
let highScore = parseInt(localStorage.getItem('contos17_highscore') || '0', 10);
highScoreVal.textContent = highScore;

let gameTime = 0;
let growthTimer = 0;
let growthInterval = 900; // ms inicial entre novos crescimentos de mato
let minGrowthInterval = 120; // limite mínimo de velocidade
let combo = 0;
let comboTimer = 0;

// Sistema de Frases / Caixa de Diálogo
const DIALOGUE_PHRASES = [
  "CFO é bom demais!",
  "Traga o gadanho, Paula Almeida!",
  "Booora, combate!",
  "Acabou, banhou, senhores!",
  "Cadê o Prado?",
  "Bora dar o gás!",
  "Tem que agradar ao comando!",
  "Liberação, Xerife!",
  "Cadê o K3?",
  "Mamãe disse que eu deveria estudar, pois a caneta é mais leve que a enxada!"
];

let availablePhrases = [];
let speechTimer = 0; // Contagem regressiva até a próxima fala (a cada 10s)
const SPEECH_INTERVAL = 10; // 10 segundos
let currentDialogue = null; // { text, lines, duration, elapsed }

function getNextDialoguePhrase() {
  if (availablePhrases.length === 0) {
    // Reabastece e embaralha todas as frases para garantir que todas sejam ditas antes de repetir
    availablePhrases = [...DIALOGUE_PHRASES];
    for (let i = availablePhrases.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePhrases[i], availablePhrases[j]] = [availablePhrases[j], availablePhrases[i]];
    }
  }
  return availablePhrases.pop();
}

function triggerDialogueSpeech() {
  const phrase = getNextDialoguePhrase();
  
  // Quebrar a frase em linhas se for longa
  const maxLineLength = 26;
  const words = phrase.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  currentDialogue = {
    text: phrase,
    lines: lines,
    duration: 4.8, // fica visível por 4.8 segundos
    elapsed: 0
  };
}

// Grade de Mato
// Cada célula contém: { stage: 0..3 (0=limpo, 1=broto, 2=médio, 3=alto), variation: 0..2 }
let grid = [];

function initGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({
        stage: 0,
        variation: Math.floor(Math.random() * 3),
        swayOffset: Math.random() * Math.PI * 2
      });
    }
    grid.push(row);
  }

  // Começar com alguns focos de mato espalhados
  for (let i = 0; i < 25; i++) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    grid[r][c].stage = 1 + Math.floor(Math.random() * 2);
  }
}

// O Bombeiro
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  speed: 210, // pixels por segundo
  facingAngle: 0, // em radianos
  walkCycle: 0,
  isMoving: false,
  isSlashing: false,
  slashProgress: 0,
  slashDuration: 0.15, // segundos
  slashCooldown: 0.18,
  lastSlashTime: 0,
  slashArcStart: 0,
  slashArcEnd: 0
};

// Partículas e Efeitos Visuais
let particles = [];
let floatingTexts = [];

class Particle {
  constructor(x, y, color, size, vx, vy, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = life;
    this.life = life;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.5);
    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, color = '#fcbf49') {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 0.7;
    this.maxLife = 0.7;
  }

  update(dt) {
    this.y -= 25 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px "Rajdhani", sans-serif';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Controles do Teclado
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  KeyF: false
};

window.addEventListener('keydown', (e) => {
  // Prevenir rolagem padrão com as setas
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }

  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
  }

  // Tecla 'F' para dar golpe de facão
  if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
    if (gameState === 'PLAYING') {
      triggerSlash();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
  }
});

// Suporte a Toque na Tela e Controles Virtuais Touch
let touchPointerActive = false;
let touchTargetX = null;
let touchTargetY = null;

function getCanvasCoordinates(e, touch) {
  const rect = canvas.getBoundingClientRect();
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// Toque direto no Canvas (arrastar para mover)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  getAudioContext();
  if (gameState !== 'PLAYING') return;
  const pos = getCanvasCoordinates(e, e.touches[0]);
  touchTargetX = pos.x;
  touchTargetY = pos.y;
  touchPointerActive = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (gameState !== 'PLAYING') return;
  const pos = getCanvasCoordinates(e, e.touches[0]);
  touchTargetX = pos.x;
  touchTargetY = pos.y;
}, { passive: false });

const stopCanvasTouch = (e) => {
  touchPointerActive = false;
  touchTargetX = null;
  touchTargetY = null;
};
canvas.addEventListener('touchend', stopCanvasTouch, { passive: false });
canvas.addEventListener('touchcancel', stopCanvasTouch, { passive: false });

// Configuração dos Botões Virtuais (D-Pad e Golpe)
function setupTouchControls() {
  const btnUp = document.getElementById('tBtnUp');
  const btnDown = document.getElementById('tBtnDown');
  const btnLeft = document.getElementById('tBtnLeft');
  const btnRight = document.getElementById('tBtnRight');
  const btnSlash = document.getElementById('tBtnSlash');

  const bindTouchDir = (btn, keyName) => {
    if (!btn) return;
    const startPress = (e) => {
      e.preventDefault();
      getAudioContext();
      keys[keyName] = true;
      btn.classList.add('active');
    };
    const endPress = (e) => {
      e.preventDefault();
      keys[keyName] = false;
      btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', startPress, { passive: false });
    btn.addEventListener('touchend', endPress, { passive: false });
    btn.addEventListener('touchcancel', endPress, { passive: false });
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('mouseleave', endPress);
  };

  bindTouchDir(btnUp, 'ArrowUp');
  bindTouchDir(btnDown, 'ArrowDown');
  bindTouchDir(btnLeft, 'ArrowLeft');
  bindTouchDir(btnRight, 'ArrowRight');

  if (btnSlash) {
    const handleSlash = (e) => {
      e.preventDefault();
      getAudioContext();
      btnSlash.classList.add('active');
      if (gameState === 'PLAYING') {
        triggerSlash();
      }
      setTimeout(() => btnSlash.classList.remove('active'), 120);
    };

    btnSlash.addEventListener('touchstart', handleSlash, { passive: false });
    btnSlash.addEventListener('mousedown', handleSlash);
  }
}

// Disparo da Facãozada
function triggerSlash() {
  const now = performance.now() / 1000;
  if (now - player.lastSlashTime < player.slashCooldown) return;

  player.lastSlashTime = now;
  player.isSlashing = true;
  player.slashProgress = 0;
  player.slashArcStart = player.facingAngle - Math.PI * 0.45;
  player.slashArcEnd = player.facingAngle + Math.PI * 0.45;

  SoundFX.slash();

  // Verificar quais tiles de mato foram atingidos
  // O golpe tem alcance frontal de ~55px em cone
  const slashReach = 58;
  const attackX = player.x + Math.cos(player.facingAngle) * 22;
  const attackY = player.y + Math.sin(player.facingAngle) * 22;

  let cutCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = grid[r][c];
      if (tile.stage > 0) {
        const tileCenterX = c * TILE_SIZE + TILE_SIZE / 2;
        const tileCenterY = r * TILE_SIZE + TILE_SIZE / 2;

        const dist = Math.hypot(tileCenterX - attackX, tileCenterY - attackY);
        // Também cortar se o jogador estiver pisando no tile
        const distToPlayer = Math.hypot(tileCenterX - player.x, tileCenterY - player.y);

        if (dist <= slashReach || distToPlayer <= player.radius + 10) {
          cutCount++;
          const ptsEarned = tile.stage * 15;
          score += ptsEarned;

          // Partículas de folhas voando
          const leafColors = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'];
          const numParticles = 6 + tile.stage * 3;
          for (let p = 0; p < numParticles; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 50 + Math.random() * 120;
            particles.push(new Particle(
              tileCenterX + (Math.random() - 0.5) * 20,
              tileCenterY + (Math.random() - 0.5) * 20,
              leafColors[Math.floor(Math.random() * leafColors.length)],
              4 + Math.random() * 4,
              Math.cos(angle) * spd,
              Math.sin(angle) * spd,
              0.4 + Math.random() * 0.4
            ));
          }

          tile.stage = 0; // Mato capinado!
        }
      }
    }
  }

  if (cutCount > 0) {
    combo++;
    comboTimer = 1.2;
    SoundFX.cutGrass(combo);

    const bonus = cutCount > 1 ? ` (+${cutCount * 10} Multi-corte!)` : '';
    floatingTexts.push(new FloatingText(
      `+${cutCount * 15}${bonus}`,
      player.x,
      player.y - 25,
      combo > 3 ? '#ffba08' : '#74c69d'
    ));

    updateHUD();
  }
}

// Lógica de Crescimento do Mato
function updateGrassGrowth(dt) {
  growthTimer += dt * 1000;

  // A velocidade de crescimento acelera conforme o tempo avança e score aumenta
  const speedFactor = 1 + (gameTime / 25) + (score / 450);
  const currentInterval = Math.max(minGrowthInterval, growthInterval / speedFactor);

  speedLevel.textContent = speedFactor.toFixed(1) + 'x';

  if (growthTimer >= currentInterval) {
    growthTimer = 0;

    // 1. Tentar espalhar a partir de um mato existente já alto (propagação natural)
    const existing = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].stage > 0) {
          existing.push({ r, c, stage: grid[r][c].stage });
        }
      }
    }

    if (existing.length > 0 && Math.random() < 0.65) {
      // Escolhe um ponto existente para crescer ou espalhar aos vizinhos
      const chosen = existing[Math.floor(Math.random() * existing.length)];
      if (chosen.stage < 3 && Math.random() < 0.5) {
        grid[chosen.r][chosen.c].stage++;
      } else {
        // Espalha para vizinho (cima, baixo, esq, dir)
        const dirs = [
          [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nr = chosen.r + dir[0];
        const nc = chosen.c + dir[1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (grid[nr][nc].stage < 3) {
            grid[nr][nc].stage++;
          }
        }
      }
    } else {
      // 2. Nasce em um tile aleatório
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (grid[r][c].stage < 3) {
        grid[r][c].stage++;
      }
    }
  }
}

// Cálculo do percentual de infestação
function getInfestationPercentage() {
  let totalGrowth = 0;
  const maxPossible = ROWS * COLS * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      totalGrowth += grid[r][c].stage;
    }
  }

  return Math.min(100, Math.round((totalGrowth / maxPossible) * 100));
}

function updateHUD() {
  scoreVal.textContent = score;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('contos17_highscore', highScore);
    highScoreVal.textContent = highScore;
  }

  const infestation = getInfestationPercentage();
  meterFill.style.width = infestation + '%';
  meterText.textContent = infestation + '%';

  // Altera a cor do medidor se a infestação estiver crítica
  if (infestation >= 80) {
    meterFill.style.background = '#e63946';
  } else if (infestation >= 45) {
    meterFill.style.background = '#f77f00';
  } else {
    meterFill.style.background = 'linear-gradient(90deg, #52b788, #fcbf49)';
  }
}

// Atualização de Lógica Principal
function update(dt) {
  if (gameState !== 'PLAYING') return;

  gameTime += dt;

  // Controle de Combo
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
    }
  }

  // Movimentação do Jogador com as Setas, WASD, D-Pad ou Toque no Canvas
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

  // Se não estiver apertando botão, mas estiver tocando no canvas
  if (dx === 0 && dy === 0 && touchPointerActive && touchTargetX !== null) {
    const toX = touchTargetX - player.x;
    const toY = touchTargetY - player.y;
    const dist = Math.hypot(toX, toY);
    if (dist > 12) {
      dx = toX / dist;
      dy = toY / dist;
    }
  }

  player.isMoving = (dx !== 0 || dy !== 0);

  if (player.isMoving) {
    // Normalizar vetor de velocidade
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // Calcular ângulo que o bombeiro está virado
    player.facingAngle = Math.atan2(dy, dx);
    player.walkCycle += dt * 10;

    // Limites de tela (não sair da área do jogo)
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
  }

  // Animação da Facãozada
  if (player.isSlashing) {
    player.slashProgress += dt / player.slashDuration;
    if (player.slashProgress >= 1) {
      player.isSlashing = false;
      player.slashProgress = 0;
    }
  }

  // Crescimento da grama
  updateGrassGrowth(dt);

  // Atualizar partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Atualizar textos flutuantes
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update(dt);
    if (floatingTexts[i].life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }

  // Atualizar Temporizador de Diálogo (a cada 10s)
  speechTimer += dt;
  if (speechTimer >= SPEECH_INTERVAL) {
    speechTimer = 0;
    triggerDialogueSpeech();
  }

  if (currentDialogue) {
    currentDialogue.elapsed += dt;
    if (currentDialogue.elapsed >= currentDialogue.duration) {
      currentDialogue = null;
    }
  }

  updateHUD();

  // Checar Condição de Derrota (Infestação total)
  if (getInfestationPercentage() >= 100) {
    gameOver();
  }
}

// Renderização
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Desenho do Chão (Terra / Pátio do Quartel 17)
  drawGround();

  // 2. Desenho do Mato em Cada Célula
  drawGrassGrid();

  // 3. Partículas de folhas voando abaixo do jogador
  particles.forEach(p => p.draw(ctx));

  // 4. Desenho do Bombeiro com Facão
  drawPlayer();

  // 5. Efeito visual do arco de facãozada
  if (player.isSlashing) {
    drawSlashEffect();
  }

  // 6. Textos flutuantes (+pontos)
  floatingTexts.forEach(t => t.draw(ctx));

  // 7. Balão de Diálogo do Bombeiro
  drawDialogueBubble();

  // 8. Mini radar/bússola ou indicação visual de alerta nas bordas se infestação estiver alta
  const infestation = getInfestationPercentage();
  if (infestation >= 80) {
    const pulse = (Math.sin(performance.now() / 150) + 1) / 2;
    ctx.strokeStyle = `rgba(230, 57, 70, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  }
}

// Desenha o solo
function drawGround() {
  // Cor base de terra / solo de quartel
  ctx.fillStyle = '#3a2e22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade suave de terra batida
  ctx.strokeStyle = '#32261b';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Pequenos detalhes de pedrinhas no chão
  ctx.fillStyle = '#4a3b2c';
  for (let i = 0; i < 40; i++) {
    const px = (i * 137) % canvas.width;
    const py = (i * 269) % canvas.height;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Desenha o Mato
function drawGrassGrid() {
  const time = performance.now() / 600;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = grid[r][c];
      if (tile.stage === 0) continue;

      const baseX = c * TILE_SIZE + TILE_SIZE / 2;
      const baseY = r * TILE_SIZE + TILE_SIZE / 2 + 10;
      const sway = Math.sin(time + tile.swayOffset) * (2 + tile.stage * 1.5);

      ctx.save();
      ctx.translate(baseX, baseY);

      if (tile.stage === 1) {
        // Estágio 1: Broto pequeno
        ctx.strokeStyle = '#40916c';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(-8 + sway, -10, -10 + sway * 1.2, -14);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0 + sway * 0.8, -12, 0 + sway, -18);
        ctx.moveTo(6, 0);
        ctx.quadraticCurveTo(8 + sway, -10, 10 + sway * 1.2, -13);
        ctx.stroke();
      } else if (tile.stage === 2) {
        // Estágio 2: Moita média
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-14 + sway, -14, -16 + sway * 1.5, -22);
        ctx.moveTo(-4, 0);
        ctx.quadraticCurveTo(-5 + sway, -16, -6 + sway * 1.2, -26);
        ctx.moveTo(4, 0);
        ctx.quadraticCurveTo(5 + sway, -16, 6 + sway * 1.2, -25);
        ctx.moveTo(10, 0);
        ctx.quadraticCurveTo(14 + sway, -14, 16 + sway * 1.5, -21);
        ctx.stroke();

        // Camada clara interna
        ctx.strokeStyle = '#52b788';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0 + sway, -18, 0 + sway * 1.4, -28);
        ctx.stroke();
      } else if (tile.stage === 3) {
        // Estágio 3: Mato Alto e Denso (Perigoso!)
        ctx.strokeStyle = '#1b4332';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Lâminas de grama densas
        const blades = [-14, -9, -4, 0, 4, 9, 14];
        blades.forEach((bx, idx) => {
          const h = 26 + (idx % 3) * 6;
          const curve = (bx / 10) * 8 + sway * 1.4;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.quadraticCurveTo(bx + curve * 0.6, -h * 0.5, bx + curve, -h);
          ctx.stroke();
        });

        // Pontas amareladas / sementes espalhadoras
        ctx.fillStyle = '#d8f3dc';
        ctx.beginPath();
        ctx.arc(sway * 1.4, -32, 2.5, 0, Math.PI * 2);
        ctx.arc(-14 + sway * 1.2, -28, 2, 0, Math.PI * 2);
        ctx.arc(14 + sway * 1.2, -28, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

// Desenha o Bombeiro com Facão
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facingAngle);

  // Sombra sob o bombeiro
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pernas / Passos se estiver andando
  if (player.isMoving) {
    const legOffset = Math.sin(player.walkCycle) * 6;
    ctx.fillStyle = '#1c1c1c'; // botas pretas
    ctx.fillRect(-6 + legOffset, -14, 5, 6);
    ctx.fillRect(-6 - legOffset, 8, 5, 6);
  }

  // Corpo / Jaqueta do Bombeiro (Amarela com faixa refletiva)
  ctx.fillStyle = '#f4a261'; // Jaqueta caqui/mostarda de bombeiro
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Faixa refletiva de segurança (amarelo limão / prata)
  ctx.strokeStyle = '#e9d8a6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // Capacete de Bombeiro (Vermelho com aba traseira clássica)
  ctx.fillStyle = '#9d0208'; // Aba traseira estendida
  ctx.beginPath();
  ctx.ellipse(-4, 0, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d90429'; // Cúpula principal do capacete
  ctx.beginPath();
  ctx.ellipse(1, 0, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Insígnia / Viseira do Capacete
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.arc(6, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Número "17" no capacete (ou destaque do destacamento)
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 5px sans-serif';
  ctx.fillText('17', 4, 2);

  // Braço e Facão na Mão Direita
  ctx.save();
  ctx.translate(5, 9); // Mão direita

  let bladeAngle = 0.2;
  if (player.isSlashing) {
    // Balanço violento do facão durante o golpe
    bladeAngle = -1.2 + player.slashProgress * 2.5;
  }
  ctx.rotate(bladeAngle);

  // Braço
  ctx.fillStyle = '#f4a261';
  ctx.fillRect(-3, -2, 7, 5);

  // Mão
  ctx.fillStyle = '#1c1c1c'; // Luva de bombeiro preta
  ctx.beginPath();
  ctx.arc(4, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Cabo do Facão
  ctx.fillStyle = '#582f0e'; // Madeira escura
  ctx.fillRect(4, -1.5, 5, 3);

  // Guarda-mão
  ctx.fillStyle = '#adb5bd';
  ctx.fillRect(8, -3, 2, 6);

  // Lâmina Grande do Facão (Aço reluzente de corte)
  ctx.fillStyle = '#f8f9fa';
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.lineTo(28, -3); // Costas da lâmina
  ctx.lineTo(31, 1);  // Ponta curva do facão
  ctx.lineTo(10, 1.5); // Fio de corte
  ctx.closePath();
  ctx.fill();

  // Brilho do corte da lâmina
  ctx.strokeStyle = '#e0e1dd';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore(); // Restaura braço/facão

  ctx.restore(); // Restaura jogador
}

// Desenha o efeito visual do golpe de facão (swoosh / rastro de corte)
function drawSlashEffect() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const startA = player.slashArcStart;
  const endA = player.slashArcEnd;
  const currentArc = startA + (endA - startA) * player.slashProgress;
  const slashRadius = 45;

  // Arco branco/prateado cortante
  ctx.beginPath();
  ctx.arc(0, 0, slashRadius, startA, currentArc);
  ctx.strokeStyle = `rgba(255, 255, 255, ${1 - player.slashProgress * 0.7})`;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Rastro secundário avermelhado/energia
  ctx.beginPath();
  ctx.arc(0, 0, slashRadius - 4, startA, currentArc);
  ctx.strokeStyle = `rgba(247, 127, 0, ${0.8 - player.slashProgress * 0.8})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

// Desenha o Balão de Diálogo do Bombeiro
function drawDialogueBubble() {
  if (!currentDialogue) return;

  ctx.save();
  ctx.font = 'bold 14px "Rajdhani", sans-serif';

  // Medir maior linha
  let maxWidth = 0;
  currentDialogue.lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });

  const paddingX = 14;
  const paddingY = 8;
  const lineHeight = 17;
  const boxWidth = maxWidth + paddingX * 2;
  const boxHeight = currentDialogue.lines.length * lineHeight + paddingY * 2;

  // Posição padrão: acima da cabeça do bombeiro
  let bubbleX = player.x;
  let bubbleY = player.y - 36 - boxHeight / 2;
  let tailPointsDown = true;

  // Se o bombeiro estiver muito perto do topo, posiciona abaixo dele
  if (bubbleY - boxHeight / 2 < 12) {
    bubbleY = player.y + 36 + boxHeight / 2;
    tailPointsDown = false;
  }

  // Não deixar o balão vazar nas laterais da tela
  const halfW = boxWidth / 2;
  if (bubbleX - halfW < 12) bubbleX = 12 + halfW;
  if (bubbleX + halfW > canvas.width - 12) bubbleX = canvas.width - 12 - halfW;

  const left = bubbleX - halfW;
  const top = bubbleY - boxHeight / 2;

  // Transição de fade in e fade out
  let alpha = 1;
  const fadeOutTime = 0.5;
  const remaining = currentDialogue.duration - currentDialogue.elapsed;
  if (remaining < fadeOutTime) {
    alpha = Math.max(0, remaining / fadeOutTime);
  }
  if (currentDialogue.elapsed < 0.15) {
    alpha = currentDialogue.elapsed / 0.15;
  }

  ctx.globalAlpha = alpha;

  // Sombra suave do balão
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, left + 3, top + 3, boxWidth, boxHeight, 8);
  ctx.fill();

  // Fundo do balão (branco puro com borda escura)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#181e28';
  ctx.lineWidth = 2.5;
  roundRect(ctx, left, top, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  // Rabicho do balão apontando para o bombeiro
  const tailX = Math.max(left + 16, Math.min(left + boxWidth - 16, player.x));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (tailPointsDown) {
    ctx.moveTo(tailX - 7, top + boxHeight - 1);
    ctx.lineTo(player.x, player.y - 18);
    ctx.lineTo(tailX + 7, top + boxHeight - 1);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(tailX - 7, top + boxHeight);
    ctx.lineTo(player.x, player.y - 18);
    ctx.lineTo(tailX + 7, top + boxHeight);
    ctx.stroke();
  } else {
    ctx.moveTo(tailX - 7, top + 1);
    ctx.lineTo(player.x, player.y + 18);
    ctx.lineTo(tailX + 7, top + 1);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(tailX - 7, top);
    ctx.lineTo(player.x, player.y + 18);
    ctx.lineTo(tailX + 7, top);
    ctx.stroke();
  }

  // Texto falado pelo bombeiro
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const startY = top + paddingY + lineHeight / 2;
  currentDialogue.lines.forEach((line, idx) => {
    ctx.fillText(line, bubbleX, startY + idx * lineHeight);
  });

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Game Over
function gameOver() {
  gameState = 'GAMEOVER';
  SoundFX.gameOver();

  overlayTitle.textContent = 'TERRENO ENGOLIDO!';
  overlayMessage.innerHTML = `O mato tomou conta de 100% do destacamento 17!<br><br>
    <strong>Pontos:</strong> ${score}<br>
    <strong>Recorde:</strong> ${highScore}`;
  startBtn.textContent = 'TENTAR NOVAMENTE';
  uiOverlay.classList.remove('hidden');
}

// Reiniciar / Iniciar Jogo
function startGame() {
  score = 0;
  gameTime = 0;
  growthTimer = 0;
  combo = 0;
  particles = [];
  floatingTexts = [];
  speechTimer = 0;
  currentDialogue = null;
  availablePhrases = [];

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.facingAngle = 0;
  player.isSlashing = false;

  initGrid();
  updateHUD();

  gameState = 'PLAYING';
  uiOverlay.classList.add('hidden');
}

startBtn.addEventListener('click', () => {
  getAudioContext();
  startGame();
});

// Loop Principal do Jogo (Game Loop com Delta Time)
let lastFrameTime = performance.now();

function gameLoop(currentTime) {
  const dt = Math.min((currentTime - lastFrameTime) / 1000, 0.1); // limite de segurança no dt
  lastFrameTime = currentTime;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Inicialização
setupTouchControls();
initGrid();
render();
requestAnimationFrame(gameLoop);

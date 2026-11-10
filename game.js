// Contos da 17 - Jogo do Bombeiro com Facão e Roçadeira Motorizada
// Canvas & Contexto
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const timerVal = document.getElementById('timerVal');
const scoreVal = document.getElementById('scoreVal');
const moneyVal = document.getElementById('moneyVal');
const highScoreVal = document.getElementById('highScoreVal');
const meterFill = document.getElementById('meterFill');
const meterText = document.getElementById('meterText');
const speedLevel = document.getElementById('speedLevel');
const uiOverlay = document.getElementById('uiOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');

// Elementos da Roçadeira
const trimmerActiveBar = document.getElementById('trimmerActiveBar');
const trimmerMeterFill = document.getElementById('trimmerMeterFill');
const trimmerTimeText = document.getElementById('trimmerTimeText');
const gameNotice = document.getElementById('gameNotice');
const trimmerOfferModal = document.getElementById('trimmerOfferModal');
const offerButtonsContainer = document.getElementById('offerButtonsContainer');
const offerNoMoneyNotice = document.getElementById('offerNoMoneyNotice');
const btnAcceptTrimmer = document.getElementById('btnAcceptTrimmer');
const btnDeclineTrimmer = document.getElementById('btnDeclineTrimmer');
const btnCloseNoMoney = document.getElementById('btnCloseNoMoney');

// Mobile Controls
const mobileTrimmerButtons = document.getElementById('mobileTrimmerButtons');
const tBtnAccept = document.getElementById('tBtnAccept');
const tBtnDecline = document.getElementById('tBtnDecline');
const tSlashIcon = document.getElementById('tSlashIcon');
const tSlashText = document.getElementById('tSlashText');
const tBtnSlash = document.getElementById('tBtnSlash');

// Configurações do Grid
const COLS = 20;
const ROWS = 15;
const TILE_SIZE = 40; // 20 * 40 = 800, 15 * 40 = 600

// Configuração do Tempo de Jogo (3 Minutos = 180 Segundos)
const TOTAL_GAME_TIME = 180;
let timeRemaining = TOTAL_GAME_TIME;

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

  trimmerRev() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // Som de motor 2 tempos acelerando
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(340, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },

  cutGrass(combo = 1) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

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

  accept() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  },

  victory() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const melody = [261, 329, 392, 523];
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.15);
      osc.stop(ctx.currentTime + idx * 0.15 + 0.35);
    });
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
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER', 'VICTORY'
let score = 0;
let money = 0; // Ganha R$ 5,00 por segundo (exatamente R$ 150 a cada 30 segundos)
let highScore = parseInt(localStorage.getItem('contos17_highscore') || '0', 10);
highScoreVal.textContent = highScore;

let gameTime = 0;
let growthTimer = 0;
let growthInterval = 900;
let minGrowthInterval = 120;
let combo = 0;
let comboTimer = 0;

// Sistema da Roçadeira
const TRIMMER_COST = 150;
const TRIMMER_DURATION = 10; // 10 segundos ativa
let isTrimmerActive = false;
let trimmerTimeRemaining = 0;
let trimmerOfferTimer = 0; // Temporizador para ofertar a cada 30 segundos
let isOfferOpen = false;
let noticeTimer = 0;

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
let speechTimer = 0;
const SPEECH_INTERVAL = 10;
let currentDialogue = null;

function getNextDialoguePhrase() {
  if (availablePhrases.length === 0) {
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
    duration: 4.5,
    elapsed: 0
  };
}

// Grade de Mato
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

  // Moitas iniciais
  for (let i = 0; i < 25; i++) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    grid[r][c].stage = 1 + Math.floor(Math.random() * 2);
  }
}

// O Bombeiro
const BASE_SLASH_COOLDOWN = 0.18;
const BASE_SLASH_DURATION = 0.15;

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  speed: 215,
  facingAngle: 0,
  walkCycle: 0,
  isMoving: false,
  isSlashing: false,
  slashProgress: 0,
  slashDuration: BASE_SLASH_DURATION,
  slashCooldown: BASE_SLASH_COOLDOWN,
  lastSlashTime: 0,
  slashArcStart: 0,
  slashArcEnd: 0
};

// Partículas e Textos
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
    ctx.font = 'bold 15px "Rajdhani", sans-serif';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Teclas
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false
};

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }

  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
  }

  // Tecla 'F': Cortar mato
  if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
    if (gameState === 'PLAYING') {
      triggerSlash();
    }
  }

  // Tecla 'S': Aceitar roçadeira (quando oferta estiver aberta)
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    if (isOfferOpen && money >= TRIMMER_COST) {
      acceptTrimmer();
    }
  }

  // Tecla 'N': Recusar roçadeira
  if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N') {
    if (isOfferOpen) {
      closeOffer();
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

// Configuração dos Botões Virtuais
function setupTouchControls() {
  const btnUp = document.getElementById('tBtnUp');
  const btnDown = document.getElementById('tBtnDown');
  const btnLeft = document.getElementById('tBtnLeft');
  const btnRight = document.getElementById('tBtnRight');

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

  if (tBtnSlash) {
    const handleSlash = (e) => {
      e.preventDefault();
      getAudioContext();
      tBtnSlash.classList.add('active');
      if (gameState === 'PLAYING') {
        triggerSlash();
      }
      setTimeout(() => tBtnSlash.classList.remove('active'), 100);
    };

    tBtnSlash.addEventListener('touchstart', handleSlash, { passive: false });
    tBtnSlash.addEventListener('mousedown', handleSlash);
  }

  // Botões Mobile de Aceitar/Recusar Roçadeira
  if (tBtnAccept) {
    tBtnAccept.addEventListener('click', () => {
      if (isOfferOpen && money >= TRIMMER_COST) acceptTrimmer();
    });
  }
  if (tBtnDecline) {
    tBtnDecline.addEventListener('click', () => {
      if (isOfferOpen) closeOffer();
    });
  }
}

// Oferta da Roçadeira
function openTrimmerOffer() {
  if (isTrimmerActive || gameState !== 'PLAYING') return;

  isOfferOpen = true;
  trimmerOfferModal.classList.remove('hidden');

  // Só mostra os botões de aceitar se o jogador tiver os R$ 150
  if (money >= TRIMMER_COST) {
    offerButtonsContainer.classList.remove('hidden');
    offerNoMoneyNotice.classList.add('hidden');
    mobileTrimmerButtons.classList.remove('hidden');
  } else {
    offerButtonsContainer.classList.add('hidden');
    offerNoMoneyNotice.classList.remove('hidden');
    mobileTrimmerButtons.classList.add('hidden');
  }
}

function closeOffer() {
  isOfferOpen = false;
  trimmerOfferModal.classList.add('hidden');
  mobileTrimmerButtons.classList.add('hidden');
}

function acceptTrimmer() {
  if (money < TRIMMER_COST) return;

  money -= TRIMMER_COST;
  closeOffer();
  activateTrimmer();
  SoundFX.accept();
}

btnAcceptTrimmer.addEventListener('click', acceptTrimmer);
btnDeclineTrimmer.addEventListener('click', closeOffer);
btnCloseNoMoney.addEventListener('click', closeOffer);

function activateTrimmer() {
  isTrimmerActive = true;
  trimmerTimeRemaining = TRIMMER_DURATION;
  trimmerActiveBar.classList.remove('hidden');

  // 3x mais rápido
  player.slashCooldown = BASE_SLASH_COOLDOWN / 3;
  player.slashDuration = BASE_SLASH_DURATION / 3;

  // Atualizar visual do botão mobile
  tBtnSlash.classList.add('trimmer-mode');
  tSlashIcon.textContent = '🚜';
  tSlashText.textContent = 'ROÇAR (F)';

  showNotice('⚡ ROÇADEIRA ATIVADA! 3X MAIS RÁPIDO!');
  SoundFX.trimmerRev();
}

function deactivateTrimmer() {
  isTrimmerActive = false;
  trimmerActiveBar.classList.add('hidden');

  // Retorna a velocidade normal
  player.slashCooldown = BASE_SLASH_COOLDOWN;
  player.slashDuration = BASE_SLASH_DURATION;

  // Volta ao botão padrão do facão
  tBtnSlash.classList.remove('trimmer-mode');
  tSlashIcon.textContent = '🗡️';
  tSlashText.textContent = 'GOLPE (F)';

  // Mensagem solicitada: dizendo que o tempo acabou
  showNotice('O tempo da roçadeira acabou!');
}

function showNotice(text) {
  gameNotice.textContent = text;
  gameNotice.classList.remove('hidden');
  noticeTimer = 3.2; // Visível por 3.2s
}

// Disparo do Golpe (Facão ou Roçadeira)
function triggerSlash() {
  const now = performance.now() / 1000;
  if (now - player.lastSlashTime < player.slashCooldown) return;

  player.lastSlashTime = now;
  player.isSlashing = true;
  player.slashProgress = 0;
  player.slashArcStart = player.facingAngle - Math.PI * 0.45;
  player.slashArcEnd = player.facingAngle + Math.PI * 0.45;

  if (isTrimmerActive) {
    SoundFX.trimmerRev();
  } else {
    SoundFX.slash();
  }

  // Se estiver com a roçadeira, o alcance e varredura são ainda maiores!
  const slashReach = isTrimmerActive ? 68 : 58;
  const attackX = player.x + Math.cos(player.facingAngle) * 25;
  const attackY = player.y + Math.sin(player.facingAngle) * 25;

  let cutCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = grid[r][c];
      if (tile.stage > 0) {
        const tileCenterX = c * TILE_SIZE + TILE_SIZE / 2;
        const tileCenterY = r * TILE_SIZE + TILE_SIZE / 2;

        const dist = Math.hypot(tileCenterX - attackX, tileCenterY - attackY);
        const distToPlayer = Math.hypot(tileCenterX - player.x, tileCenterY - player.y);

        if (dist <= slashReach || distToPlayer <= player.radius + 12) {
          cutCount++;
          const ptsEarned = tile.stage * (isTrimmerActive ? 25 : 15);
          score += ptsEarned;

          // Partículas de folhas e faíscas
          const leafColors = isTrimmerActive 
            ? ['#facc15', '#4ade80', '#22c55e', '#ffffff'] 
            : ['#2d6a4f', '#40916c', '#52b788', '#74c69d'];
          const numParticles = 6 + tile.stage * 3;
          for (let p = 0; p < numParticles; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (isTrimmerActive ? 90 : 50) + Math.random() * 120;
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

          tile.stage = 0;
        }
      }
    }
  }

  if (cutCount > 0) {
    combo++;
    comboTimer = 1.2;
    SoundFX.cutGrass(combo);

    const bonus = isTrimmerActive ? ' ⚡ROÇADA!' : (cutCount > 1 ? ` (+${cutCount * 10})` : '');
    floatingTexts.push(new FloatingText(
      `+${cutCount * (isTrimmerActive ? 25 : 15)}${bonus}`,
      player.x,
      player.y - 25,
      isTrimmerActive ? '#facc15' : '#74c69d'
    ));

    updateHUD();
  }
}

// Crescimento do Mato
function updateGrassGrowth(dt) {
  growthTimer += dt * 1000;

  const speedFactor = 1 + (gameTime / 25) + (score / 450);
  const currentInterval = Math.max(minGrowthInterval, growthInterval / speedFactor);

  speedLevel.textContent = speedFactor.toFixed(1) + 'x';

  if (growthTimer >= currentInterval) {
    growthTimer = 0;

    const existing = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].stage > 0) {
          existing.push({ r, c, stage: grid[r][c].stage });
        }
      }
    }

    if (existing.length > 0 && Math.random() < 0.65) {
      const chosen = existing[Math.floor(Math.random() * existing.length)];
      if (chosen.stage < 3 && Math.random() < 0.5) {
        grid[chosen.r][chosen.c].stage++;
      } else {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
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
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (grid[r][c].stage < 3) {
        grid[r][c].stage++;
      }
    }
  }
}

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
  moneyVal.textContent = `R$ ${Math.floor(money)}`;

  // Formatar Timer (MM:SS)
  const minutes = Math.floor(Math.max(0, timeRemaining) / 60);
  const seconds = Math.floor(Math.max(0, timeRemaining) % 60);
  timerVal.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('contos17_highscore', highScore);
    highScoreVal.textContent = highScore;
  }

  const infestation = getInfestationPercentage();
  meterFill.style.width = infestation + '%';
  meterText.textContent = infestation + '%';

  if (infestation >= 80) {
    meterFill.style.background = '#e63946';
  } else if (infestation >= 45) {
    meterFill.style.background = '#f77f00';
  } else {
    meterFill.style.background = 'linear-gradient(90deg, #52b788, #fcbf49)';
  }
}

// Atualização Principal
function update(dt) {
  if (gameState !== 'PLAYING') return;

  gameTime += dt;

  // 1. Timer de 3 minutos
  timeRemaining -= dt;
  if (timeRemaining <= 0) {
    timeRemaining = 0;
    updateHUD();
    gameVictory();
    return;
  }

  // 2. Sistema de Dinheiro: R$ 5 por segundo (R$ 150 a cada 30 segundos)
  money += dt * 5;

  // 3. Oferta da Roçadeira a cada 30 segundos
  trimmerOfferTimer += dt;
  if (trimmerOfferTimer >= 30) {
    trimmerOfferTimer = 0;
    openTrimmerOffer();
  }

  // 4. Temporizador da Roçadeira ativa
  if (isTrimmerActive) {
    trimmerTimeRemaining -= dt;
    trimmerMeterFill.style.width = `${Math.max(0, (trimmerTimeRemaining / TRIMMER_DURATION) * 100)}%`;
    trimmerTimeText.textContent = `${Math.max(0, trimmerTimeRemaining).toFixed(1)}s`;

    if (trimmerTimeRemaining <= 0) {
      deactivateTrimmer();
    }
  }

  // 5. Temporizador da Notificação na tela
  if (noticeTimer > 0) {
    noticeTimer -= dt;
    if (noticeTimer <= 0) {
      gameNotice.classList.add('hidden');
    }
  }

  // 6. Combo
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
    }
  }

  // 7. Movimento do Jogador
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

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
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.facingAngle = Math.atan2(dy, dx);
    player.walkCycle += dt * 10;

    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
  }

  // 8. Animação de Corte
  if (player.isSlashing) {
    player.slashProgress += dt / player.slashDuration;
    if (player.slashProgress >= 1) {
      player.isSlashing = false;
      player.slashProgress = 0;
    }
  }

  // 9. Crescimento da grama
  updateGrassGrowth(dt);

  // 10. Partículas e Textos
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update(dt);
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  // 11. Diálogos a cada 10s
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

  // 12. Derrota por Infestação (100%)
  if (getInfestationPercentage() >= 100) {
    gameOver();
  }
}

// Renderização
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGround();
  drawGrassGrid();

  particles.forEach(p => p.draw(ctx));

  drawPlayer();

  if (player.isSlashing) {
    drawSlashEffect();
  }

  floatingTexts.forEach(t => t.draw(ctx));

  drawDialogueBubble();

  // Efeito de Alerta Crítico
  const infestation = getInfestationPercentage();
  if (infestation >= 80) {
    const pulse = (Math.sin(performance.now() / 150) + 1) / 2;
    ctx.strokeStyle = `rgba(230, 57, 70, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  }
}

// Solo
function drawGround() {
  ctx.fillStyle = '#3a2e22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  ctx.fillStyle = '#4a3b2c';
  for (let i = 0; i < 40; i++) {
    const px = (i * 137) % canvas.width;
    const py = (i * 269) % canvas.height;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Mato
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
      } else if (tile.stage === 3) {
        ctx.strokeStyle = '#1b4332';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        const blades = [-14, -9, -4, 0, 4, 9, 14];
        blades.forEach((bx, idx) => {
          const h = 26 + (idx % 3) * 6;
          const curve = (bx / 10) * 8 + sway * 1.4;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.quadraticCurveTo(bx + curve * 0.6, -h * 0.5, bx + curve, -h);
          ctx.stroke();
        });

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

// Desenha o Bombeiro (Com Facão OU Roçadeira Motorizada)
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facingAngle);

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pernas
  if (player.isMoving) {
    const legOffset = Math.sin(player.walkCycle) * 6;
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(-6 + legOffset, -14, 5, 6);
    ctx.fillRect(-6 - legOffset, 8, 5, 6);
  }

  // Jaqueta
  ctx.fillStyle = '#f4a261';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Faixa Refletiva
  ctx.strokeStyle = '#e9d8a6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // Capacete de Bombeiro
  ctx.fillStyle = '#9d0208';
  ctx.beginPath();
  ctx.ellipse(-4, 0, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d90429';
  ctx.beginPath();
  ctx.ellipse(1, 0, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.arc(6, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 5px sans-serif';
  ctx.fillText('17', 4, 2);

  // ========================================================
  // EQUIPAMENTO: ROÇADEIRA MOTORIZADA OU FACÃO
  // ========================================================
  if (isTrimmerActive) {
    // DESENHO DA ROÇADEIRA MOTORIZADA PROFISSIONAL
    ctx.save();

    // Motor 2 tempos nas costas/quadril (Laranja/Vermelho com tanque branco)
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-14, -8, 8, 16);
    ctx.fillStyle = '#f8fafc'; // Tanque de gasolina
    ctx.fillRect(-12, -6, 4, 12);
    ctx.fillStyle = '#1e293b'; // Escapamento e partida
    ctx.fillRect(-16, -3, 3, 6);

    // Haste de Alumínio longa saindo do motor até a frente
    let sweepAngle = 0;
    if (player.isSlashing) {
      // Movimento de varredura violento da roçadeira
      sweepAngle = Math.sin(player.slashProgress * Math.PI) * 0.45;
    }
    ctx.rotate(sweepAngle);

    ctx.strokeStyle = '#94a3b8'; // Tubo de transmissão
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(36, 4);
    ctx.stroke();

    // Guidão duplo ergonômico
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(12, 10);
    ctx.stroke();

    // Mãos do bombeiro segurando o guidão
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(8, -7, 3, 0, Math.PI * 2);
    ctx.arc(12, 9, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cabeçote de Corte na Ponta Frontal
    ctx.fillStyle = '#0f172a'; // Protetor de detritos preto
    ctx.beginPath();
    ctx.arc(36, 4, 11, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.fill();

    // Disco de Lâmina Circular Girando em Altíssima Velocidade
    const spinTime = performance.now() / 20;
    ctx.save();
    ctx.translate(36, 4);
    ctx.rotate(spinTime);

    // Rastro circular de rotação translúcido
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Lâmina de 3 pontas girando
    ctx.fillStyle = '#f1f5f9';
    for (let blade = 0; blade < 3; blade++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.fillRect(-1.5, -9, 3, 18);
    }
    ctx.restore();

    ctx.restore();

  } else {
    // DESENHO DO FACÃO TRADICIONAL
    ctx.save();
    ctx.translate(5, 9);

    let bladeAngle = 0.2;
    if (player.isSlashing) {
      bladeAngle = -1.2 + player.slashProgress * 2.5;
    }
    ctx.rotate(bladeAngle);

    ctx.fillStyle = '#f4a261';
    ctx.fillRect(-3, -2, 7, 5);

    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(4, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#582f0e';
    ctx.fillRect(4, -1.5, 5, 3);

    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(8, -3, 2, 6);

    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(28, -3);
    ctx.lineTo(31, 1);
    ctx.lineTo(10, 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e0e1dd';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

// Efeito Visual de Corte
function drawSlashEffect() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const startA = player.slashArcStart;
  const endA = player.slashArcEnd;
  const currentArc = startA + (endA - startA) * player.slashProgress;
  const slashRadius = isTrimmerActive ? 55 : 45;

  ctx.beginPath();
  ctx.arc(0, 0, slashRadius, startA, currentArc);
  ctx.strokeStyle = isTrimmerActive 
    ? `rgba(254, 240, 138, ${1 - player.slashProgress * 0.5})` 
    : `rgba(255, 255, 255, ${1 - player.slashProgress * 0.7})`;
  ctx.lineWidth = isTrimmerActive ? 8 : 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, slashRadius - 4, startA, currentArc);
  ctx.strokeStyle = isTrimmerActive
    ? `rgba(249, 115, 22, ${0.9 - player.slashProgress * 0.7})`
    : `rgba(247, 127, 0, ${0.8 - player.slashProgress * 0.8})`;
  ctx.lineWidth = isTrimmerActive ? 5 : 3;
  ctx.stroke();

  ctx.restore();
}

// Balão de Diálogo do Bombeiro
function drawDialogueBubble() {
  if (!currentDialogue) return;

  ctx.save();
  ctx.font = 'bold 14px "Rajdhani", sans-serif';

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

  let bubbleX = player.x;
  let bubbleY = player.y - 38 - boxHeight / 2;
  let tailPointsDown = true;

  if (bubbleY - boxHeight / 2 < 12) {
    bubbleY = player.y + 38 + boxHeight / 2;
    tailPointsDown = false;
  }

  const halfW = boxWidth / 2;
  if (bubbleX - halfW < 12) bubbleX = 12 + halfW;
  if (bubbleX + halfW > canvas.width - 12) bubbleX = canvas.width - 12 - halfW;

  const left = bubbleX - halfW;
  const top = bubbleY - boxHeight / 2;

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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, left + 3, top + 3, boxWidth, boxHeight, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#181e28';
  ctx.lineWidth = 2.5;
  roundRect(ctx, left, top, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

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

// ========================================================
// FIM DE JOGO: VITÓRIA (3 MINUTOS) OU DERROTA (100% MATO)
// ========================================================

// Vitória por tempo (3 Minutos completados)
function gameVictory() {
  gameState = 'VICTORY';
  closeOffer();
  SoundFX.victory();

  const overlayCard = document.querySelector('.overlay-card');
  if (overlayCard) overlayCard.classList.remove('start-card');
  document.getElementById('overlayIcon').classList.remove('hidden');
  document.getElementById('overlayTitle').classList.remove('hidden');
  document.getElementById('overlayMessage').classList.remove('hidden');

  document.getElementById('overlayIcon').textContent = '🎖️👨‍🚒🎺';
  overlayTitle.textContent = 'FIM DE EXPEDIENTE!';
  overlayMessage.innerHTML = `
    <div class="release-phrase">"Entrar em forma para liberação"</div>
    Você sobreviveu aos 3 minutos de combate árduo contra o matagal!<br><br>
    <strong>Pontuação Acumulada:</strong> ${score}<br>
    <strong>Dinheiro Acumulado:</strong> R$ ${Math.floor(money)}<br>
    <strong>Recorde:</strong> ${highScore}
  `;
  startBtn.textContent = 'JOGAR NOVAMENTE';
  startBtn.classList.remove('big-start-btn');
  uiOverlay.classList.remove('hidden');
}

// Derrota por infestação
function gameOver() {
  gameState = 'GAMEOVER';
  closeOffer();
  SoundFX.gameOver();

  const overlayCard = document.querySelector('.overlay-card');
  if (overlayCard) overlayCard.classList.remove('start-card');
  document.getElementById('overlayIcon').classList.remove('hidden');
  document.getElementById('overlayTitle').classList.remove('hidden');
  document.getElementById('overlayMessage').classList.remove('hidden');

  document.getElementById('overlayIcon').textContent = '⚠️🌿🔥';
  overlayTitle.textContent = 'TERRENO ENGOLIDO!';
  overlayMessage.innerHTML = `O mato tomou conta de 100% do destacamento 17!<br><br>
    <strong>Pontos:</strong> ${score}<br>
    <strong>Dinheiro Acumulado:</strong> R$ ${Math.floor(money)}<br>
    <strong>Tempo Resistido:</strong> ${(TOTAL_GAME_TIME - timeRemaining).toFixed(0)} segundos`;
  startBtn.textContent = 'TENTAR NOVAMENTE';
  startBtn.classList.remove('big-start-btn');
  uiOverlay.classList.remove('hidden');
}

// Iniciar Jogo
function startGame() {
  score = 0;
  money = 0;
  timeRemaining = TOTAL_GAME_TIME;
  gameTime = 0;
  growthTimer = 0;
  trimmerOfferTimer = 0;
  combo = 0;
  isOfferOpen = false;
  isTrimmerActive = false;
  trimmerTimeRemaining = 0;
  noticeTimer = 0;

  particles = [];
  floatingTexts = [];
  speechTimer = 0;
  currentDialogue = null;
  availablePhrases = [];

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.facingAngle = 0;
  player.isSlashing = false;
  player.slashCooldown = BASE_SLASH_COOLDOWN;
  player.slashDuration = BASE_SLASH_DURATION;

  trimmerActiveBar.classList.add('hidden');
  trimmerOfferModal.classList.add('hidden');
  gameNotice.classList.add('hidden');
  mobileTrimmerButtons.classList.add('hidden');
  tBtnSlash.classList.remove('trimmer-mode');
  tSlashIcon.textContent = '🗡️';
  tSlashText.textContent = 'GOLPE (F)';

  initGrid();
  updateHUD();

  gameState = 'PLAYING';
  uiOverlay.classList.add('hidden');
}

const handleStartAction = (e) => {
  if (e) e.preventDefault();
  getAudioContext();
  startGame();
};

startBtn.addEventListener('click', handleStartAction);
startBtn.addEventListener('touchend', handleStartAction, { passive: false });

// No celular, toque na tela inicial também inicia a missão diretamente!
uiOverlay.addEventListener('click', (e) => {
  if (gameState === 'START') {
    handleStartAction(e);
  }
});
uiOverlay.addEventListener('touchend', (e) => {
  if (gameState === 'START') {
    handleStartAction(e);
  }
}, { passive: false });

// Game Loop
let lastFrameTime = performance.now();

function gameLoop(currentTime) {
  const dt = Math.min((currentTime - lastFrameTime) / 1000, 0.1);
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

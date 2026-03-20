const video = document.getElementById("video");
const canvas = document.getElementById("workCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const directionArrows = {
  up: document.getElementById("arrowUp"),
  left: document.getElementById("arrowLeft"),
  right: document.getElementById("arrowRight"),
  down: document.getElementById("arrowDown"),
};

let stream;
let animationId;
let previousFrame = null;
let previousCenterX = null;
let previousCenterY = null;
let lastSoundAt = 0;
let audioContext;
let pendingSoundTimeout = null;

const SOUND_DELAY_MS = 220;
const SOUND_COOLDOWN_MS = 350;
const PIXEL_DIFF_THRESHOLD = 28;
const MIN_MOVED_PIXELS = 24;
const DIRECTION_DELTA_THRESHOLD_PX = 4;

function setStatus(message) {
  statusEl.textContent = `Status: ${message}`;
}

function setActiveDirection(direction) {
  Object.values(directionArrows).forEach((el) => el.classList.remove("active"));
  if (direction && directionArrows[direction]) {
    directionArrows[direction].classList.add("active");
  }
}

function playDirectionSound(direction) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const now = audioContext.currentTime;
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  gainNode.connect(audioContext.destination);

  const tones = {
    left: [1046.5, 1318.5, 1568],
    right: [659.3, 830.6, 987.8],
    up: [1396.9, 1760, 2093],
    down: [392, 493.9, 587.3],
  };
  const partials = tones[direction] || tones.left;

  partials.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = index * 7;
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.8);
  });
}

function scheduleDirectionSound(direction) {
  if (pendingSoundTimeout) {
    clearTimeout(pendingSoundTimeout);
    pendingSoundTimeout = null;
  }

  pendingSoundTimeout = setTimeout(() => {
    const now = performance.now();
    if (now - lastSoundAt > SOUND_COOLDOWN_MS) {
      playDirectionSound(direction);
      lastSoundAt = now;
    }
    pendingSoundTimeout = null;
  }, SOUND_DELAY_MS);
}

function processFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const current = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  if (previousFrame) {
    const width = canvas.width;
    const height = canvas.height;
    const pixelStep = 4;
    let movedPixels = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let y = 0; y < height; y += pixelStep) {
      for (let x = 0; x < width; x += pixelStep) {
        const index = (y * width + x) * 4;
        const diff =
          Math.abs(current[index] - previousFrame[index]) +
          Math.abs(current[index + 1] - previousFrame[index + 1]) +
          Math.abs(current[index + 2] - previousFrame[index + 2]);

        if (diff > PIXEL_DIFF_THRESHOLD) {
          movedPixels += 1;
          weightedX += x;
          weightedY += y;
        }
      }
    }

    if (movedPixels > MIN_MOVED_PIXELS) {
      const currentCenterX = weightedX / movedPixels;
      const currentCenterY = weightedY / movedPixels;

      if (previousCenterX !== null && previousCenterY !== null) {
        const deltaX = currentCenterX - previousCenterX;
        const deltaY = currentCenterY - previousCenterY;
        const xDominant = Math.abs(deltaX) >= Math.abs(deltaY);

        if (xDominant && deltaX < -DIRECTION_DELTA_THRESHOLD_PX) {
          setStatus("movement: left -> sound played");
          setActiveDirection("left");
          scheduleDirectionSound("left");
        } else if (xDominant && deltaX > DIRECTION_DELTA_THRESHOLD_PX) {
          setStatus("movement: right -> sound played");
          setActiveDirection("right");
          scheduleDirectionSound("right");
        } else if (!xDominant && deltaY < -DIRECTION_DELTA_THRESHOLD_PX) {
          setStatus("movement: up -> sound played");
          setActiveDirection("up");
          scheduleDirectionSound("up");
        } else if (!xDominant && deltaY > DIRECTION_DELTA_THRESHOLD_PX) {
          setStatus("movement: down -> sound played");
          setActiveDirection("down");
          scheduleDirectionSound("down");
        } else {
          setStatus("movement detected");
          setActiveDirection(null);
        }
      }

      previousCenterX = currentCenterX;
      previousCenterY = currentCenterY;
    }
  }

  previousFrame = new Uint8ClampedArray(current);
  animationId = requestAnimationFrame(processFrame);
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    previousFrame = null;
    previousCenterX = null;
    previousCenterY = null;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus("camera started");
    setActiveDirection(null);

    processFrame();
  } catch (error) {
    setStatus(`camera error: ${error.message}`);
    setActiveDirection(null);
  }
}

function stopCamera() {
  if (pendingSoundTimeout) {
    clearTimeout(pendingSoundTimeout);
    pendingSoundTimeout = null;
  }

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  video.srcObject = null;
  previousFrame = null;
  previousCenterX = null;
  previousCenterY = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("stopped");
  setActiveDirection(null);
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);

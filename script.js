// ✅ Web Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Map notes to sample files
const notes = {
  C: 'C.mp3',
  D: 'D.mp3',
  E: 'E.mp3',
  F: 'F.mp3'
};

// Store loaded buffers
const buffers = {};

// Preload audio files
async function loadSamples() {
  for (let note in notes) {
    const response = await fetch(notes[note]);
    const arrayBuffer = await response.arrayBuffer();
    buffers[note] = await audioCtx.decodeAudioData(arrayBuffer);
  }
  console.log('Samples loaded:', Object.keys(buffers));
}

// Call preload
loadSamples();

// Variables for tilt & playback
let currentSource = null;
let currentFilter = null;
let baseTiltX = 0;
let baseTiltY = 0;
let basePlaybackRate = 1;

// Unlock AudioContext on first interaction
function unlockAudio() {
  if (audioCtx.state !== 'running') audioCtx.resume().then(() => console.log('AudioContext running'));
}

document.body.addEventListener('click', unlockAudio, { once: true });
document.body.addEventListener('touchstart', unlockAudio, { once: true });

// 🎹 Play sample with tilt control
function playSample(note) {
  if (!buffers[note]) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffers[note];

  const gain = audioCtx.createGain();
  gain.gain.value = 0.8;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  source.connect(filter).connect(gain).connect(audioCtx.destination);
  source.start();

  currentSource = source;
  currentFilter = filter;
  basePlaybackRate = 1;

  // Auto-calibrate tilt
  window.addEventListener('deviceorientation', function calibrate(e) {
    baseTiltX = e.beta;
    baseTiltY = e.gamma;
    window.removeEventListener('deviceorientation', calibrate);
  }, { once: true });
}

// Stop sample
function stopSample() {
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
    currentFilter.disconnect();
    currentFilter = null;
  }
}

// 📱 Device Orientation for tilt control
window.addEventListener('deviceorientation', (e) => {
  if (!currentSource) return;

  const tiltX = e.beta;
  const tiltY = e.gamma;

  const deltaX = tiltX - baseTiltX;
  const deltaY = tiltY - baseTiltY;

  // Pitch control via playbackRate (X tilt)
  const rateChange = deltaX / 90; // small tilt → small change
  currentSource.playbackRate.value = basePlaybackRate + rateChange;

  // Tone/brightness via filter frequency (Y tilt)
  const newFreq = 600 + deltaY * 15; // adjust sensitivity
  currentFilter.frequency.value = Math.max(200, Math.min(5000, newFreq));

  // Optional: visual feedback
  const brightness = Math.min(100, Math.abs(deltaY) * 2);
  document.body.style.background = `radial-gradient(circle, hsl(${brightness}, 80%, 30%) 0%, #000 90%)`;
});

// 🖱 / touch events for keys
document.querySelectorAll('.key').forEach((key) => {
  const note = key.dataset.note;

  function startNote() {
    key.classList.add('active');
    playSample(note);
  }

  function endNote() {
    key.classList.remove('active');
    stopSample();
  }

  key.addEventListener('touchstart', startNote);
  key.addEventListener('touchend', endNote);
  key.addEventListener('mousedown', startNote); // desktop
  key.addEventListener('mouseup', endNote);     // desktop
});

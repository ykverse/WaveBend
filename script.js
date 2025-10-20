// ✅ Web Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Notes frequency map
const notes = {
  C: 261.6,
  D: 293.7,
  E: 329.6,
  F: 349.2
};

// Variables
let currentOsc = null;
let baseFrequency = 0;
let baseTiltX = 0;
let baseTiltY = 0;
let lastShakeTime = 0;
let vibrato = false;

// 🎵 Play note
function playNote(freq) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 800;

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);

  osc.start();
  currentOsc = { osc, gain, filter };
}

// 🛑 Stop note
function stopNote() {
  if (currentOsc) {
    currentOsc.osc.stop();
    currentOsc.osc.disconnect();
    currentOsc = null;
  }
}

// 📱 Device Orientation listener
window.addEventListener("deviceorientation", (event) => {
  if (!currentOsc) return;

  const tiltX = event.beta;   // Front/back
  const tiltY = event.gamma;  // Left/right

  const deltaX = tiltX - baseTiltX;
  const deltaY = tiltY - baseTiltY;

  // 🎚 Pitch control (X tilt)
  const pitchChange = deltaX * 2; // sensitivity
  const newFreq = baseFrequency + pitchChange;
  currentOsc.osc.frequency.setValueAtTime(newFreq, audioCtx.currentTime);

  // 🎛 Tone/Brightness (Y tilt)
  const tone = 800 + deltaY * 20;
  currentOsc.filter.frequency.setValueAtTime(Math.abs(tone), audioCtx.currentTime);

  // 🌈 Visual feedback
  const brightness = Math.min(100, Math.abs(deltaY) * 2);
  document.body.style.background = `radial-gradient(circle, hsl(${brightness}, 80%, 30%) 0%, #000 90%)`;
});

// 📳 Shake detection for vibrato/echo
window.addEventListener("devicemotion", (event) => {
  if (!currentOsc) return;

  const acc = event.accelerationIncludingGravity;
  const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

  const now = Date.now();
  if (magnitude > 20 && now - lastShakeTime > 1000) {
    lastShakeTime = now;
    triggerVibrato();
  }
});

// 🌊 Vibrato effect
function triggerVibrato() {
  if (!currentOsc) return;
  vibrato = true;
  const osc = currentOsc.osc;

  let vibratoOsc = audioCtx.createOscillator();
  let vibratoGain = audioCtx.createGain();
  vibratoOsc.frequency.value = 6; // vibrato speed
  vibratoGain.gain.value = 10;    // depth

  vibratoOsc.connect(vibratoGain).connect(osc.frequency);
  vibratoOsc.start();

  // Stop vibrato after 2 sec
  setTimeout(() => {
    vibratoOsc.stop();
    vibratoOsc.disconnect();
    vibrato = false;
  }, 2000);
}

// 🖱 Key press logic
document.querySelectorAll(".key").forEach((key) => {
  key.addEventListener("touchstart", () => {
    const note = key.dataset.note;
    baseFrequency = notes[note];
    key.classList.add("active");

    // Auto-calibrate
    window.addEventListener(
      "deviceorientation",
      function calibrate(e) {
        baseTiltX = e.beta;
        baseTiltY = e.gamma;
        window.removeEventListener("deviceorientation", calibrate);
      },
      { once: true }
    );

    playNote(baseFrequency);
  });

  key.addEventListener("touchend", () => {
    key.classList.remove("active");
    stopNote();
  });
});

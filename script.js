const YOUTUBE_VIDEO_ID = "Iy-k38U6oWQ";

const overlay = document.getElementById("challengeOverlay");
const finalOverlay = document.getElementById("finalOverlay");
const answers = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const continueBtn = document.getElementById("continueBtn");
const restartBtn = document.getElementById("restartBtn");
const xpEl = document.getElementById("xp");
const correctEl = document.getElementById("correctCount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const missionCount = document.getElementById("missionCount");
const missionTitle = document.getElementById("missionTitle");
const missionDescription = document.getElementById("missionDescription");
const timerEl = document.getElementById("timer");

// Preguntas integradas en el propio JavaScript.
// Nota: esto no oculta las respuestas al inspeccionar el código.
// "time" = segundo del video en que se pausa. "answer" = posición de la correcta (0 = A, 1 = B, 2 = C).
const lessonData = {
  lessonTitle: "Laplace Challenge — Clase 4, parte 2",
  lessonDescription: "Sistemas de orden superior, comparación de respuestas y tiempo muerto",
  challenges: [
    { time: 120, title: "Orden superior", icon: "🧱", question: "En F(s) = ωn²p / [(s² + 2ζωn·s + ωn²)(s + p)], ¿qué se agrega a un sistema de segundo orden?", options: ["Un cero adicional en el numerador", "Un segundo valor de ζ", "Un polo adicional (s + p), que lo convierte en un sistema de orden 3"], answer: 2, explanation: "El factor (s + p) añade un polo y el denominador pasa a tener grado 3.", xp: 100 },
    { time: 235, title: "Compara las respuestas", icon: "📊", question: "En la gráfica comparativa, ¿cuál respuesta de segundo orden oscila antes de estabilizarse?", options: ["La subamortiguada", "La críticamente amortiguada", "La sobreamortiguada"], answer: 0, explanation: "Con ζ < 1 la salida sobrepasa el valor final y oscila antes de estabilizarse.", xp: 100 },
    { time: 300, title: "Tiempo muerto", icon: "⏳", question: "Al aumentar el orden del sistema, ¿qué aparece en la respuesta al escalón?", options: ["La salida crece sin límite", "Un tiempo muerto antes de que la salida empiece a subir", "La respuesta se vuelve instantánea"], answer: 1, explanation: "En los sistemas de orden superior aparece un tiempo muerto (tm): un retardo antes de que la salida reaccione.", xp: 100 },
    { time: 420, title: "Sistema de orden uno", icon: "1️⃣", question: "En el ejemplo de un solo circuito RC (o un solo tanque), ¿cómo empieza la respuesta al escalón?", options: ["Con un tiempo muerto largo", "Oscilando alrededor del valor final", "De inmediato, sin tiempo muerto"], answer: 2, explanation: "En un sistema de orden uno la salida empieza a subir enseguida, sin retardo inicial.", xp: 150 },
    { time: 620, title: "Más etapas, más orden", icon: "🔗", question: "En los circuitos RC en cascada, ¿qué pasa con la respuesta al pasar de orden uno a orden tres?", options: ["El tiempo muerto se hace mayor", "El tiempo muerto desaparece", "La respuesta se vuelve más rápida y sin retardo"], answer: 0, explanation: "Cada etapa RC adicional suma un polo, y el retardo inicial de la respuesta crece.", xp: 150 },
    { time: 720, title: "Identifica el orden", icon: "🔢", question: "¿Qué orden tiene G(s) = 500/(s³ + 24s² + 105s + 500)?", options: ["Orden 2", "Orden 3", "Orden 500"], answer: 1, explanation: "El orden lo da la mayor potencia de s en el denominador: aquí es s³, así que es de orden 3.", xp: 150 },
    { time: 835, title: "Desafío final", icon: "🏆", question: "¿Cuál es el orden de H(s) = 10000/(s⁴ + 44s³ + 585s² + 2600s + 10000)?", options: ["Orden 10000", "Orden 1", "Orden 4, por la mayor potencia de s en el denominador"], answer: 2, explanation: "La mayor potencia de s en el denominador es s⁴, por lo tanto H(s) es de orden 4.", xp: 200 }
  ]
};
let challenges = lessonData.challenges;

let current = 0;
let xp = 0;
let correct = 0;
let challengeOpen = false;
let answered = false;
let timer = null;
let seconds = 20;

// ============================================================
// YOUTUBE: reproductor + revisión del tiempo
// ============================================================
let player = null;        // objeto del reproductor de YouTube
let playerReady = false;  // true cuando el reproductor terminó de cargar
let watcher = null;       // intervalo que revisa el tiempo del video
let pendingPlay = false;  // por si se pide play antes de que cargue

// Carga la librería de YouTube. Cuando está lista, YouTube llama
// automáticamente a onYouTubeIframeAPIReady (debe ser una función global).
(function loadYouTubeAPI() {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = function () {
  // Reemplaza <div id="lessonVideo"> por el reproductor (un iframe)
  player = new YT.Player("lessonVideo", {
    videoId: YOUTUBE_VIDEO_ID,
    playerVars: {
      rel: 0,            // al pausar, solo sugiere videos de tu canal
      modestbranding: 1, // logo de YouTube más discreto
      playsinline: 1,    // reproduce dentro de la página en iPhone
      fs: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

function onPlayerReady() {
  playerReady = true;
  if (pendingPlay) playVideo();
}

// YouTube avisa cada vez que el video cambia de estado:
// 1 = reproduciendo, 2 = en pausa, 0 = terminó, 3 = cargando...
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    startWatcher();
  } else {
    stopWatcher();
  }
  if (event.data === YT.PlayerState.ENDED) {
    handleEnded();
  }
}

// Reemplaza al evento "timeupdate" del <video>, que YouTube no tiene:
// mientras el video se reproduce, consultamos el tiempo cada 250 ms.
function startWatcher() {
  stopWatcher();
  watcher = setInterval(checkChallenge, 250);
}

function stopWatcher() {
  clearInterval(watcher);
  watcher = null;
}

function checkChallenge() {
  if (!playerReady || challengeOpen || current >= challenges.length) return;
  const c = challenges[current];
  if (player.getCurrentTime() >= c.time) {
    pauseVideo();
    showChallenge(c);
  }
}

function handleEnded() {
  if (current < challenges.length && !challengeOpen) {
    current = challenges.length;
    updateDashboard();
    finish();
  }
}

// Funciones auxiliares para no repetir código ni fallar si
// el reproductor todavía no ha cargado.
function playVideo() {
  if (!playerReady) { pendingPlay = true; return; }
  pendingPlay = false;
  player.playVideo();
}

function pauseVideo() {
  if (playerReady) player.pauseVideo();
}

function restartVideo() {
  if (playerReady) player.seekTo(0, true);
}

// ============================================================
// LÓGICA DE LA ACTIVIDAD (igual que antes)
// ============================================================
function updateDashboard() {
  const done = current;
  const total = challenges.length || 1;
  const pct = Math.round((done / total) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `Misión ${done} de ${challenges.length}`;
  progressPercent.textContent = `${pct}%`;
  xpEl.textContent = xp;
  correctEl.textContent = correct;
  missionCount.textContent = `${String(Math.min(current + 1, challenges.length)).padStart(2,"0")} / ${String(challenges.length).padStart(2,"0")}`;
}

function showChallenge(c) {
  challengeOpen = true;
  answered = false;
  seconds = 20;
  clearInterval(timer);
  timerEl.textContent = seconds;

  document.getElementById("challengeTitle").textContent = c.title;
  document.getElementById("challengeQuestion").textContent = c.question;
  document.getElementById("challengeIcon").textContent = c.icon;
  feedback.textContent = "";
  feedback.className = "feedback";
  continueBtn.classList.add("hidden");
  answers.innerHTML = "";

  c.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer";
    btn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    btn.addEventListener("click", () => chooseAnswer(index));
    answers.appendChild(btn);
  });

  missionTitle.textContent = c.title;
  missionDescription.textContent = "Responde el reto para continuar con la clase.";
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  timer = setInterval(() => {
    seconds--;
    timerEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      if (!answered) chooseAnswer(-1);
    }
  }, 1000);
}

function chooseAnswer(index) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const c = challenges[current];
  const buttons = [...answers.querySelectorAll(".answer")];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === c.answer) b.classList.add("correct");
    if (i === index && index !== c.answer) b.classList.add("wrong");
  });

  if (index === c.answer) {
    correct++;
    xp += c.xp;
    feedback.textContent = `✓ ${c.explanation} +${c.xp} XP`;
    feedback.className = "feedback good";
  } else {
    feedback.textContent = index === -1
      ? `⏱️ Se acabó el tiempo. ${c.explanation}`
      : `✕ No esta vez. ${c.explanation}`;
    feedback.className = "feedback bad";
  }

  xpEl.textContent = xp;
  correctEl.textContent = correct;
  continueBtn.classList.remove("hidden");
}

continueBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  challengeOpen = false;
  current++;
  updateDashboard();

  if (current >= challenges.length) {
    finish();
    return;
  }

  missionTitle.textContent = "Sigue observando";
  missionDescription.textContent = "El siguiente reto aparecerá automáticamente durante la explicación.";
  playVideo();
});

function finish() {
  pauseVideo();
  document.getElementById("finalXP").textContent = xp;
  document.getElementById("finalCorrect").textContent = `${correct}/${challenges.length}`;
  document.getElementById("finalMessage").textContent =
    correct >= 5
      ? "Excelente trabajo. Completaste todos los retos de esta clase."
      : "Actividad completada. Puedes repetirla para reforzar los conceptos.";
  finalOverlay.classList.remove("hidden");
  finalOverlay.setAttribute("aria-hidden", "false");
  progressBar.style.width = "100%";
  progressText.textContent = `Misión ${challenges.length} de ${challenges.length}`;
  progressPercent.textContent = "100%";
}

restartBtn.addEventListener("click", () => {
  current = 0;
  xp = 0;
  correct = 0;
  challengeOpen = false;
  clearInterval(timer);
  finalOverlay.classList.add("hidden");
  finalOverlay.setAttribute("aria-hidden", "true");
  restartVideo();
  updateDashboard();
  missionTitle.textContent = "Prepárate";
  missionDescription.textContent = "Mira la clase y presta atención: aparecerán retos durante la explicación.";
  playVideo();
});

function loadQuestions() {
  document.title = lessonData.lessonTitle || document.title;
  document.querySelector(".topbar h1").textContent = lessonData.lessonTitle || "Laplace Challenge";
  document.querySelector(".topbar p").textContent = lessonData.lessonDescription || "Actividad interactiva";
  document.querySelector(".stats div:nth-child(2) strong").textContent = challenges.length;
  document.getElementById("missionCount").textContent = `01 / ${String(challenges.length).padStart(2,"0")}`;
  document.getElementById("progressText").textContent = `Misión 0 de ${challenges.length}`;
  document.getElementById("finalCorrect").textContent = `0/${challenges.length}`;
  updateDashboard();
}

loadQuestions();

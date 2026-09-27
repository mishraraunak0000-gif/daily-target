// ============================================
// DAILY TARGET APP
// ============================================

const STORAGE_KEY = "dailyTargetApp_v1";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  fixedTarget: {
    name: "",
    time: "",
    completed: false
  },

  dailyTarget: {
    name: "",
    time: "",
    completed: false,
    date: ""
  },

  streak: 0,
  bestStreak: 0,
  activeDays: 0,
  completedDays: {},
  reminder: null
};

let editingType = null;
let reminderTimer = null;


// ============================================
// DATE FUNCTIONS
// ============================================

function getTodayKey() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}


// ============================================
// SAVE DATA
// ============================================

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ============================================
// RESET DAILY STATUS
// ============================================

function checkNewDay() {
  const today = getTodayKey();

  if (data.dailyTarget.date !== today) {
    data.dailyTarget.completed = false;
    data.dailyTarget.date = today;
    data.fixedTarget.completed = false;

    save();
  }
}


// ============================================
// DISPLAY
// ============================================

function updateUI() {
  checkNewDay();

  document.getElementById("date").textContent = formatDate();

  document.getElementById("streak").textContent = data.streak;
  document.getElementById("bestStreak").textContent = data.bestStreak;
  document.getElementById("totalDays").textContent = data.activeDays;

  // Daily target
  document.getElementById("dailyTargetName").textContent =
    data.dailyTarget.name || "No target set";

  document.getElementById("dailyTargetTime").textContent =
    data.dailyTarget.time
      ? formatTime(data.dailyTarget.time)
      : "No time set";

  // Fixed target
  document.getElementById("fixedTargetName").textContent =
    data.fixedTarget.name || "No fixed target set";

  document.getElementById("fixedTargetTime").textContent =
    data.fixedTarget.time
      ? formatTime(data.fixedTarget.time)
      : "No time set";

  updateStatus(
    "dailyStatus",
    data.dailyTarget.completed
  );

  updateStatus(
    "fixedStatus",
    data.fixedTarget.completed
  );

  updateProgress();
  updateHistory();
}


function updateStatus(id, completed) {
  const element = document.getElementById(id);

  if (completed) {
    element.textContent = "✓ Completed";
    element.classList.add("done");
  } else {
    element.textContent = "Incomplete";
    element.classList.remove("done");
  }
}


function formatTime(time) {
  if (!time) return "No time set";

  const [hours, minutes] = time.split(":");

  const date = new Date();
  date.setHours(hours, minutes);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}


// ============================================
// PROGRESS
// ============================================

function updateProgress() {
  let total = 0;
  let completed = 0;

  if (data.dailyTarget.name) {
    total++;
    if (data.dailyTarget.completed) completed++;
  }

  if (data.fixedTarget.name) {
    total++;
    if (data.fixedTarget.completed) completed++;
  }

  const percentage =
    total === 0
      ? 0
      : Math.round((completed / total) * 100);

  document.getElementById("progressText").textContent =
    `${percentage}%`;

  document.getElementById("progressFill").style.width =
    `${percentage}%`;

  document.getElementById("completedCount").textContent =
    completed;
}


// ============================================
// MODAL
// ============================================

function openModal(type) {
  editingType = type;

  const target =
    type === "daily"
      ? data.dailyTarget
      : data.fixedTarget;

  document.getElementById("modalTitle").textContent =
    type === "daily"
      ? "Set Today's Target"
      : "Set Fixed Target";

  document.getElementById("targetInput").value =
    target.name || "";

  document.getElementById("timeInput").value =
    target.time || "";

  document.getElementById("modal").classList.remove("hidden");

  document.getElementById("targetInput").focus();
}


function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  editingType = null;
}


function saveTarget() {
  const name =
    document.getElementById("targetInput").value.trim();

  const time =
    document.getElementById("timeInput").value;

  if (!name) {
    alert("Please enter a target.");
    return;
  }

  if (!time) {
    alert("Please select a time.");
    return;
  }

  if (editingType === "daily") {
    data.dailyTarget.name = name;
    data.dailyTarget.time = time;
    data.dailyTarget.completed = false;
    data.dailyTarget.date = getTodayKey();
  }

  if (editingType === "fixed") {
    data.fixedTarget.name = name;
    data.fixedTarget.time = time;
    data.fixedTarget.completed = false;
  }

  save();
  closeModal();
  updateUI();
}


// ============================================
// COMPLETE TARGET
// ============================================

function completeTarget(type) {
  const target =
    type === "daily"
      ? data.dailyTarget
      : data.fixedTarget;

  if (!target.name) {
    alert("Set a target first.");
    return;
  }

  if (target.completed) return;

  target.completed = true;

  checkIfDayCompleted();

  save();
  updateUI();

  stopReminder();
}


function checkIfDayCompleted() {
  const dailyExists = Boolean(data.dailyTarget.name);
  const fixedExists = Boolean(data.fixedTarget.name);

  const dailyDone =
    !dailyExists || data.dailyTarget.completed;

  const fixedDone =
    !fixedExists || data.fixedTarget.completed;

  if (dailyDone && fixedDone && (dailyExists || fixedExists)) {

    const today = getTodayKey();

    if (!data.completedDays[today]) {
      data.completedDays[today] = true;
      data.activeDays++;

      updateStreak();
    }
  }
}


// ============================================
// STREAK
// ============================================

function updateStreak() {
  let streak = 0;

  const date = new Date();

  while (true) {
    const key =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    if (data.completedDays[key]) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  data.streak = streak;

  if (streak > data.bestStreak) {
    data.bestStreak = streak;
  }
}


// ============================================
// HISTORY
// ============================================

function updateHistory() {
  const container = document.getElementById("history");

  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {

    const date = new Date();

    date.setDate(date.getDate() - i);

    const key =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    const label =
      i === 0
        ? "Today"
        : date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short"
          });

    const row = document.createElement("div");

    row.className = "history-row";

    row.innerHTML = `
      <span class="history-day">${label}</span>
      <span class="history-status">
        ${data.completedDays[key] ? "✅" : "—"}
      </span>
    `;

    container.appendChild(row);
  }
}


// ============================================
// REMINDER SYSTEM
// ============================================

function checkTargetTimes() {
  const now = new Date();

  const currentHours =
    String(now.getHours()).padStart(2, "0");

  const currentMinutes =
    String(now.getMinutes()).padStart(2, "0");

  const currentTime =
    `${currentHours}:${currentMinutes}`;

  if (
    data.dailyTarget.name &&
    data.dailyTarget.time === currentTime &&
    !data.dailyTarget.completed
  ) {
    showReminder(
      "daily",
      data.dailyTarget.name
    );
  }

  if (
    data.fixedTarget.name &&
    data.fixedTarget.time === currentTime &&
    !data.fixedTarget.completed
  ) {
    showReminder(
      "fixed",
      data.fixedTarget.name
    );
  }
}


function showReminder(type, targetName) {

  if (reminderTimer) {
    clearTimeout(reminderTimer);
  }

  data.reminder = {
    type: type
  };

  document.getElementById("reminderText").textContent =
    `"${targetName}" is still incomplete.`;

  document.getElementById("reminder")
    .classList.remove("hidden");

  playAlarm();

  sendNotification(
    "Target Reminder",
    `${targetName} is still incomplete.`
  );

  save();

  // Repeat after one hour
  reminderTimer = setTimeout(() => {

    const target =
      type === "daily"
        ? data.dailyTarget
        : data.fixedTarget;

    if (!target.completed) {
      showReminder(type, target.name);
    }

  }, 60 * 60 * 1000);
}


function stopReminder() {

  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }

  data.reminder = null;

  document.getElementById("reminder")
    .classList.add("hidden");

  save();
}


function playAlarm() {
  try {
    const audioContext =
      new (window.AudioContext ||
        window.webkitAudioContext)();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.frequency.value = 800;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    gain.gain.setValueAtTime(
      0.25,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 1
    );

    oscillator.stop(
      audioContext.currentTime + 1
    );

  } catch (error) {
    console.log("Audio unavailable.");
  }
}


// ============================================
// NOTIFICATIONS
// ============================================

async function enableNotifications() {

  if (!("Notification" in window)) {
    alert("Your browser does not support notifications.");
    return;
  }

  const permission =
    await Notification.requestPermission();

  if (permission === "granted") {
    document.getElementById("notificationBtn")
      .textContent = "✓ Notifications Enabled";
  } else {
    alert("Notifications were not enabled.");
  }
}


function sendNotification(title, body) {

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body: body
    });
  }
}


// ============================================
// BUTTONS
// ============================================

document.getElementById("editDaily")
  .addEventListener("click", () => {
    openModal("daily");
  });

document.getElementById("editFixed")
  .addEventListener("click", () => {
    openModal("fixed");
  });

document.getElementById("saveTarget")
  .addEventListener("click", saveTarget);

document.getElementById("closeModal")
  .addEventListener("click", closeModal);

document.getElementById("dailyComplete")
  .addEventListener("click", () => {
    completeTarget("daily");
  });

document.getElementById("fixedComplete")
  .addEventListener("click", () => {
    completeTarget("fixed");
  });

document.getElementById("reminderComplete")
  .addEventListener("click", () => {

    if (!data.reminder) return;

    completeTarget(data.reminder.type);
  });

document.getElementById("remindLater")
  .addEventListener("click", () => {

    document.getElementById("reminder")
      .classList.add("hidden");

    if (data.reminder) {

      const type = data.reminder.type;

      reminderTimer = setTimeout(() => {

        const target =
          type === "daily"
            ? data.dailyTarget
            : data.fixedTarget;

        if (!target.completed) {
          showReminder(type, target.name);
        }

      }, 60 * 60 * 1000);
    }
  });

document.getElementById("notificationBtn")
  .addEventListener("click", enableNotifications);


// ============================================
// START APP
// ============================================

checkNewDay();
updateUI();

// Check the clock every 30 seconds
setInterval(checkTargetTimes, 30000);

// Update display every minute
setInterval(updateUI, 60000);

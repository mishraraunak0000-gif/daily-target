/* =========================================================
   DAILY TARGET v2
   Multi-task planner + Fixed Target + Study Timer
   + Streak + Notifications + Weekly Statistics
   ========================================================= */


/* =========================
   STORAGE
   ========================= */

const STORAGE_KEY = "dailyTargetApp_v2";

const defaultData = {
  fixedTarget: {
    name: "",
    time: "",
    completedDates: {}
  },

  tasks: [],

  study: {
    minutesByDate: {}
  },

  records: {},

  bestStreak: 0,

  notificationsEnabled: false
};

let data = loadData();


function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(defaultData);
    }

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(defaultData),
      ...parsed,
      fixedTarget: {
        ...defaultData.fixedTarget,
        ...(parsed.fixedTarget || {})
      },
      study: {
        ...defaultData.study,
        ...(parsed.study || {})
      },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      records: parsed.records || {}
    };

  } catch (error) {
    console.error("Could not load data:", error);
    return structuredClone(defaultData);
  }
}


function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}



/* =========================
   DATE & TIME HELPERS
   ========================= */

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function dateFromKey(key) {
  const parts = key.split("-");

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}


function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}


function formatDate(dateKey) {
  if (!dateKey) return "";

  const date = dateFromKey(dateKey);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


function formatShortDate(dateKey) {
  if (!dateKey) return "";

  const date = dateFromKey(dateKey);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}


function formatTime(time) {
  if (!time) return "No time";

  const [hours, minutes] = time.split(":");

  const date = new Date();

  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));
  date.setSeconds(0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}


function getDateTime(dateKey, time) {
  if (!dateKey || !time) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );
}



/* =========================
   DOM HELPERS
   ========================= */

function $(id) {
  return document.getElementById(id);
}


function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}


function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}



/* =========================
   INITIAL SETUP
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

  setupButtons();

  checkNewDay();

  updateAll();

  startReminderChecker();

  startTimerLoop();

});



/* =========================
   NEW DAY / RECORD SYSTEM
   ========================= */

function checkNewDay() {

  const today = getTodayKey();

  if (!data.records[today]) {

    data.records[today] = {
      tasksTotal: 0,
      tasksCompleted: 0,
      fixedCompleted: false,
      studyMinutes: 0,
      completedDay: false
    };

    saveData();
  }

  updateRecordForToday();
}


function updateRecordForToday() {

  const today = getTodayKey();

  const todayTasks = data.tasks.filter(
    task => task.date === today
  );

  const completedTasks = todayTasks.filter(
    task => task.completed
  );

  const fixedCompleted =
    data.fixedTarget.completedDates[today] === true;

  const allTasksCompleted =
    todayTasks.length > 0 &&
    completedTasks.length === todayTasks.length;

  const dayCompleted =
    allTasksCompleted && fixedCompleted;

  data.records[today] = {
    tasksTotal: todayTasks.length,
    tasksCompleted: completedTasks.length,
    fixedCompleted: fixedCompleted,
    studyMinutes: getStudyMinutes(today),
    completedDay: dayCompleted
  };

  saveData();

  calculateStreak();
}



/* =========================
   STREAK SYSTEM
   ========================= */

/*
   Rule:
   - A completed day counts.
   - One missed day between completed days does NOT break streak.
   - Two consecutive missed days DO break streak.
*/


function calculateStreak() {

  const today = getTodayKey();

  let currentDate = dateFromKey(today);

  /*
    If today is not finished yet, start checking from yesterday.
  */

  let todayRecord = data.records[today];

  if (!todayRecord || !todayRecord.completedDay) {
    currentDate = addDays(currentDate, -1);
  }

  let streak = 0;
  let missedDays = 0;

  for (let i = 0; i < 3650; i++) {

    const key = getDateKey(currentDate);
    const record = data.records[key];

    if (record && record.completedDay) {

      streak++;
      missedDays = 0;

    } else {

      missedDays++;

      if (missedDays >= 2) {
        break;
      }
    }

    currentDate = addDays(currentDate, -1);
  }

  data.currentStreak = streak;

  if (streak > (data.bestStreak || 0)) {
    data.bestStreak = streak;
  }

  saveData();
}



/* =========================
   MAIN UI
   ========================= */

function updateAll() {

  updateHeader();

  updateRegularTarget();

  updateFixedTarget();

  updateStudyUI();

  updateTodaySummary();

  updateWeeklyStats();

  updateHistory();

  updateProgress();
}



/* =========================
   HEADER
   ========================= */

function updateHeader() {

  const today = getTodayKey();

  if ($("todayDate")) {
    $("todayDate").textContent =
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  if ($("bestStreak")) {
    $("bestStreak").textContent =
      data.bestStreak || 0;
  }
}



/* =========================
   REGULAR TARGET
   ========================= */

function updateRegularTarget() {

  const today = getTodayKey();

  const tasks = data.tasks.filter(
    task => task.date === today
  );

  const completed = tasks.filter(
    task => task.completed
  );

  if ($("dailyTargetName")) {

    if (tasks.length === 0) {
      $("dailyTargetName").textContent =
        "No tasks planned";
    } else {
      $("dailyTargetName").textContent =
        `${tasks.length} task${tasks.length === 1 ? "" : "s"} planned`;
    }
  }


  if ($("dailyTargetTime")) {

    if (tasks.length === 0) {
      $("dailyTargetTime").textContent =
        "Tap + to add tasks";
    } else {

      const sorted = [...tasks].sort(
        (a, b) => a.time.localeCompare(b.time)
      );

      const firstTime = sorted[0].time;

      $("dailyTargetTime").textContent =
        `First task: ${formatTime(firstTime)}`;
    }
  }


  if ($("regularTargetProgress")) {
    $("regularTargetProgress").textContent =
      `${completed.length} / ${tasks.length} completed`;
  }


  if ($("dailyStatus")) {

    if (tasks.length === 0) {

      $("dailyStatus").textContent =
        "No tasks added for today.";

    } else if (completed.length === tasks.length) {

      $("dailyStatus").textContent =
        "✓ All tasks completed";

    } else {

      $("dailyStatus").textContent =
        `${tasks.length - completed.length} task${
          tasks.length - completed.length === 1 ? "" : "s"
        } remaining`;
    }
  }


  if ($("dailyComplete")) {

    $("dailyComplete").textContent =
      tasks.length > 0 && completed.length === tasks.length
        ? "All Completed"
        : "Complete All";
  }


  renderTodayTaskPreview();
}


function renderTodayTaskPreview() {

  const container = $("regularTargetCard");

  if (!container) return;

  let oldPreview = container.querySelector(
    ".today-task-preview"
  );

  if (oldPreview) {
    oldPreview.remove();
  }

  const today = getTodayKey();

  const tasks = data.tasks
    .filter(task => task.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (tasks.length === 0) return;

  const preview = document.createElement("div");

  preview.className = "today-task-preview";

  tasks.slice(0, 3).forEach(task => {

    const row = document.createElement("div");

    row.className = "task-preview-row";

    row.innerHTML = `
      <span class="task-preview-check">
        ${task.completed ? "✓" : "○"}
      </span>

      <span class="task-preview-name">
        ${escapeHTML(task.name)}
      </span>

      <span class="task-preview-time">
        ${formatTime(task.time)}
      </span>
    `;

    preview.appendChild(row);
  });


  if (tasks.length > 3) {

    const more = document.createElement("div");

    more.className = "task-preview-more";

    more.textContent =
      `+ ${tasks.length - 3} more task${
        tasks.length - 3 === 1 ? "" : "s"
      }`;

    preview.appendChild(more);
  }


  const status = $("dailyStatus");

  if (status) {
    status.insertAdjacentElement(
      "afterend",
      preview
    );
  }
}



/* =========================
   FIXED TARGET
   ========================= */

function updateFixedTarget() {

  const today = getTodayKey();

  const target = data.fixedTarget;

  const completed =
    target.completedDates[today] === true;


  if ($("fixedTargetName")) {

    $("fixedTargetName").textContent =
      target.name || "No fixed target";
  }


  if ($("fixedTargetTime")) {

    $("fixedTargetTime").textContent =
      target.time
        ? formatTime(target.time)
        : "No time set";
  }


  if ($("fixedStatus")) {

    $("fixedStatus").textContent =
      completed
        ? "✓ Completed today"
        : "Not completed";
  }


  if ($("fixedComplete")) {

    $("fixedComplete").textContent =
      completed
        ? "Completed ✓"
        : "Mark Complete";
  }
}



/* =========================
   TASK PLANNER
   ========================= */

let plannerDate = getTodayKey();


function openRegularPlanner(date = getTodayKey()) {

  plannerDate = date;

  if ($("plannerDate")) {
    $("plannerDate").value = plannerDate;
  }

  renderPlannerTasks();

  show($("regularPlanner"));
}


function closeRegularPlanner() {
  hide($("regularPlanner"));
}


function renderPlannerTasks() {

  const container = $("regularTasksList");

  if (!container) return;

  container.innerHTML = "";

  const tasks = data.tasks
    .filter(task => task.date === plannerDate)
    .sort((a, b) => a.time.localeCompare(b.time));


  if (tasks.length === 0) {

    container.innerHTML = `
      <p class="empty-tasks">
        No tasks added yet.
      </p>
    `;

    return;
  }


  tasks.forEach(task => {

    const row = document.createElement("div");

    row.className =
      `planner-task ${task.completed ? "completed" : ""}`;


    row.innerHTML = `
      <label class="task-check-wrap">

        <input
          type="checkbox"
          class="planner-task-checkbox"
          data-task-id="${task.id}"
          ${task.completed ? "checked" : ""}
        >

        <span class="custom-check"></span>

      </label>

      <div class="planner-task-info">

        <strong>
          ${escapeHTML(task.name)}
        </strong>

        <span>
          ${formatDate(task.date)} • ${formatTime(task.time)}
        </span>

      </div>

      <button
        type="button"
        class="delete-task"
        data-delete-task="${task.id}"
        aria-label="Delete task"
      >
        ×
      </button>
    `;

    container.appendChild(row);
  });
}



/* =========================
   ADD TASK
   ========================= */

function openTaskModal() {

  if ($("taskNameInput")) {
    $("taskNameInput").value = "";
  }

  if ($("taskDateInput")) {
    $("taskDateInput").value =
      plannerDate || getTodayKey();
  }

  if ($("taskTimeInput")) {
    $("taskTimeInput").value = "";
  }

  show($("taskModal"));
}


function closeTaskModal() {
  hide($("taskModal"));
}


function saveTask() {

  const name =
    $("taskNameInput")?.value.trim();

  const date =
    $("taskDateInput")?.value;

  const time =
    $("taskTimeInput")?.value;


  if (!name) {
    alert("Please enter a task name.");
    return;
  }


  if (!date) {
    alert("Please select a date.");
    return;
  }


  if (!time) {
    alert("Please select a time.");
    return;
  }


  const task = {
    id:
      Date.now().toString() +
      Math.random().toString(36).slice(2),

    name: name,

    date: date,

    time: time,

    completed: false,

    snoozeUntil: null,

    lastNotified: null
  };


  data.tasks.push(task);

  plannerDate = date;

  saveData();

  updateAll();

  renderPlannerTasks();

  closeTaskModal();
}



/* =========================
   TASK CHECKBOX
   ========================= */

function toggleTask(taskId, completed) {

  const task = data.tasks.find(
    item => item.id === taskId
  );

  if (!task) return;

  task.completed = completed;

  if (completed) {
    task.snoozeUntil = null;
  }

  saveData();

  updateRecordForToday();

  updateAll();

  if (plannerDate) {
    renderPlannerTasks();
  }
}



/* =========================
   DELETE TASK
   ========================= */

function deleteTask(taskId) {

  const task = data.tasks.find(
    item => item.id === taskId
  );

  if (!task) return;

  const confirmed =
    confirm(`Delete "${task.name}"?`);

  if (!confirmed) return;

  data.tasks = data.tasks.filter(
    item => item.id !== taskId
  );

  saveData();

  updateAll();

  renderPlannerTasks();
}



/* =========================
   COMPLETE ALL TODAY'S TASKS
   ========================= */

function completeAllTodayTasks() {

  const today = getTodayKey();

  const tasks = data.tasks.filter(
    task => task.date === today
  );

  if (tasks.length === 0) {
    openRegularPlanner(today);
    return;
  }

  tasks.forEach(task => {
    task.completed = true;
    task.snoozeUntil = null;
  });

  saveData();

  updateRecordForToday();

  updateAll();

  renderPlannerTasks();
}



/* =========================
   FIXED TARGET EDITING
   ========================= */

let editingTargetType = "fixed";


function openFixedTargetModal() {

  editingTargetType = "fixed";

  if ($("modalTitle")) {
    $("modalTitle").textContent =
      "Change Fixed Target";
  }

  if ($("targetInput")) {
    $("targetInput").value =
      data.fixedTarget.name || "";
  }

  if ($("timeInput")) {
    $("timeInput").value =
      data.fixedTarget.time || "";
  }

  show($("modal"));
}


function closeMainModal() {
  hide($("modal"));
}


function saveFixedTarget() {

  const name =
    $("targetInput")?.value.trim();

  const time =
    $("timeInput")?.value;


  if (!name) {
    alert("Please enter a target name.");
    return;
  }


  if (!time) {
    alert("Please select a time.");
    return;
  }


  data.fixedTarget.name = name;

  data.fixedTarget.time = time;

  saveData();

  updateAll();

  closeMainModal();
}



/* =========================
   FIXED TARGET COMPLETE
   ========================= */

function completeFixedTarget() {

  const today = getTodayKey();

  if (!data.fixedTarget.name) {
    openFixedTargetModal();
    return;
  }

  data.fixedTarget.completedDates[today] = true;

  saveData();

  updateRecordForToday();

  updateAll();
}



/* =========================
   STUDY TIMER
   ========================= */

let timerMode = "stopwatch";

let timerRunning = false;

let timerInterval = null;

let timerStartedAt = null;

let timerAccumulatedSeconds = 0;

let countdownTotalSeconds = 0;



function getStudyMinutes(dateKey) {

  return Number(
    data.study.minutesByDate[dateKey] || 0
  );
}


function addStudyMinutes(dateKey, minutes) {

  if (!data.study.minutesByDate[dateKey]) {
    data.study.minutesByDate[dateKey] = 0;
  }

  data.study.minutesByDate[dateKey] += minutes;

  saveData();
}


function setTimerMode(mode) {

  if (timerRunning) {
    pauseStudyTimer();
  }

  timerMode = mode;

  timerAccumulatedSeconds = 0;

  countdownTotalSeconds = 0;

  if ($("stopwatchMode")) {
    $("stopwatchMode").classList.toggle(
      "active",
      mode === "stopwatch"
    );
  }

  if ($("countdownMode")) {
    $("countdownMode").classList.toggle(
      "active",
      mode === "countdown"
    );
  }

  if ($("countdownInput")) {
    $("countdownInput").classList.toggle(
      "hidden",
      mode !== "countdown"
    );
  }

  updateTimerDisplay();
}


function startStudyTimer() {

  if (timerRunning) return;


  if (timerMode === "countdown") {

    if (countdownTotalSeconds <= 0) {

      const minutes =
        Number(
          $("countdownMinutes")?.value || 0
        );

      if (!minutes || minutes <= 0) {
        alert("Enter countdown minutes first.");
        return;
      }

      countdownTotalSeconds =
        Math.floor(minutes * 60);
    }
  }


  timerRunning = true;

  timerStartedAt = Date.now();

  timerInterval = setInterval(
    updateTimerDisplay,
    500
  );

  updateTimerDisplay();
}


function pauseStudyTimer() {

  if (!timerRunning) return;

  const now = Date.now();

  const elapsed =
    Math.floor(
      (now - timerStartedAt) / 1000
    );


  if (timerMode === "stopwatch") {

    timerAccumulatedSeconds += elapsed;

  } else {

    timerAccumulatedSeconds += elapsed;
  }


  timerRunning = false;

  timerStartedAt = null;

  clearInterval(timerInterval);

  timerInterval = null;

  saveCurrentStudySession();

  updateTimerDisplay();
}


function resetStudyTimer() {

  if (timerRunning) {

    timerRunning = false;

    timerStartedAt = null;

    clearInterval(timerInterval);

    timerInterval = null;
  }

  timerAccumulatedSeconds = 0;

  countdownTotalSeconds = 0;

  updateTimerDisplay();
}


function finishCountdown() {

  if (!timerRunning) return;

  timerAccumulatedSeconds =
    countdownTotalSeconds;

  timerRunning = false;

  timerStartedAt = null;

  clearInterval(timerInterval);

  timerInterval = null;

  addStudyMinutes(
    getTodayKey(),
    Math.floor(countdownTotalSeconds / 60)
  );

  timerAccumulatedSeconds = 0;

  countdownTotalSeconds = 0;

  updateAll();

  updateTimerDisplay();

  alert("Countdown finished. Study time saved.");
}


function getCurrentTimerSeconds() {

  if (!timerRunning) {
    return timerAccumulatedSeconds;
  }

  const elapsed =
    Math.floor(
      (Date.now() - timerStartedAt) / 1000
    );

  if (timerMode === "stopwatch") {

    return timerAccumulatedSeconds + elapsed;

  } else {

    return Math.max(
      0,
      countdownTotalSeconds -
      (timerAccumulatedSeconds + elapsed)
    );
  }
}


function updateTimerDisplay() {

  if (!$("timerDisplay")) return;

  let seconds =
    getCurrentTimerSeconds();


  if (
    timerMode === "countdown" &&
    timerRunning &&
    seconds <= 0
  ) {

    finishCountdown();

    seconds = 0;
  }


  $("timerDisplay").textContent =
    formatDuration(seconds);
}


function formatDuration(totalSeconds) {

  totalSeconds =
    Math.max(
      0,
      Math.floor(totalSeconds)
    );

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;


  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}


function saveCurrentStudySession() {

  if (timerAccumulatedSeconds <= 0) {
    return;
  }

  const minutes =
    timerAccumulatedSeconds / 60;

  /*
    Keep partial minutes internally by rounding
    to the nearest minute for today's total.
  */

  const roundedMinutes =
    Math.max(1, Math.round(minutes));

  addStudyMinutes(
    getTodayKey(),
    roundedMinutes
  );

  timerAccumulatedSeconds = 0;

  updateAll();
}


function saveManualStudyTime() {

  const input =
    $("manualStudyTime");

  if (!input) return;

  const minutes =
    Number(input.value);


  if (!minutes || minutes <= 0) {

    alert("Enter the number of minutes studied.");

    return;
  }


  addStudyMinutes(
    getTodayKey(),
    Math.floor(minutes)
  );


  input.value = "";

  updateRecordForToday();

  updateAll();
}


function updateStudyUI() {

  const today = getTodayKey();

  const minutes =
    getStudyMinutes(today);


  if ($("studyTimeToday")) {

    $("studyTimeToday").textContent =
      formatStudyMinutes(minutes);
  }
}


function formatStudyMinutes(minutes) {

  minutes = Math.floor(minutes);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remaining =
    minutes % 60;

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
}


function startTimerLoop() {

  setInterval(() => {

    if (timerRunning) {
      updateTimerDisplay();
    }

  }, 500);
}



/* =========================
   TODAY SUMMARY
   ========================= */

function updateTodaySummary() {

  const today = getTodayKey();

  const tasks =
    data.tasks.filter(
      task => task.date === today
    );

  const completed =
    tasks.filter(
      task => task.completed
    );


  if ($("todayTaskSummary")) {

    $("todayTaskSummary").textContent =
      `${completed.length} / ${tasks.length}`;
  }


  if ($("todayStudySummary")) {

    $("todayStudySummary").textContent =
      formatStudyMinutes(
        getStudyMinutes(today)
      );
  }


  if ($("todayFixedSummary")) {

    const fixedDone =
      data.fixedTarget.completedDates[today] === true;

    $("todayFixedSummary").textContent =
      fixedDone
        ? "Completed ✓"
        : "Not completed";
  }
}



/* =========================
   PROGRESS
   ========================= */

function updateProgress() {

  const today = getTodayKey();

  const tasks =
    data.tasks.filter(
      task => task.date === today
    );

  const completed =
    tasks.filter(
      task => task.completed
    );


  const fixedCompleted =
    data.fixedTarget.completedDates[today] === true;


  const totalItems =
    tasks.length + 1;

  const completedItems =
    completed.length +
    (fixedCompleted ? 1 : 0);


  let percentage = 0;

  if (totalItems > 0) {

    percentage =
      Math.round(
        (completedItems / totalItems) * 100
      );
  }


  if ($("progressPercent")) {
    $("progressPercent").textContent =
      `${percentage}%`;
  }


  if ($("progressFill")) {
    $("progressFill").style.width =
      `${percentage}%`;
  }


  if ($("progressText")) {

    $("progressText").textContent =
      `${completedItems} of ${totalItems} completed`;
  }
}



/* =========================
   WEEKLY STATISTICS
   ========================= */

function getLastSevenDays() {

  const days = [];

  const today =
    dateFromKey(getTodayKey());


  for (let i = 6; i >= 0; i--) {

    const date =
      addDays(today, -i);

    days.push(
      getDateKey(date)
    );
  }


  return days;
}


function updateWeeklyStats() {

  const days =
    getLastSevenDays();


  let totalStudy = 0;

  let totalTasks = 0;

  let completedTasks = 0;


  days.forEach(day => {

    totalStudy +=
      getStudyMinutes(day);


    const tasks =
      data.tasks.filter(
        task => task.date === day
      );


    totalTasks += tasks.length;


    completedTasks +=
      tasks.filter(
        task => task.completed
      ).length;
  });


  if ($("weeklyStudyTotal")) {

    $("weeklyStudyTotal").textContent =
      formatStudyMinutes(totalStudy);
  }


  if ($("weeklyTasksCompleted")) {

    $("weeklyTasksCompleted").textContent =
      completedTasks;
  }


  if ($("weeklyTasksTotal")) {

    $("weeklyTasksTotal").textContent =
      totalTasks;
  }


  if ($("weeklyBestStreak")) {

    $("weeklyBestStreak").textContent =
      data.bestStreak || 0;
  }


  renderWeeklyChart(days);
  renderWeeklyHistory(days);
}


function renderWeeklyChart(days) {

  const container =
    $("weeklyChart");

  if (!container) return;

  container.innerHTML = "";


  const values =
    days.map(
      day => getStudyMinutes(day)
    );


  const max =
    Math.max(
      ...values,
      1
    );


  const chart =
    document.createElement("div");

  chart.className =
    "chart-bars";


  days.forEach((day, index) => {

    const value =
      values[index];


    const barHeight =
      Math.max(
        5,
        Math.round(
          (value / max) * 150
        )
      );


    const column =
      document.createElement("div");

    column.className =
      "chart-column";


    const valueText =
      document.createElement("span");

    valueText.className =
      "chart-value";

    valueText.textContent =
      `${value}m`;


    const bar =
      document.createElement("div");

    bar.className =
      "chart-bar";

    bar.style.height =
      `${barHeight}px`;


    const label =
      document.createElement("span");

    label.className =
      "chart-label";

    label.textContent =
      dateFromKey(day).toLocaleDateString(
        "en-IN",
        { weekday: "short" }
      ).slice(0, 3);


    column.appendChild(valueText);

    column.appendChild(bar);

    column.appendChild(label);

    chart.appendChild(column);
  });


  container.appendChild(chart);
}


function renderWeeklyHistory(days) {

  const container =
    $("weeklyHistory");

  if (!container) return;

  container.innerHTML = "";


  days.forEach(day => {

    const tasks =
      data.tasks.filter(
        task => task.date === day
      );

    const completed =
      tasks.filter(
        task => task.completed
      ).length;


    const study =
      getStudyMinutes(day);


    const row =
      document.createElement("div");

    row.className =
      "weekly-history-row";


    row.innerHTML = `
      <span>
        ${formatShortDate(day)}
      </span>

      <span>
        ${completed}/${tasks.length} tasks
      </span>

      <strong>
        ${formatStudyMinutes(study)}
      </strong>
    `;


    container.appendChild(row);
  });
}



/* =========================
   HISTORY
   ========================= */

function updateHistory() {

  const container =
    $("history");

  if (!container) return;


  const records =
    Object.entries(data.records)
      .sort(
        (a, b) => b[0].localeCompare(a[0])
      )
      .slice(0, 30);


  if (records.length === 0) {

    container.innerHTML =
      "<p>No history yet.</p>";

    return;
  }


  container.innerHTML = "";


  records.forEach(([date, record]) => {

    const row =
      document.createElement("div");

    row.className =
      "history-row";


    row.innerHTML = `
      <div>
        <strong>
          ${formatDate(date)}
        </strong>

        <small>
          ${record.tasksCompleted}/${record.tasksTotal} tasks
          • ${formatStudyMinutes(record.studyMinutes)}
        </small>
      </div>

      <span class="history-status">
        ${
          record.completedDay
            ? "✓ Complete"
            : "Incomplete"
        }
      </span>
    `;


    container.appendChild(row);
  });
}



/* =========================
   NOTIFICATIONS
   ========================= */

async function enableNotifications() {

  if (!("Notification" in window)) {

    alert(
      "This browser does not support notifications."
    );

    return;
  }


  try {

    const permission =
      await Notification.requestPermission();


    if (permission === "granted") {

      data.notificationsEnabled = true;

      saveData();

      if ($("notificationBtn")) {

        $("notificationBtn").textContent =
          "✓ Notifications Enabled";
      }


      new Notification("Daily Target", {
        body:
          "Notifications are now enabled."
      });

    } else {

      data.notificationsEnabled = false;

      saveData();

      alert(
        "Notifications were not enabled. Check your browser's site notification permission."
      );
    }

  } catch (error) {

    console.error(
      "Notification error:",
      error
    );

    alert(
      "Could not enable notifications."
    );
  }
}


function sendNotification(task) {

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }


  const notification =
    new Notification(
      "⏰ Daily Target Reminder",
      {
        body:
          `${task.name}\nTime: ${formatTime(task.time)}`,
        tag:
          `daily-target-${task.id}`,
        renotify: true
      }
    );


  notification.onclick = () => {

    window.focus();

    openRegularPlanner(task.date);

    notification.close();
  };
}



/* =========================
   REMINDER MODAL
   ========================= */

let activeReminderTaskId = null;


function showReminder(task) {

  if (!task) return;


  activeReminderTaskId =
    task.id;


  if ($("reminderText")) {

    $("reminderText").innerHTML =
      `<strong>${escapeHTML(task.name)}</strong><br>
       Scheduled for ${formatTime(task.time)}`;
  }


  show($("reminder"));
}


function closeReminder() {

  activeReminderTaskId = null;

  hide($("reminder"));
}


function completeReminderTask() {

  if (!activeReminderTaskId) return;


  const task =
    data.tasks.find(
      item =>
        item.id === activeReminderTaskId
    );


  if (task) {

    task.completed = true;

    task.snoozeUntil = null;

    saveData();

    updateRecordForToday();

    updateAll();
  }


  closeReminder();
}


function remindLater() {

  if (!activeReminderTaskId) return;


  const task =
    data.tasks.find(
      item =>
        item.id === activeReminderTaskId
    );


  if (task) {

    task.snoozeUntil =
      Date.now() +
      60 * 60 * 1000;

    saveData();
  }


  closeReminder();
}



/* =========================
   REMINDER CHECKER
   ========================= */

function startReminderChecker() {

  checkTargetTimes();

  setInterval(
    checkTargetTimes,
    10000
  );
}


function checkTargetTimes() {

  const now =
    new Date();


  const today =
    getTodayKey();


  const todayTasks =
    data.tasks.filter(
      task =>
        task.date === today &&
        !task.completed
    );


  todayTasks.forEach(task => {

    if (!task.time) return;


    const scheduled =
      getDateTime(
        task.date,
        task.time
      );


    if (!scheduled) return;


    /*
      Reminder can trigger from the exact task time
      until one hour after it.
    */

    const difference =
      now.getTime() -
      scheduled.getTime();


    const withinReminderWindow =
      difference >= 0 &&
      difference <= 60 * 60 * 1000;


    if (!withinReminderWindow) {
      return;
    }


    if (
      task.snoozeUntil &&
      Date.now() < task.snoozeUntil
    ) {
      return;
    }


    /*
      Prevent the same task from producing
      the same notification repeatedly.
    */

    const reminderKey =
      `${task.date}_${task.time}`;


    if (
      task.lastNotified === reminderKey
    ) {
      return;
    }


    task.lastNotified =
      reminderKey;


    saveData();


    sendNotification(task);

    showReminder(task);
  });
}



/* =========================
   BUTTONS & EVENT LISTENERS
   ========================= */

function setupButtons() {

  /*
    Regular target
  */

  if ($("openRegularTarget")) {

    $("openRegularTarget")
      .addEventListener(
        "click",
        event => {
          event.stopPropagation();
          openRegularPlanner();
        }
      );
  }


  if ($("editDaily")) {

    $("editDaily")
      .addEventListener(
        "click",
        event => {
          event.stopPropagation();
          openRegularPlanner();
        }
      );
  }


  if ($("regularTargetCard")) {

    $("regularTargetCard")
      .addEventListener(
        "click",
        event => {

          if (
            event.target.closest("button") ||
            event.target.closest("input")
          ) {
            return;
          }

          openRegularPlanner();
        }
      );
  }


  /*
    Complete all
  */

  if ($("dailyComplete")) {

    $("dailyComplete")
      .addEventListener(
        "click",
        event => {
          event.stopPropagation();
          completeAllTodayTasks();
        }
      );
  }


  /*
    Planner close
  */

  if ($("closeRegularPlanner")) {

    $("closeRegularPlanner")
      .addEventListener(
        "click",
        closeRegularPlanner
      );
  }


  /*
    Planner date
  */

  if ($("plannerDate")) {

    $("plannerDate")
      .addEventListener(
        "change",
        event => {

          plannerDate =
            event.target.value ||
            getTodayKey();

          renderPlannerTasks();
        }
      );
  }


  /*
    Add task
  */

  if ($("addTaskBtn")) {

    $("addTaskBtn")
      .addEventListener(
        "click",
        openTaskModal
      );
  }


  /*
    Task modal close
  */

  if ($("closeTaskModal")) {

    $("closeTaskModal")
      .addEventListener(
        "click",
        closeTaskModal
      );
  }


  /*
    Save task
  */

  if ($("saveTaskBtn")) {

    $("saveTaskBtn")
      .addEventListener(
        "click",
        saveTask
      );
  }


  /*
    Task checkbox/delete
  */

  if ($("regularTasksList")) {

    $("regularTasksList")
      .addEventListener(
        "change",
        event => {

          if (
            event.target.classList.contains(
              "planner-task-checkbox"
            )
          ) {

            const id =
              event.target.dataset.taskId;

            toggleTask(
              id,
              event.target.checked
            );
          }
        }
      );


    $("regularTasksList")
      .addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-delete-task]"
            );

          if (!button) return;

          deleteTask(
            button.dataset.deleteTask
          );
        }
      );
  }


  /*
    Save planner
  */

  if ($("saveRegularPlan")) {

    $("saveRegularPlan")
      .addEventListener(
        "click",
        () => {

          saveData();

          updateRecordForToday();

          updateAll();

          closeRegularPlanner();
        }
      );
  }


  /*
    Fixed target
  */

  if ($("editFixed")) {

    $("editFixed")
      .addEventListener(
        "click",
        openFixedTargetModal
      );
  }


  if ($("fixedComplete")) {

    $("fixedComplete")
      .addEventListener(
        "click",
        completeFixedTarget
      );
  }


  /*
    Old modal
  */

  if ($("closeModal")) {

    $("closeModal")
      .addEventListener(
        "click",
        closeMainModal
      );
  }


  if ($("saveTarget")) {

    $("saveTarget")
      .addEventListener(
        "click",
        saveFixedTarget
      );
  }


  /*
    Study modes
  */

  if ($("stopwatchMode")) {

    $("stopwatchMode")
      .addEventListener(
        "click",
        () => setTimerMode("stopwatch")
      );
  }


  if ($("countdownMode")) {

    $("countdownMode")
      .addEventListener(
        "click",
        () => setTimerMode("countdown")
      );
  }


  /*
    Study timer controls
  */

  if ($("startStudyTimer")) {

    $("startStudyTimer")
      .addEventListener(
        "click",
        startStudyTimer
      );
  }


  if ($("pauseStudyTimer")) {

    $("pauseStudyTimer")
      .addEventListener(
        "click",
        pauseStudyTimer
      );
  }


  if ($("resetStudyTimer")) {

    $("resetStudyTimer")
      .addEventListener(
        "click",
        resetStudyTimer
      );
  }


  if ($("saveManualStudyTime")) {

    $("saveManualStudyTime")
      .addEventListener(
        "click",
        saveManualStudyTime
      );
  }


  /*
    Notifications
  */

  if ($("notificationBtn")) {

    $("notificationBtn")
      .addEventListener(
        "click",
        enableNotifications
      );
  }


  /*
    Reminder buttons
  */

  if ($("reminderComplete")) {

    $("reminderComplete")
      .addEventListener(
        "click",
        completeReminderTask
      );
  }


  if ($("remindLater")) {

    $("remindLater")
      .addEventListener(
        "click",
        remindLater
      );
  }
}



/* =========================
   SECURITY / TEXT HELPERS
   ========================= */

function escapeHTML(text) {

  if (text === null || text === undefined) {
    return "";
  }

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



/* =========================
   INITIAL NOTIFICATION BUTTON
   ========================= */

function updateNotificationButton() {

  if (!$("notificationBtn")) return;


  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {

    $("notificationBtn").textContent =
      "✓ Notifications Enabled";

  } else {

    $("notificationBtn").textContent =
      "Enable Notifications";
  }
}


setTimeout(
  updateNotificationButton,
  100
);

// =========================================================
// DAILY TARGET — FINAL JAVASCRIPT
// =========================================================

const STORAGE_KEY = "dailyTargetApp_final_v1";
const OLD_KEYS = [
"dailyTargetApp_v1",
"dailyTargetApp_v2"
];

const $ = (id) => document.getElementById(id);

// =========================================================
// DATE / ID HELPERS
// =========================================================

function todayKey() {
const d = new Date();

return ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")};
}

function dateFromKey(key) {
const [year, month, day] = key.split("-").map(Number);

return new Date(year, month - 1, day);
}

function makeId(prefix = "id") {
return ${prefix}_${Date.now()}_${Math.random()   .toString(36)   .slice(2, 8)};
}

function formatDateLong(key = todayKey()) {
return dateFromKey(key).toLocaleDateString("en-IN", {
weekday: "long",
day: "numeric",
month: "long",
year: "numeric"
});
}

function formatDateShort(key) {
return dateFromKey(key).toLocaleDateString("en-IN", {
day: "numeric",
month: "short",
year: "numeric"
});
}

function dateLabel(key) {
return dateFromKey(key).toLocaleDateString("en-IN", {
weekday: "long",
day: "numeric",
month: "long",
year: "numeric"
});
}

function formatTime(time) {
if (!time) return "No time set";

const [hours, minutes] = time.split(":").map(Number);

const d = new Date();

d.setHours(hours, minutes, 0, 0);

return d.toLocaleTimeString("en-IN", {
hour: "numeric",
minute: "2-digit"
});
}

function formatClock(milliseconds) {
const totalSeconds = Math.max(
0,
Math.floor(milliseconds / 1000)
);

const hours = Math.floor(totalSeconds / 3600);

const minutes = Math.floor(
(totalSeconds % 3600) / 60
);

const seconds = totalSeconds % 60;

return ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")};
}

function formatMinutes(seconds) {
return ${Math.floor(Math.max(0, seconds) / 60)} min;
}

function escapeHtml(value) {
return String(value).replace(
/[&<>'"]/g,
character => ({
"&": "&",
"<": "<",
">": ">",
"'": "'",
'"': """
}[character])
);
}

// =========================================================
// DATA
// =========================================================

function emptyData() {
return {
version: 1,

fixedTargets: [],  

tasks: {},  

studyByDate: {},  

completedDays: {},  

notified: {},  

bestStreak: 0,  

streak: 0

};
}

function normalizeTask(task, dateFallback = todayKey()) {
return {
id: task.id || makeId("task"),

name: String(  
  task.name ||  
  task.title ||  
  ""  
).trim(),  

date:  
  task.date ||  
  dateFallback,  

time:  
  task.time ||  
  "",  

completed:  
  Boolean(  
    task.completed ||  
    task.done  
  )

};
}

function normalizeFixed(target) {
const completedDate =
target.completedDate ||
(target.completed
? todayKey()
: "");

return {
id:
target.id ||
makeId("fixed"),

name:  
  String(  
    target.name ||  
    target.title ||  
    ""  
  ).trim(),  

time:  
  target.time ||  
  "",  

completed:  
  completedDate === todayKey(),  

completedDate

};
}

function normalizeData(input) {
const data = emptyData();

data.bestStreak =
Number.isFinite(input.bestStreak)
? input.bestStreak
: 0;

data.streak =
Number.isFinite(input.streak)
? input.streak
: 0;

if (Array.isArray(input.fixedTargets)) {

data.fixedTargets =  
  input.fixedTargets  
    .map(normalizeFixed)  
    .filter(target => target.name);

}

if (
input.tasks &&
typeof input.tasks === "object"
) {

for (  
  const [date, list]  
  of Object.entries(input.tasks)  
) {  

  if (Array.isArray(list)) {  

    data.tasks[date] =  
      list  
        .map(task =>  
          normalizeTask(task, date)  
        )  
        .filter(task => task.name);  

  }  

}

}

if (
input.studyByDate &&
typeof input.studyByDate === "object"
) {

for (  
  const [date, value]  
  of Object.entries(input.studyByDate)  
) {  

  const seconds =  
    typeof value === "object"  

      ? Number(  
          value.seconds ||  
          value.minutes * 60 ||  
          0  
        )  

      : Number(value);  


  if (seconds > 0) {  

    data.studyByDate[date] =  
      Math.round(seconds);  

  }  

}

}

data.completedDays = {
...(input.completedDays || {})
};

data.notified = {
...(input.notified || {})
};

return data;
}

// =========================================================
// OLD DATA MIGRATION
// =========================================================

function migrateData() {

let currentData = null;

try {

currentData =  
  JSON.parse(  
    localStorage.getItem(STORAGE_KEY) ||  
    "null"  
  );

} catch (_) {}

if (currentData) {

return normalizeData(currentData);

}

for (const key of OLD_KEYS) {

try {  

  const old =  
    JSON.parse(  
      localStorage.getItem(key) ||  
      "null"  
    );  


  if (!old) continue;  


  const migrated =  
    emptyData();  


  // Fixed targets  

  if (Array.isArray(old.fixedTargets)) {  

    migrated.fixedTargets =  
      old.fixedTargets  
        .map(normalizeFixed)  
        .filter(target => target.name);  

  }  

  else if (  
    old.fixedTarget &&  
    old.fixedTarget.name  
  ) {  

    migrated.fixedTargets.push(  
      normalizeFixed(old.fixedTarget)  
    );  

  }  


  // New-style task storage  

  if (  
    old.tasks &&  
    typeof old.tasks === "object"  
  ) {  

    for (  
      const [date, list]  
      of Object.entries(old.tasks)  
    ) {  

      if (Array.isArray(list)) {  

        migrated.tasks[date] =  
          list  
            .map(task =>  
              normalizeTask(task, date)  
            )  
            .filter(task => task.name);  

      }  

    }  

  }  


  // Old single daily target  

  if (  
    old.dailyTarget &&  
    old.dailyTarget.name  
  ) {  

    const date =  
      old.dailyTarget.date ||  
      todayKey();  


    migrated.tasks[date] =  
      migrated.tasks[date] || [];  


    migrated.tasks[date].push(  
      normalizeTask(  
        {  
          name:  
            old.dailyTarget.name,  

          time:  
            old.dailyTarget.time,  

          completed:  
            old.dailyTarget.completed,  

          date  
        },  
        date  
      )  
    );  

  }  


  // Study history  

  if (  
    old.studyByDate &&  
    typeof old.studyByDate === "object"  
  ) {  

    migrated.studyByDate =  
      {  
        ...old.studyByDate  
      };  

  }  

  else if (  
    old.studyTimeByDate &&  
    typeof old.studyTimeByDate === "object"  
  ) {  

    migrated.studyByDate =  
      {  
        ...old.studyTimeByDate  
      };  

  }  


  // Completed days  

  if (  
    old.completedDays &&  
    typeof old.completedDays === "object"  
  ) {  

    migrated.completedDays =  
      {  
        ...old.completedDays  
      };  

  }  


  if (  
    Number.isFinite(old.bestStreak)  
  ) {  

    migrated.bestStreak =  
      old.bestStreak;  

  }  


  return normalizeData(migrated);  

} catch (_) {}

}

return emptyData();
}

let data = migrateData();

// =========================================================
// APPLICATION STATE
// =========================================================

let plannerDate = todayKey();

let reminderTimer = null;

let notificationCheckTimer = null;

const timer = {

mode: "stopwatch",

running: false,

startedAt: null,

elapsedMs: 0,

savedMs: 0,

countdownDurationMs: 0,

countdownRemainingMs: 0,

lastDisplaySecond: -1

};

// =========================================================
// STORAGE
// =========================================================

function save() {

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(data)
);

}

// =========================================================
// TASK HELPERS
// =========================================================

function getTasks(date = todayKey()) {

return Array.isArray(data.tasks[date])
? data.tasks[date]
: [];

}

function setTasks(date, tasks) {

if (tasks.length) {

data.tasks[date] = tasks;

}

else {

delete data.tasks[date];

}

}

function getStudySeconds(date = todayKey()) {

return Number(
data.studyByDate[date] || 0
);

}

function formatTaskSummary(tasks) {

const completed =
tasks.filter(
task => task.completed
).length;

return ${completed} / ${tasks.length} completed;

}

// =========================================================
// FIXED TARGET DAILY RESET
// =========================================================

function resetFixedTargetsForToday() {

const today = todayKey();

let changed = false;

data.fixedTargets.forEach(target => {

if (  
  target.completedDate !== today  
) {  

  target.completed = false;  

  target.completedDate = today;  

  changed = true;  

}

});

if (changed) {

save();

}

}

// =========================================================
// STREAK
// =========================================================

function updateDayCompletion(date) {

const tasks =
getTasks(date);

const fixedCount =
data.fixedTargets.length;

const fixedDone =
data.fixedTargets.filter(
target => target.completed
).length;

const hasItems =
tasks.length > 0 ||
fixedCount > 0;

const complete =
hasItems &&
tasks.every(
task => task.completed
) &&
fixedDone === fixedCount;

if (complete) {

data.completedDays[date] = true;

}

else {

delete data.completedDays[date];

}

updateStreak();

save();

}

function updateStreak() {

let current = 0;

let misses = 0;

const previousBest =
Number(data.bestStreak || 0);

const date = new Date();

while (true) {

const key =  
  `${date.getFullYear()}-${String(  
    date.getMonth() + 1  
  ).padStart(2, "0")}-${String(  
    date.getDate()  
  ).padStart(2, "0")`;  


if (data.completedDays[key]) {  

  current++;  

  misses = 0;  

}  

else {  

  misses++;  

  // One missed day is allowed.  
  // Two consecutive missed days break the streak.  

  if (misses >= 2) {  

    break;  

  }  

}  


date.setDate(  
  date.getDate() - 1  
);

}

data.streak = current;

data.bestStreak =
Math.max(
previousBest,
current
);

}

// =========================================================
// MAIN DASHBOARD
// =========================================================

function updateMainUI() {

resetFixedTargetsForToday();

const today =
todayKey();

const tasks =
getTasks(today);

const fixed =
data.fixedTargets;

const taskDone =
tasks.filter(
task => task.completed
).length;

const fixedDone =
fixed.filter(
target => target.completed
).length;

const total =
tasks.length +
fixed.length;

const completed =
taskDone +
fixedDone;

const percent =
total
? Math.round(
completed /
total *
100
)
: 0;

if ($("todayDate")) {

$("todayDate").textContent =  
  formatDateLong(today);

}

if ($("bestStreak")) {

$("bestStreak").textContent =  
  data.bestStreak;

}

if ($("progressPercent")) {

$("progressPercent").textContent =  
  `${percent}%`;

}

if ($("progressFill")) {

$("progressFill").style.width =  
  `${percent}%`;

}

if ($("progressText")) {

$("progressText").textContent =  
  `${completed} of ${total} completed`;

}

const firstTask =
tasks.find(
task => task.time
) ||
tasks[0];

if ($("dailyTargetName")) {

$("dailyTargetName").textContent =  
  tasks.length  
    ? `${tasks.length} task${  
        tasks.length === 1  
          ? ""  
          : "s"  
      } planned`  
    : "No tasks planned";

}

if ($("dailyTargetTime")) {

$("dailyTargetTime").textContent =  
  firstTask  
    ? `📋 ${firstTask.name}: ${formatTime(  
        firstTask.time  
      )}`  
    : "No task planned";

}

if ($("regularTargetProgress")) {

$("regularTargetProgress").textContent =  
  `${taskDone} / ${tasks.length} completed`;

}

if ($("dailyStatus")) {

$("dailyStatus").textContent =  
  tasks.length &&  
  taskDone === tasks.length  

    ? "✓ All tasks completed"  

    : tasks.length  

      ? `${tasks.length - taskDone} task${  
          tasks.length - taskDone === 1  
            ? ""  
            : "s"  
        } remaining`  

      : "No tasks planned";

}

$("dailyStatus")?.classList.toggle(
"done",
tasks.length > 0 &&
taskDone === tasks.length
);

// Fixed targets

if ($("fixedTargetName")) {

$("fixedTargetName").textContent =  
  fixed.length  
    ? `${fixed.length} fixed target${  
        fixed.length === 1  
          ? ""  
          : "s"  
      }`  
    : "No fixed targets";

}

const firstFixed =
fixed.find(
target => target.time
) ||
fixed[0];

if ($("fixedTargetTime")) {

$("fixedTargetTime").textContent =  
  firstFixed  
    ? `⏰ ${firstFixed.name}: ${formatTime(  
        firstFixed.time  
      )}`  
    : "No fixed targets";

}

if ($("fixedStatus")) {

$("fixedStatus").textContent =  
  fixed.length &&  
  fixedDone === fixed.length  

    ? "✓ All completed"  

    : fixed.length  

      ? `${fixed.length - fixedDone} remaining`  

      : "No fixed targets";

}

$("fixedStatus")?.classList.toggle(
"done",
fixed.length > 0 &&
fixedDone === fixed.length
);

// Study time

if ($("studyTimeToday")) {

$("studyTimeToday").textContent =  
  formatMinutes(  
    getStudySeconds(today)  
  );

}

// Summary

if ($("todayTaskSummary")) {

$("todayTaskSummary").textContent =  
  formatTaskSummary(tasks);

}

if ($("todayStudySummary")) {

$("todayStudySummary").textContent =  
  formatMinutes(  
    getStudySeconds(today)  
  );

}

if ($("todayFixedSummary")) {

$("todayFixedSummary").textContent =  
  `${fixedDone} / ${fixed.length} completed`;

}

updateHistory();

updateNotificationButton();

}

// =========================================================
// 7-DAY HISTORY
// =========================================================

function updateHistory() {

const container =
$("history");

if (!container) return;

container.innerHTML = "";

for (let i = 0; i < 7; i++) {

const date =  
  new Date();  


date.setDate(  
  date.getDate() - i  
);  


const key =  
  `${date.getFullYear()}-${String(  
    date.getMonth() + 1  
  ).padStart(2, "0")}-${String(  
    date.getDate()  
  ).padStart(2, "0")`;  


const tasks =  
  getTasks(key);  


const completed =  
  tasks.filter(  
    task => task.completed  
  ).length;  


const study =  
  getStudySeconds(key);  


const label =  
  i === 0  

    ? "Today"  

    : date.toLocaleDateString(  
        "en-IN",  
        {  
          weekday: "short",  
          day: "numeric",  
          month: "short"  
        }  
      );  


const row =  
  document.createElement("div");  


row.className =  
  "history-row";  


row.innerHTML = `  
  <span class="history-day">  
    ${escapeHtml(label)}  
  </span>  

  <span class="history-status">  
    ${  
      tasks.length  
        ? `${completed}/${tasks.length}`  
        : "—"  
    }  
    ·  
    ${formatMinutes(study)}  
  </span>  
`;  


container.appendChild(row);

}

}

// =========================================================
// FULL INTERFACE MANAGEMENT
// =========================================================

function showView(id) {

[
"regularTasksView",
"regularPlanner",
"fixedTargetsView",
"weeklyStatsView"
].forEach(viewId => {

$(viewId)?.classList.add(  
  "hidden"  
);

});

$(id)?.classList.remove(
"hidden"
);

document.body.style.overflow =
"hidden";

}

function closeAllViews() {

[
"regularTasksView",
"regularPlanner",
"fixedTargetsView",
"weeklyStatsView"
].forEach(viewId => {

$(viewId)?.classList.add(  
  "hidden"  
);

});

document.body.style.overflow =
"";

}

// =========================================================
// REGULAR TASKS INTERFACE
// =========================================================

function openRegularTasks() {

renderRegularTasks();

showView(
"regularTasksView"
);

}

function renderRegularTasks() {

const date =
todayKey();

const tasks =
getTasks(date);

if ($("regularTasksDate")) {

$("regularTasksDate").textContent =  
  formatDateLong(date);

}

if ($("regularTasksCount")) {

$("regularTasksCount").textContent =  
  `${tasks.length} task${  
    tasks.length === 1  
      ? ""  
      : "s"  
  }`;

}

const completed =
tasks.filter(
task => task.completed
).length;

if ($("regularTasksProgress")) {

$("regularTasksProgress").textContent =  
  `${completed} / ${tasks.length}`;

}

if ($("regularTasksProgressFill")) {

$("regularTasksProgressFill").style.width =  
  `${tasks.length  
    ? completed / tasks.length * 100  
    : 0}%`;

}

const list =
$("regularTasksList");

if (!list) return;

list.innerHTML = "";

if (!tasks.length) {

list.innerHTML = `  
  <div class="empty-state">  
    <strong>No tasks planned</strong>  
    <span>Add your first regular task.</span>  
  </div>  
`;  

return;

}

const sortedTasks =
[...tasks].sort(
(a, b) =>
(a.time || "99:99")
.localeCompare(
b.time || "99:99"
)
);

sortedTasks.forEach(task => {

const row =  
  document.createElement("div");  


row.className =  
  `task-row${  
    task.completed  
      ? " completed"  
      : ""  
  }`;  


row.innerHTML = `  
  <input  
    class="task-checkbox"  
    type="checkbox"  
    ${  
      task.completed  
        ? "checked"  
        : ""  
    }  
    aria-label="Complete task"  
  >  

  <div class="task-row-content">  

    <div class="task-row-name">  
      ${escapeHtml(task.name)}  
    </div>  

    <div class="task-row-time">  
      ${  
        task.time  
          ? formatTime(task.time)  
          : "No time set"  
      }  
    </div>  

  </div>  

  <button  
    class="task-delete-button"  
    type="button"  
    title="Delete task"  
  >  
    ×  
  </button>  
`;  


row  
  .querySelector(".task-checkbox")  
  .addEventListener(  
    "change",  
    event => {  

      task.completed =  
        event.target.checked;  


      setTasks(  
        date,  
        tasks  
      );  


      updateDayCompletion(  
        date  
      );  


      renderRegularTasks();  

      updateMainUI();  


      if (task.completed) {  

        stopReminderForTask(  
          task.id  
        );  

      }  

    }  
  );  


row  
  .querySelector(".task-delete-button")  
  .addEventListener(  
    "click",  
    () => {  

      if (  
        !confirm(  
          `Delete "${task.name}"?`  
        )  
      ) {  
        return;  
      }  


      setTasks(  
        date,  
        tasks.filter(  
          item =>  
            item.id !== task.id  
        )  
      );  


      updateDayCompletion(  
        date  
      );  


      renderRegularTasks();  

      updateMainUI();  

    }  
  );  


list.appendChild(row);

});

}

// =========================================================
// REGULAR TASK PLANNER
// =========================================================

function openPlanner() {

plannerDate =
todayKey();

if ($("plannerDate")) {

$("plannerDate").value =  
  plannerDate;

}

renderPlanner();

showView(
"regularPlanner"
);

}

function renderPlanner() {

const date =
$("plannerDate")?.value ||
plannerDate ||
todayKey();

plannerDate =
date;

const list =
$("plannerTasksList");

if (!list) return;

list.innerHTML = "";

const tasks =
getTasks(date);

if (!tasks.length) {

list.innerHTML = `  
  <div class="empty-state">  
    <strong>No tasks for this date</strong>  
    <span>Use Add to create one.</span>  
  </div>  
`;  

return;

}

tasks.forEach(task => {

const row =  
  document.createElement("div");  


row.className =  
  "task-row";  


row.innerHTML = `  
  <div class="task-row-content">  

    <div class="task-row-name">  
      ${escapeHtml(task.name)}  
    </div>  

    <div class="task-row-time">  
      ${  
        task.time  
          ? formatTime(task.time)  
          : "No time set"  
      }  
    </div>  

  </div>  

  <button  
    class="task-delete-button"  
    type="button"  
  >  
    ×  
  </button>  
`;  


row  
  .querySelector("button")  
  .addEventListener(  
    "click",  
    () => {  

      setTasks(  
        date,  
        tasks.filter(  
          item =>  
            item.id !== task.id  
        )  
      );  


      save();  

      renderPlanner();  

      updateMainUI();  

    }  
  );  


list.appendChild(row);

});

}

// =========================================================
// ADD TASK MODAL
// =========================================================

function openTaskModal(
date = todayKey()
) {

if ($("taskNameInput")) {

$("taskNameInput").value =  
  "";

}

if ($("taskDateInput")) {

$("taskDateInput").value =  
  date;

}

if ($("taskTimeInput")) {

$("taskTimeInput").value =  
  "";

}

$("taskModal")?.classList.remove(
"hidden"
);

setTimeout(
() =>
$("taskNameInput")?.focus(),
50
);

}

function closeTaskModal() {

$("taskModal")?.classList.add(
"hidden"
);

}

function saveTask() {

const name =
$("taskNameInput")
?.value
.trim();

const date =
$("taskDateInput")
?.value ||
todayKey();

const time =
$("taskTimeInput")
?.value ||
"";

if (!name) {

alert(  
  "Please enter a task name."  
);  

return;

}

if (!date) {

alert(  
  "Please select a date."  
);  

return;

}

const tasks =
getTasks(date);

tasks.push({

id:  
  makeId("task"),  

name,  

date,  

time,  

completed:  
  false

});

setTasks(
date,
tasks
);

save();

closeTaskModal();

updateMainUI();

renderPlanner();

if (
!$("regularTasksView")
?.classList.contains(
"hidden"
)
) {

renderRegularTasks();

}

}

// =========================================================
// COMPLETE ALL REGULAR TASKS
// =========================================================

function completeAllRegular() {

const date =
todayKey();

const tasks =
getTasks(date);

if (!tasks.length) {

alert(  
  "There are no regular tasks to complete."  
);  

return;

}

tasks.forEach(
task =>
task.completed = true
);

setTasks(
date,
tasks
);

updateDayCompletion(
date
);

renderRegularTasks();

updateMainUI();

}

// =========================================================
// FIXED TARGETS INTERFACE
// =========================================================

function openFixedTargets() {

renderFixedTargets();

showView(
"fixedTargetsView"
);

}

function renderFixedTargets() {

const list =
$("fixedTargetsList");

if (!list) return;

list.innerHTML = "";

if ($("fixedTargetsCount")) {

$("fixedTargetsCount").textContent =  
  `${data.fixedTargets.length} target${  
    data.fixedTargets.length === 1  
      ? ""  
      : "s"  
  }`;

}

if (!data.fixedTargets.length) {

list.innerHTML = `  
  <div class="empty-state">  
    <strong>No fixed targets</strong>  
    <span>Add a target that repeats every day.</span>  
  </div>  
`;  

return;

}

data.fixedTargets.forEach(
target => {

const row =  
    document.createElement("div");  


  row.className =  
    "fixed-target-row";  


  row.innerHTML = `  
    <div class="fixed-target-main">  

      <input  
        class="task-checkbox"  
        type="checkbox"  
        ${  
          target.completed  
            ? "checked"  
            : ""  
        }  
        aria-label="Complete fixed target"  
      >  

      <div class="fixed-target-info">  

        <div class="fixed-target-name">  
          ${escapeHtml(target.name)}  
        </div>  

        <div class="fixed-target-time">  
          ${  
            target.time  
              ? formatTime(target.time)  
              : "No time set"  
          }  
        </div>  

      </div>  

    </div>  

    <div class="fixed-target-actions">  

      <button  
        class="outline-button edit-fixed"  
        type="button"  
      >  
        Edit  
      </button>  

      <button  
        class="secondary-button delete-fixed"  
        type="button"  
      >  
        Delete  
      </button>  

    </div>  
  `;  


  row  
    .querySelector(".task-checkbox")  
    .addEventListener(  
      "change",  
      event => {  

        target.completed =  
          event.target.checked;  


        target.completedDate =  
          event.target.checked  
            ? todayKey()  
            : "";  


        save();  


        updateDayCompletion(  
          todayKey()  
        );  


        renderFixedTargets();  

        updateMainUI();  

      }  
    );  


  row  
    .querySelector(".edit-fixed")  
    .addEventListener(  
      "click",  
      () =>  
        openTargetModal(  
          "fixed",  
          target.id  
        )  
    );  


  row  
    .querySelector(".delete-fixed")  
    .addEventListener(  
      "click",  
      () => {  

        if (  
          !confirm(  
            `Delete "${target.name}"?`  
          )  
        ) {  
          return;  
        }  


        data.fixedTargets =  
          data.fixedTargets.filter(  
            item =>  
              item.id !== target.id  
          );  


        save();  


        renderFixedTargets();  

        updateMainUI();  

      }  
    );  


  list.appendChild(row);  

}

);

}

// =========================================================
// FIXED TARGET MODAL
// =========================================================

let editingFixedId = null;

function openTargetModal(
type,
id = null
) {

editingFixedId =
type === "fixed"
? id
: null;

const target =
id
? data.fixedTargets.find(
item =>
item.id === id
)
: null;

if ($("modalTitle")) {

$("modalTitle").textContent =  
  type === "fixed"  

    ? target  
      ? "Edit Fixed Target"  
      : "Add Fixed Target"  

    : "Target";

}

if ($("targetInput")) {

$("targetInput").value =  
  target?.name || "";

}

if ($("timeInput")) {

$("timeInput").value =  
  target?.time || "";

}

$("modal")?.classList.remove(
"hidden"
);

setTimeout(
() =>
$("targetInput")?.focus(),
50
);

}

function closeModal() {

$("modal")?.classList.add(
"hidden"
);

editingFixedId =
null;

}

function saveTarget() {

const name =
$("targetInput")
?.value
.trim();

const time =
$("timeInput")
?.value ||
"";

if (!name) {

alert(  
  "Please enter a target name."  
);  

return;

}

if (!time) {

alert(  
  "Please select a time."  
);  

return;

}

if (editingFixedId) {

const target =  
  data.fixedTargets.find(  
    item =>  
      item.id ===  
      editingFixedId  
  );  


if (target) {  

  target.name =  
    name;  

  target.time =  
    time;  

}

}

else {

data.fixedTargets.push({  

  id:  
    makeId("fixed"),  

  name,  

  time,  

  completed:  
    false,  

  completedDate:  
    todayKey()  

});

}

save();

closeModal();

renderFixedTargets();

updateMainUI();

}

// =========================================================
// WEEKLY STATISTICS
// =========================================================

function openWeeklyStats() {

renderWeeklyStats();

showView(
"weeklyStatsView"
);

}

function getWeekKeys() {

const today =
new Date();

const day =
today.getDay();

const mondayOffset =
day === 0
? -6
: 1 - day;

const monday =
new Date(today);

monday.setDate(
today.getDate() +
mondayOffset
);

monday.setHours(
0,
0,
0,
0
);

return Array.from(
{ length: 7 },
(_, index) => {

const date =  
    new Date(monday);  


  date.setDate(  
    monday.getDate() +  
    index  
  );  


  return `${date.getFullYear()}-${String(  
    date.getMonth() + 1  
  ).padStart(2, "0")}-${String(  
    date.getDate()  
  ).padStart(2, "0")}`;  

}

);

}

function renderWeeklyStats() {

const keys =
getWeekKeys();

if ($("weeklyStatsDateRange")) {

$("weeklyStatsDateRange").textContent =  
  `${formatDateShort(  
    keys[0]  
  )} – ${formatDateShort(  
    keys[6]  
  )}`;

}

renderStudyChart(
keys
);

renderStudyHistory(
keys
);

renderTaskHistory(
keys
);

}

// =========================================================
// WEEKLY STUDY HISTORY
// =========================================================

function renderStudyHistory(
keys
) {

const container =
$("weeklyStudyHistory");

if (!container) return;

container.innerHTML = "";

const now =
new Date();

const actual =
keys.filter(key => {

const date =  
    dateFromKey(key);  


  return (  
    date <= now &&  
    getStudySeconds(key) > 0  
  );  

});

if (!actual.length) {

container.innerHTML = `  
  <div class="empty-state">  
    <strong>No study time recorded</strong>  
    <span>  
      Use the stopwatch, countdown,  
      or manual entry.  
    </span>  
  </div>  
`;  


$("highestStudyTime").textContent =  
  "—";  

$("highestStudyDay").textContent =  
  "—";  

$("lowestStudyTime").textContent =  
  "—";  

$("lowestStudyDay").textContent =  
  "—";  


return;

}

actual.forEach(
key => {

const date =  
    dateFromKey(key);  


  const row =  
    document.createElement(  
      "div"  
    );  


  row.className =  
    "weekly-history-row";  


  row.innerHTML = `  
    <span class="weekly-history-date">  
      ${escapeHtml(  
        date.toLocaleDateString(  
          "en-IN",  
          {  
            weekday: "long",  
            day: "numeric",  
            month: "short"  
          }  
        )  
      )}  
    </span>  

    <span class="weekly-history-value">  
      ${formatMinutes(  
        getStudySeconds(key)  
      )}  
    </span>  
  `;  


  container.appendChild(row);  

}

);

const sorted =
[...actual].sort(
(a, b) =>
getStudySeconds(b) -
getStudySeconds(a)
);

const highest =
sorted[0];

const lowest =
sorted[sorted.length - 1];

$("highestStudyTime").textContent =
formatMinutes(
getStudySeconds(highest)
);

$("highestStudyDay").textContent =
dateLabel(highest);

$("lowestStudyTime").textContent =
formatMinutes(
getStudySeconds(lowest)
);

$("lowestStudyDay").textContent =
dateLabel(lowest);

}

// =========================================================
// WEEKLY TASK HISTORY
// =========================================================

function renderTaskHistory(
keys
) {

const container =
$("weeklyTaskHistory");

if (!container) return;

container.innerHTML = "";

keys.forEach(
key => {

const date =  
    dateFromKey(key);  


  const tasks =  
    getTasks(key);  


  let value =  
    "No tasks planned";  


  if (tasks.length) {  

    value =  
      tasks.every(  
        task =>  
          task.completed  
      )  

        ? "All tasks completed"  

        : `${tasks.filter(  
            task =>  
              task.completed  
          ).length}/${tasks.length} completed · Incomplete`;  

  }  


  const row =  
    document.createElement(  
      "div"  
    );  


  row.className =  
    "weekly-history-row";  


  row.innerHTML = `  
    <span class="weekly-history-date">  
      ${escapeHtml(  
        date.toLocaleDateString(  
          "en-IN",  
          {  
            weekday: "long",  
            day: "numeric",  
            month: "short",  
            year: "numeric"  
          }  
        )  
      )}  
    </span>  

    <span class="weekly-history-value">  
      ${escapeHtml(value)}  
    </span>  
  `;  


  container.appendChild(row);  

}

);

}

// =========================================================
// STUDY GRAPH
// =========================================================

function renderStudyChart(
keys
) {

const canvas =
$("studyChart");

const empty =
$("studyChartEmpty");

if (!canvas) return;

const now =
new Date();

const values =
keys.map(key => {

const date =  
    dateFromKey(key);  


  if (date > now) {  

    return null;  

  }  


  const seconds =  
    getStudySeconds(key);  


  return seconds > 0  
    ? seconds / 60  
    : null;  

});

const hasData =
values.some(
value =>
value !== null &&
value > 0
);

empty?.classList.toggle(
"hidden",
hasData
);

canvas.style.display =
hasData
? "block"
: "none";

if (!hasData) return;

const rect =
canvas.getBoundingClientRect();

const width =
Math.max(
300,
Math.floor(
rect.width || 700
)
);

const height =
320;

const ratio =
window.devicePixelRatio || 1;

canvas.width =
width * ratio;

canvas.height =
height * ratio;

const context =
canvas.getContext("2d");

context.setTransform(
ratio,
0,
0,
ratio,
0,
0
);

context.clearRect(
0,
0,
width,
height
);

const padding = {

left: 52,  

right: 20,  

top: 20,  

bottom: 50

};

const plotWidth =
width -
padding.left -
padding.right;

const plotHeight =
height -
padding.top -
padding.bottom;

const numericValues =
values.filter(
value =>
value !== null &&
value > 0
);

const maximum =
Math.max(
1,
Math.ceil(
Math.max(
...numericValues
) * 1.2
)
);

context.font =
"12px system-ui, sans-serif";

context.textAlign =
"right";

context.textBaseline =
"middle";

context.strokeStyle =
"#e2e5e8";

context.fillStyle =
"#70757b";

context.lineWidth =
1;

// Horizontal grid

for (
let i = 0;
i <= 4;
i++
) {

const y =  
  padding.top +  
  plotHeight -  
  plotHeight *  
    i /  
    4;  


context.beginPath();  

context.moveTo(  
  padding.left,  
  y  
);  

context.lineTo(  
  width -  
    padding.right,  
  y  
);  

context.stroke();  


const label =  
  Math.round(  
    maximum *  
    i /  
    4  
  );  


context.fillText(  
  `${label}`,  
  padding.left - 9,  
  y  
);

}

// Y-axis label

context.save();

context.translate(
15,
padding.top +
plotHeight / 2
);

context.rotate(
-Math.PI / 2
);

context.textAlign =
"center";

context.textBaseline =
"middle";

context.fillStyle =
"#70757b";

context.fillText(
"Minutes",
0,
0
);

context.restore();

// X-axis labels

context.textAlign =
"center";

context.textBaseline =
"top";

keys.forEach(
(key, index) => {

const x =  
    padding.left +  
    (  
      keys.length === 1  
        ? plotWidth / 2  
        : plotWidth *  
          index /  
          (keys.length - 1)  
    );  


  const date =  
    dateFromKey(key);  


  context.fillStyle =  
    "#70757b";  


  context.fillText(  
    date.toLocaleDateString(  
      "en-IN",  
      {  
        weekday: "short",  
        day: "numeric"  
      }  
    ),  
    x,  
    height -  
      padding.bottom +  
      13  
  );  

}

);

// Draw separate line segments.
// Missing days remain empty and do not create fake zero values.

context.strokeStyle =
"#15803d";

context.lineWidth =
3;

let segmentOpen =
false;

values.forEach(
(value, index) => {

if (  
    value === null ||  
    value <= 0  
  ) {  

    segmentOpen =  
      false;  

    return;  

  }  


  const x =  
    padding.left +  
    (  
      keys.length === 1  
        ? plotWidth / 2  
        : plotWidth *  
          index /  
          (keys.length - 1)  
    );  


  const y =  
    padding.top +  
    plotHeight -  
    (  
      value /  
      maximum  
    ) *  
    plotHeight;  


  if (!segmentOpen) {  

    context.beginPath();  

    context.moveTo(  
      x,  
      y  
    );  

    segmentOpen =  
      true;  

  }  

  else {  

    context.lineTo(  
      x,  
      y  
    );  

  }  


  context.stroke();  

}

);

// Points

values.forEach(
(value, index) => {

if (  
    value === null ||  
    value <= 0  
  ) {  
    return;  
  }  


  const x =  
    padding.left +  
    (  
      keys.length === 1  
        ? plotWidth / 2  
        : plotWidth *  
          index /  
          (keys.length - 1)  
    );  


  const y =  
    padding.top +  
    plotHeight -  
    (  
      value /  
      maximum  
    ) *  
    plotHeight;  


  context.beginPath();  


  context.arc(  
    x,  
    y,  
    5,  
    0,  
    Math.PI * 2  
  );  


  context.fillStyle =  
    "#15803d";  


  context.fill();  


  context.beginPath();  


  context.arc(  
    x,  
    y,  
    8,  
    0,  
    Math.PI * 2  
  );  


  context.strokeStyle =  
    "#15803d";  


  context.lineWidth =  
    1;  


  context.stroke();  

}

);

}

// =========================================================
// STUDY TIME STORAGE
// =========================================================

function addStudySeconds(
seconds
) {

seconds =
Math.max(
0,
Math.round(seconds)
);

if (!seconds) return;

const date =
todayKey();

data.studyByDate[date] =
getStudySeconds(date) +
seconds;

save();

updateMainUI();

}

// =========================================================
// TIMER DISPLAY
// =========================================================

function updateTimerDisplay() {

let displayMs =
timer.elapsedMs;

if (
timer.mode ===
"countdown"
) {

displayMs =  
  timer.countdownRemainingMs;

}

if (
timer.running &&
timer.startedAt !== null
) {

const delta =  
  Date.now() -  
  timer.startedAt;  


if (  
  timer.mode ===  
  "countdown"  
) {  

  displayMs =  
    Math.max(  
      0,  
      timer.countdownRemainingMs -  
      delta  
    );  

}  

else {  

  displayMs =  
    timer.elapsedMs +  
    delta;  

}

}

const second =
Math.floor(
displayMs / 1000
);

if (
second !==
timer.lastDisplaySecond
) {

timer.lastDisplaySecond =  
  second;  


if ($("timerDisplay")) {  

  $("timerDisplay").textContent =  
    formatClock(  
      displayMs  
    );  

}

}

}

// =========================================================
// TIMER STATE UPDATE
// =========================================================

function updateTimerState() {

if (
!timer.running ||
timer.startedAt === null
) {

return;

}

const now =
Date.now();

const delta =
now -
timer.startedAt;

if (
timer.mode ===
"stopwatch"
) {

timer.elapsedMs +=  
  delta;  


timer.startedAt =  
  now;

}

else {

timer.countdownRemainingMs -=  
  delta;  


timer.startedAt =  
  now;  


timer.elapsedMs =  
  timer.countdownDurationMs -  
  timer.countdownRemainingMs;  


if (  
  timer.countdownRemainingMs <=  
  0  
) {  

  timer.countdownRemainingMs =  
    0;  


  timer.elapsedMs =  
    timer.countdownDurationMs;  


  timer.running =  
    false;  


  timer.startedAt =  
    null;  


  saveTimerStudyDelta();  


  timer.savedMs =  
    0;  


  updateTimerDisplay();  


  showTimerEnded();  


  return;  

}

}

saveTimerStudyDelta(
false
);

updateTimerDisplay();

}

// =========================================================
// SAVE TIMER STUDY DELTA
// =========================================================

function saveTimerStudyDelta(
resetSaved = false
) {

const current =
timer.elapsedMs;

const unsaved =
Math.max(
0,
current -
timer.savedMs
);

if (
unsaved >= 1000
) {

addStudySeconds(  
  Math.floor(  
    unsaved / 1000  
  )  
);

}

timer.savedMs =
resetSaved
? 0
: current;

}

// =========================================================
// TIMER MODE
// =========================================================

function selectTimerMode(
mode
) {

if (timer.running) {

updateTimerState();  


timer.running =  
  false;  


timer.startedAt =  
  null;  


saveTimerStudyDelta();

}

timer.mode =
mode;

timer.elapsedMs =
0;

timer.savedMs =
0;

timer.countdownDurationMs =
0;

timer.countdownRemainingMs =
0;

timer.lastDisplaySecond =
-1;

$("stopwatchMode")
?.classList.toggle(
"active",
mode === "stopwatch"
);

$("countdownMode")
?.classList.toggle(
"active",
mode === "countdown"
);

$("countdownInput")
?.classList.toggle(
"hidden",
mode !== "countdown"
);

if ($("timerDisplay")) {

$("timerDisplay").textContent =  
  "00:00:00";

}

}

// =========================================================
// START TIMER
// =========================================================

function startStudyTimer() {

if (timer.running) {
return;
}

if (
timer.mode ===
"countdown"
) {

if (  
  timer.countdownRemainingMs <=  
  0  
) {  

  const minutes =  
    Number(  
      $("countdownMinutes")  
        ?.value ||  
      0  
    );  


  if (  
    !Number.isFinite(minutes) ||  
    minutes <= 0  
  ) {  

    alert(  
      "Enter a countdown time in minutes."  
    );  

    return;  

  }  


  timer.countdownDurationMs =  
    Math.round(  
      minutes *  
      60 *  
      1000  
    );  


  timer.countdownRemainingMs =  
    timer.countdownDurationMs;  


  timer.elapsedMs =  
    0;  


  timer.savedMs =  
    0;  

}

}

timer.running =
true;

timer.startedAt =
Date.now();

timer.lastDisplaySecond =
-1;

updateTimerDisplay();

}

// =========================================================
// PAUSE TIMER
// =========================================================

function pauseStudyTimer() {

if (!timer.running) {
return;
}

updateTimerState();

if (timer.running) {

timer.running =  
  false;  


timer.startedAt =  
  null;

}

saveTimerStudyDelta();

updateTimerDisplay();

updateMainUI();

}

// =========================================================
// RESET TIMER
// =========================================================

function resetStudyTimer() {

if (timer.running) {

updateTimerState();

}

saveTimerStudyDelta();

timer.running =
false;

timer.startedAt =
null;

timer.elapsedMs =
0;

timer.savedMs =
0;

timer.countdownDurationMs =
0;

timer.countdownRemainingMs =
0;

timer.lastDisplaySecond =
-1;

if ($("timerDisplay")) {

$("timerDisplay").textContent =  
  "00:00:00";

}

updateMainUI();

}

// =========================================================
// MANUAL STUDY TIME
// =========================================================

function saveManualStudyTime() {

const minutes =
Number(
$("manualStudyTime")
?.value ||
0
);

if (
!Number.isFinite(minutes) ||
minutes <= 0
) {

alert(  
  "Enter a study time greater than 0 minutes."  
);  

return;

}

addStudySeconds(
Math.round(
minutes *
60
)
);

$("manualStudyTime").value =
"";

}

// =========================================================
// TIMER ENDED
// =========================================================

function showTimerEnded() {

$("timerEndedReminder")
?.classList.remove(
"hidden"
);

playAlarm();

sendNotification(
"Timer Ended",
"Your countdown timer has reached 00:00."
);

}

function playAlarm() {

try {

const AudioContextClass =  
  window.AudioContext ||  
  window.webkitAudioContext;  


if (!AudioContextClass) {  
  return;  
}  


const context =  
  new AudioContextClass();  


const oscillator =  
  context.createOscillator();  


const gain =  
  context.createGain();  


oscillator.frequency.value =  
  800;  


gain.gain.setValueAtTime(  
  0.15,  
  context.currentTime  
);  


gain.gain.exponentialRampToValueAtTime(  
  0.001,  
  context.currentTime +  
  0.8  
);  


oscillator.connect(  
  gain  
);  


gain.connect(  
  context.destination  
);  


oscillator.start();  


oscillator.stop(  
  context.currentTime +  
  0.8  
);

}

catch (_) {}

}

// =========================================================
// NOTIFICATIONS
// =========================================================

async function enableNotifications() {

if (
!("Notification" in window)
) {

alert(  
  "This browser does not support notifications."  
);  

return;

}

try {

const permission =  
  await Notification.requestPermission();  


if (  
  permission ===  
  "granted"  
) {  

  updateNotificationButton();  


  sendNotification(  
    "Daily Target",  
    "Notifications are enabled."  
  );  

}  


else if (  
  permission ===  
  "denied"  
) {  

  alert(  
    "Notifications are blocked for this site. Open Chrome site settings and allow Notifications for this website."  
  );  


  updateNotificationButton();  

}  


else {  

  alert(  
    "Notification permission was not granted."  
  );  

}

}

catch (error) {

console.error(  
  error  
);  


alert(  
  "Notification permission could not be requested in this browser."  
);

}

}

function updateNotificationButton() {

const button =
$("notificationBtn");

if (!button) return;

if (
!("Notification" in window)
) {

button.textContent =  
  "Notifications Not Supported";  

return;

}

button.textContent =
Notification.permission ===
"granted"

? "✓ Notifications Enabled"  

  : "Enable Notifications";

}

function sendNotification(
title,
body
) {

if (
!("Notification" in window) ||
Notification.permission !==
"granted"
) {

return;

}

try {

new Notification(  
  title,  
  {  
    body  
  }  
);

}

catch (error) {

console.log(  
  "Notification unavailable",  
  error  
);

}

}

// =========================================================
// SCHEDULED TASK NOTIFICATIONS
// =========================================================

function notificationKey(
type,
id,
date,
time
) {

return ${type}_${id}_${date}_${time};

}

function checkScheduledNotifications() {

const now =
new Date();

const date =
todayKey();

const time =
${String(   now.getHours()   ).padStart(2, "0")}:${String(   now.getMinutes()   ).padStart(2, "0")};

// Regular tasks

const tasks =
getTasks(date);

tasks.forEach(
task => {

if (  
    !task.completed &&  
    task.time === time  
  ) {  

    const key =  
      notificationKey(  
        "task",  
        task.id,  
        date,  
        time  
      );  


    if (  
      !data.notified[key]  
    ) {  

      data.notified[key] =  
        true;  


      save();  


      showScheduledReminder(  
        task.id,  
        task.name,  
        task.time  
      );  

    }  

  }  

}

);

// Fixed targets

data.fixedTargets.forEach(
target => {

if (  
    !target.completed &&  
    target.time === time  
  ) {  

    const key =  
      notificationKey(  
        "fixed",  
        target.id,  
        date,  
        time  
      );  


    if (  
      !data.notified[key]  
    ) {  

      data.notified[key] =  
        true;  


      save();  


      showScheduledReminder(  
        target.id,  
        target.name,  
        target.time  
      );  

    }  

  }  

}

);

}

function showScheduledReminder(
id,
name,
time
) {

if ($("reminderText")) {

$("reminderText").textContent =  
  `Time to complete the task: ${name} (${formatTime(time)}).`;

}

$("reminder")
?.classList.remove(
"hidden"
);

playAlarm();

sendNotification(
"Time to complete the task",
${name} — ${formatTime(time)}
);

if (reminderTimer) {

clearTimeout(  
  reminderTimer  
);

}

reminderTimer =
null;

$("reminderComplete")
?.setAttribute(
"data-reminder-id",
id
);

}

// =========================================================
// REMINDER CONTROLS
// =========================================================

function stopReminderForTask(
id
) {

if (
$("reminderComplete")
?.getAttribute(
"data-reminder-id"
) === id
) {

$("reminder")  
  ?.classList.add(  
    "hidden"  
  );  


if (reminderTimer) {  

  clearTimeout(  
    reminderTimer  
  );  

}  


reminderTimer =  
  null;

}

}

function completeReminderTarget() {

const id =
$("reminderComplete")
?.getAttribute(
"data-reminder-id"
);

if (!id) return;

const date =
todayKey();

const task =
getTasks(date).find(
item =>
item.id === id
);

if (task) {

task.completed =  
  true;  


setTasks(  
  date,  
  getTasks(date)  
);

}

else {

const fixed =  
  data.fixedTargets.find(  
    item =>  
      item.id === id  
  );  


if (fixed) {  

  fixed.completed =  
    true;  


  fixed.completedDate =  
    todayKey();  

}

}

updateDayCompletion(
date
);

$("reminder")
?.classList.add(
"hidden"
);

updateMainUI();

renderRegularTasks();

renderFixedTargets();

}

function remindLater() {

$("reminder")
?.classList.add(
"hidden"
);

const id =
$("reminderComplete")
?.getAttribute(
"data-reminder-id"
);

if (!id) return;

if (reminderTimer) {

clearTimeout(  
  reminderTimer  
);

}

reminderTimer =
setTimeout(
() => {

const task =  
      getTasks(  
        todayKey()  
      ).find(  
        item =>  
          item.id === id  
      );  


    const fixed =  
      data.fixedTargets.find(  
        item =>  
          item.id === id  
      );  


    const target =  
      task ||  
      fixed;  


    if (  
      target &&  
      !target.completed  
    ) {  

      showScheduledReminder(  
        id,  
        target.name,  
        target.time  
      );  

    }  

  },  
  60 * 60 * 1000  
);

}

// =========================================================
// EVENT BINDING
// =========================================================

function bindEvents() {

// Regular target

$("openRegularTarget")
?.addEventListener(
"click",
openRegularTasks
);

$("editDaily")
?.addEventListener(
"click",
openPlanner
);

$("completeAllRegular")
?.addEventListener(
"click",
completeAllRegular
);

$("completeAllRegularFromView")
?.addEventListener(
"click",
completeAllRegular
);

// Interfaces

$("closeRegularTasks")
?.addEventListener(
"click",
closeAllViews
);

$("closeRegularPlanner")
?.addEventListener(
"click",
closeAllViews
);

$("closeFixedTargets")
?.addEventListener(
"click",
closeAllViews
);

$("closeWeeklyStats")
?.addEventListener(
"click",
closeAllViews
);

// Tasks

$("addTaskBtn")
?.addEventListener(
"click",
() =>
openTaskModal(
todayKey()
)
);

$("addTaskFromPlanner")
?.addEventListener(
"click",
() =>
openTaskModal(
plannerDate
)
);

$("saveTaskBtn")
?.addEventListener(
"click",
saveTask
);

$("closeTaskModal")
?.addEventListener(
"click",
closeTaskModal
);

$("plannerDate")
?.addEventListener(
"change",
renderPlanner
);

$("saveRegularPlan")
?.addEventListener(
"click",
() => {

save();  

    updateMainUI();  

    closeAllViews();  

  }  
);

// Fixed targets

$("openFixedTargets")
?.addEventListener(
"click",
openFixedTargets
);

$("addFixedTarget")
?.addEventListener(
"click",
() =>
openTargetModal(
"fixed"
)
);

$("saveTarget")
?.addEventListener(
"click",
saveTarget
);

$("closeModal")
?.addEventListener(
"click",
closeModal
);

// Weekly statistics

$("openWeeklyStats")
?.addEventListener(
"click",
openWeeklyStats
);

// Timer

$("stopwatchMode")
?.addEventListener(
"click",
() =>
selectTimerMode(
"stopwatch"
)
);

$("countdownMode")
?.addEventListener(
"click",
() =>
selectTimerMode(
"countdown"
)
);

$("startStudyTimer")
?.addEventListener(
"click",
startStudyTimer
);

$("pauseStudyTimer")
?.addEventListener(
"click",
pauseStudyTimer
);

$("resetStudyTimer")
?.addEventListener(
"click",
resetStudyTimer
);

$("saveManualStudyTime")
?.addEventListener(
"click",
saveManualStudyTime
);

// Notifications

$("notificationBtn")
?.addEventListener(
"click",
enableNotifications
);

$("reminderComplete")
?.addEventListener(
"click",
completeReminderTarget
);

$("remindLater")
?.addEventListener(
"click",
remindLater
);

$("closeTimerEndedReminder")
?.addEventListener(
"click",
() =>
$("timerEndedReminder")
?.classList.add(
"hidden"
)
);

// Page visibility

document.addEventListener(
"visibilitychange",
() => {

if (!document.hidden) {  

    updateMainUI();  

    checkScheduledNotifications();  

    updateTimerDisplay();  

  }  

}

);

// Graph resize

window.addEventListener(
"resize",
() => {

if (  
    !$("weeklyStatsView")  
      ?.classList.contains(  
        "hidden"  
      )  
  ) {  

    renderStudyChart(  
      getWeekKeys()  
    );  

  }  

}

);

}

// =========================================================
// CLEAN OLD NOTIFICATION RECORDS
// =========================================================

function cleanOldNotificationRecords() {

const cutoff =
new Date();

cutoff.setDate(
cutoff.getDate() - 14
);

for (
const key
of Object.keys(
data.notified
)
) {

const parts =  
  key.split("_");  


const date =  
  parts[parts.length - 2];  


if (  
  /^\d{4}-\d{2}-\d{2}$/  
    .test(date) &&  
  dateFromKey(date) <  
    cutoff  
) {  

  delete data.notified[key];  

}

}

}

// =========================================================
// START APPLICATION
// =========================================================

function init() {

cleanOldNotificationRecords();

updateStreak();

save();

bindEvents();

selectTimerMode(
"stopwatch"
);

updateMainUI();

checkScheduledNotifications();

// Timer update

setInterval(
() => {

updateTimerState();  

},  
250

);

// Scheduled notifications

notificationCheckTimer =
setInterval(
checkScheduledNotifications,
1000
);

// Dashboard refresh

setInterval(
updateMainUI,
60000
);

}

document.addEventListener(
"DOMContentLoaded",
init
);


"use strict";

// ========================================
// 🌷 MY GOALS & GROWTH
// MONTHLY CALENDAR VERSION
// ========================================

// ===== STORAGE =====

const GOALS_KEY = "my-goals-growth-v2";
const OLD_GOALS_KEY =
  "my-little-scrapbook-goals-v1";

let goals = [];

// Temporary calendar view for each goal.
const calendarViews = {};

// ===== DATE HELPERS =====

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function today() {
  return formatDate(new Date());
}

function parseDate(dateString) {
  const parts = dateString.split("-").map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
    12
  );
}

function formatReadableDate(dateString) {
  return parseDate(dateString).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function getId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return Date.now() + "-" +
    Math.random().toString(36).slice(2);
}

function clampEffort(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

// ===== EFFORT COLORS =====

function getEffortLevel(value) {
  const effort = clampEffort(value);

  if (effort === 0) {
    return {
      color: "#bdb8c3",
      label: "Not started",
      message: "🌱 Every dream starts somewhere."
    };
  }

  if (effort < 25) {
    return {
      color: "#f3d47e",
      label: "Beginning",
      message: "🌼 Small steps still matter!"
    };
  }

  if (effort < 50) {
    return {
      color: "#f0ae7e",
      label: "Building effort",
      message: "🌷 You're building a beautiful habit!"
    };
  }

  if (effort < 75) {
    return {
      color: "#9bc9ec",
      label: "Consistent",
      message: "🦋 Your consistency is growing!"
    };
  }

  return {
    color: "#9ed6ae",
    label: "Strong effort",
    message: "✨ Beautiful dedication! Keep blooming!"
  };
}

// ===== NORMALIZE SAVED GOALS =====

function normalizeGoal(g) {
  if (
    !g ||
    typeof g !== "object" ||
    typeof g.name !== "string" ||
    typeof g.action !== "string"
  ) {
    return null;
  }

  const checkins = Array.isArray(g.checkins)
    ? [...new Set(
        g.checkins.filter(
          d => typeof d === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(d)
        )
      )]
    : [];

  const effortHistory = {};

  if (
    g.effortHistory &&
    typeof g.effortHistory === "object" &&
    !Array.isArray(g.effortHistory)
  ) {
    for (const [date, value] of Object.entries(
      g.effortHistory
    )) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        effortHistory[date] = clampEffort(value);
      }
    }
  }

  // Preserve earlier check-ins.
  // If older entries have no saved daily
  // percentage, use the previous effort value.
  for (const date of checkins) {
    if (!Object.prototype.hasOwnProperty.call(
      effortHistory,
      date
    )) {
      effortHistory[date] =
        clampEffort(g.effort);
    }
  }

  return {
    id: typeof g.id === "string"
      ? g.id
      : getId(),

    name: g.name.slice(0, 100),
    action: g.action.slice(0, 100),

    created: typeof g.created === "string"
      ? g.created
      : today(),

    target: typeof g.target === "string"
      ? g.target
      : "",

    effort: clampEffort(g.effort),

    
checkins,
effortHistory,

dailyNotes:
  g.dailyNotes &&
  typeof g.dailyNotes === "object" &&
  !Array.isArray(g.dailyNotes)
    ? Object.fromEntries(
        Object.entries(g.dailyNotes)
          .filter(([date, note]) =>
            /^\d{4}-\d{2}-\d{2}$/.test(date) &&
            typeof note === "string"
          )
          .map(([date, note]) => [
            date,
            note.slice(0, 3000)
          ])
      )
    : {}

  };
}

// ===== LOAD GOALS =====

function loadGoals() {
  try {
    const current = localStorage.getItem(
      GOALS_KEY
    );

    const previous = localStorage.getItem(
      OLD_GOALS_KEY
    );

    const raw = current !== null
      ? JSON.parse(current)
      : previous !== null
        ? JSON.parse(previous)
        : [];

    if (!Array.isArray(raw)) {
      throw new Error("Invalid goals data");
    }

    goals = raw
      .map(normalizeGoal)
      .filter(Boolean);

    if (current === null && previous !== null) {
      saveGoals();
    }

  } catch (error) {
    console.error("Error loading goals:", error);

    goals = [];

    alert(
      "Could not load your saved goals. " +
      "Please check your backup."
    );
  }
}

// ===== SAVE GOALS =====

function saveGoals() {
  try {
    localStorage.setItem(
      GOALS_KEY,
      JSON.stringify(goals)
    );

    return true;

  } catch (error) {
    console.error("Error saving goals:", error);

    alert(
      "Unable to save your goals. " +
      "Please check browser storage."
    );

    return false;
  }
}

// ===== HTML ELEMENT HELPER =====

function element(tag, className, content) {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  if (content !== undefined) {
    el.textContent = String(content);
  }

  return el;
}

// ===== CREATE GOAL =====

document.getElementById("goalForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById(
      "goalName"
    ).value.trim();

    const action = document.getElementById(
      "goalAction"
    ).value.trim();

    const target = document.getElementById(
      "goalTarget"
    ).value;

    if (!name || !action) {
      alert(
        "Please enter your goal and daily action."
      );
      return;
    }

    if (target && target < today()) {
      alert(
        "Please choose today or a future date."
      );
      return;
    }

    
    const goal = {
      id: getId(),
      name,
      action,
      target,
      created: today(),
      effort: 0,
      checkins: [],
      effortHistory: {},
      dailyNotes: {}
};


    goals.unshift(goal);

    if (!saveGoals()) {
      goals.shift();
      return;
    }

    this.reset();
    renderGoals();
  });

// ===== CALENDAR VIEW STATE =====

function getCalendarView(goal) {
  if (!calendarViews[goal.id]) {
    const currentDate = new Date();

    calendarViews[goal.id] = {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
      selectedDate: today()
    };
  }

  return calendarViews[goal.id];
}

function changeCalendarMonth(id, offset) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const view = getCalendarView(goal);

  const newMonth = new Date(
    view.year,
    view.month + offset,
    1
  );

  view.year = newMonth.getFullYear();
  view.month = newMonth.getMonth();

  // Select the first date in the new month.
  view.selectedDate = formatDate(
    new Date(view.year, view.month, 1)
  );

  renderGoals();
}

function selectCalendarDate(id, date) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const view = getCalendarView(goal);

  view.selectedDate = date;

  const selected = parseDate(date);

  view.year = selected.getFullYear();
  view.month = selected.getMonth();

  renderGoals();
}

function goToToday(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const view = getCalendarView(goal);

  const currentDate = new Date();

  view.year = currentDate.getFullYear();
  view.month = currentDate.getMonth();
  view.selectedDate = today();

  renderGoals();
}

// ===== GET EFFORT FOR SELECTED DATE =====

function getDateEffort(goal, date) {
  if (
    Object.prototype.hasOwnProperty.call(
      goal.effortHistory,
      date
    )
  ) {
    return clampEffort(
      goal.effortHistory[date]
    );
  }

  return 0;
}

// ===== UPDATE EFFORT FOR SELECTED DATE =====

function updateEffort(id, value) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const view = getCalendarView(goal);
  const date = view.selectedDate;

  const oldHistory = {
    ...goal.effortHistory
  };

  const oldCheckins = [...goal.checkins];
  const oldEffort = goal.effort;

  const percentage = clampEffort(value);

  // Save the percentage for this date.
  goal.effortHistory[date] = percentage;

  // Selecting a percentage records this date.
  if (!goal.checkins.includes(date)) {
    goal.checkins.push(date);
  }

  // Keep latest selected effort for compatibility.
  goal.effort = percentage;

  if (!saveGoals()) {
    goal.effortHistory = oldHistory;
    goal.checkins = oldCheckins;
    goal.effort = oldEffort;
    renderGoals();
    return;
  }

  renderGoals();
}

// ===== TOGGLE DAILY CHECK-IN =====

function toggleCheckin(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const view = getCalendarView(goal);
  const date = view.selectedDate;

  const oldHistory = {
    ...goal.effortHistory
  };

  const oldCheckins = [...goal.checkins];

  if (goal.checkins.includes(date)) {
    // Remove this date's effort record.
    goal.checkins = goal.checkins.filter(
      d => d !== date
    );

    delete goal.effortHistory[date];

  } else {
    // Record selected date with 0% effort.
    goal.checkins.push(date);
    goal.effortHistory[date] = 0;
  }

  if (!saveGoals()) {
    goal.effortHistory = oldHistory;
    goal.checkins = oldCheckins;
    renderGoals();
    return;
  }

  renderGoals();
}


// ===== SAVE DAILY EFFORT NOTE =====

function saveDailyNote(id, date, note) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return false;

  const oldNotes = { ...goal.dailyNotes };

  const cleanedNote = note.trim().slice(0, 3000);

  if (cleanedNote) {
    goal.dailyNotes[date] = cleanedNote;
  } else {
    delete goal.dailyNotes[date];
  }

  if (!saveGoals()) {
    goal.dailyNotes = oldNotes;
    return false;
  }

  renderGoals();
  return true;
}

// ===== DELETE DAILY EFFORT NOTE =====

function deleteDailyNote(id, date) {
  const goal = goals.find(g => g.id === id);
  if (!goal || !goal.dailyNotes[date]) return;

  if (!confirm(
    "Delete your effort note for " +
    formatReadableDate(date) + "?"
  )) {
    return;
  }

  const oldNotes = { ...goal.dailyNotes };

  delete goal.dailyNotes[date];

  if (!saveGoals()) {
    goal.dailyNotes = oldNotes;
    return;
  }

  renderGoals();
}


// ===== DELETE GOAL =====

function deleteGoal(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  if (!confirm(
    `Delete "${goal.name}" and all its saved effort?`
  )) {
    return;
  }

  const previous = [...goals];

  goals = goals.filter(g => g.id !== id);

  if (!saveGoals()) {
    goals = previous;
    renderGoals();
    return;
  }

  delete calendarViews[id];

  renderGoals();
}

// ===== DASHBOARD =====

function renderDashboard() {
  const total = document.getElementById(
    "totalGoals"
  );

  const strong = document.getElementById(
    "completedGoals"
  );

  const todayCount = document.getElementById(
    "todayCheckins"
  );

  if (total) {
    total.textContent = goals.length;
  }

  if (strong) {
    strong.textContent = goals.filter(goal =>
      getDateEffort(goal, today()) >= 75
    ).length;
  }

  if (todayCount) {
    todayCount.textContent = goals.filter(goal =>
      goal.checkins.includes(today())
    ).length;
  }
}

// ===== CREATE EFFORT BAR =====

function createEffortBar(value) {
  const track = element(
    "div",
    "progress-track"
  );

  const fill = element(
    "div",
    "effort-fill"
  );

  fill.style.width = value + "%";

  track.append(fill);

  return { track, fill };
}

// ===== BUILD MONTHLY CALENDAR =====

function createCalendar(goal, view) {
  const calendar = element(
    "div",
    "goal-calendar"
  );

  // Header
  const heading = element(
    "div",
    "calendar-heading"
  );

  const previousBtn = element(
    "button",
    "calendar-nav",
    "‹"
  );

  previousBtn.type = "button";
  previousBtn.title = "Previous month";

  previousBtn.onclick = () =>
    changeCalendarMonth(goal.id, -1);

  const monthTitle = element(
    "div",
    "calendar-month-title",
    new Date(
      view.year,
      view.month,
      1
    ).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric"
    })
  );

  const nextBtn = element(
    "button",
    "calendar-nav",
    "›"
  );

  nextBtn.type = "button";
  nextBtn.title = "Next month";

  nextBtn.onclick = () =>
    changeCalendarMonth(goal.id, 1);

  heading.append(
    previousBtn,
    monthTitle,
    nextBtn
  );

  calendar.append(heading);

  // Weekday names
  const weekdays = element(
    "div",
    "calendar-weekdays"
  );

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .forEach(day => {
      weekdays.append(
        element(
          "div",
          "calendar-weekday",
          day
        )
      );
    });

  calendar.append(weekdays);

  // Dates
  const daysGrid = element(
    "div",
    "calendar-days"
  );

  const firstDay = new Date(
    view.year,
    view.month,
    1
  ).getDay();

  const daysInMonth = new Date(
    view.year,
    view.month + 1,
    0
  ).getDate();

  // Empty spaces before first date
  for (let i = 0; i < firstDay; i++) {
    const empty = element(
      "div",
      "calendar-day empty"
    );

    daysGrid.append(empty);
  }

  // Actual dates
  for (
    let dayNumber = 1;
    dayNumber <= daysInMonth;
    dayNumber++
  ) {
    const date = formatDate(
      new Date(
        view.year,
        view.month,
        dayNumber
      )
    );

    const dayButton = element(
      "button",
      "calendar-day",
      dayNumber
    );

    dayButton.type = "button";
    dayButton.dataset.date = date;

    const hasRecord =
      goal.checkins.includes(date);

    if (hasRecord) {
      const effort = getDateEffort(
        goal,
        date
      );

      const level = getEffortLevel(
        effort
      );

      dayButton.style.backgroundColor =
        level.color;

      dayButton.title =
        formatReadableDate(date) +
        " - " + effort + "% effort";

    } else {
      dayButton.title =
        formatReadableDate(date) +
        " - No effort recorded";
    }

    
    // Mark dates that have a saved written note
    if (goal.dailyNotes?.[date]) {
      dayButton.classList.add("has-note");
      dayButton.title += " • Written note saved";
    }


    if (date === today()) {
      dayButton.classList.add("today");
    }

    if (date === view.selectedDate) {
      dayButton.classList.add("selected");
    }

    dayButton.onclick = () =>
      selectCalendarDate(goal.id, date);

    daysGrid.append(dayButton);
  }

  calendar.append(daysGrid);

  // Selected date information
  const selectedInfo = element(
    "div",
    "calendar-selected-info"
  );

  const selectedEffort = getDateEffort(
    goal,
    view.selectedDate
  );

  const selectedHasRecord =
    goal.checkins.includes(
      view.selectedDate
    );

  selectedInfo.append(
    element(
      "strong",
      "",
      "📅 " + formatReadableDate(
        view.selectedDate
      )
    )
  );

  selectedInfo.append(
    element(
      "div",
      "",
      selectedHasRecord
        ? "Recorded effort: " +
          selectedEffort + "%"
        : "No effort recorded yet."
    )
  );

  calendar.append(selectedInfo);

  const hint = element(
    "p",
    "calendar-hint",
    "Tap any date, then move the effort slider."
  );

  calendar.append(hint);

  const todayBtn = element(
    "button",
    "calendar-today-btn",
    "♡ Go to Today"
  );

  todayBtn.type = "button";

  todayBtn.onclick = () =>
    goToToday(goal.id);

  calendar.append(todayBtn);

  return calendar;
}


// ===== DAILY EFFORT JOURNAL UI =====

function createDailyEffortSection(goal, selectedDate) {

  const section = element(
    "div",
    "daily-effort-section"
  );

  const title = element(
    "h4",
    "daily-effort-title",
    "🌷 My Daily Effort Journal"
  );

  const dateLabel = element(
    "p",
    "daily-effort-date",
    "📅 " + formatReadableDate(selectedDate)
  );

  const label = element(
    "label",
    "daily-effort-label",
    "✍️ How much effort did I put in today?"
  );

  const textarea = element(
    "textarea",
    "daily-effort-textarea"
  );

  textarea.id = "daily-note-" + goal.id;
  label.htmlFor = textarea.id;

  textarea.maxLength = 3000;

  textarea.placeholder =
    "What did I do today?\n" +
    "How much time did I spend?\n" +
    "What did I learn or improve?";

  textarea.value =
    goal.dailyNotes?.[selectedDate] || "";

  const buttons = element(
    "div",
    "daily-effort-buttons"
  );

  const saveBtn = element(
    "button",
    "daily-effort-save",
    "💾 Save My Effort"
  );

  saveBtn.type = "button";

  saveBtn.onclick = () => {
    saveDailyNote(
      goal.id,
      selectedDate,
      textarea.value
    );
  };

  const deleteBtn = element(
    "button",
    "daily-effort-delete",
    "🗑 Delete Note"
  );

  deleteBtn.type = "button";

  deleteBtn.onclick = () => {
    deleteDailyNote(goal.id, selectedDate);
  };

  buttons.append(saveBtn, deleteBtn);

  const feedback = element(
    "p",
    "daily-effort-feedback",
    "♡ Your words are saved when you click Save."
  );

  section.append(
    title,
    dateLabel,
    label,
    textarea,
    buttons,
    feedback
  );

  return section;
}


// ===== RENDER GOALS =====

function renderGoals() {
  const root = document.getElementById(
    "goalsList"
  );

  if (!root) return;

  root.replaceChildren();

  renderDashboard();

  if (!goals.length) {
    root.append(
      element(
        "div",
        "empty-state",
        "🌷 No goals yet. Plant your first dream!"
      )
    );

    return;
  }

  goals.forEach(goal => {
    const view = getCalendarView(goal);

    const selectedDate = view.selectedDate;

    const selectedEffort = getDateEffort(
      goal,
      selectedDate
    );

    const level = getEffortLevel(
      selectedEffort
    );

    const card = element(
      "article",
      "goal-card"
    );

    card.style.setProperty(
      "--effort-color",
      level.color
    );

    // GOAL TITLE
    const top = element(
      "div",
      "goal-top"
    );

    const title = element(
      "h3",
      "goal-title",
      "🌸 " + goal.name
    );

    const deleteBtn = element(
      "button",
      "delete-btn",
      "🗑"
    );

    deleteBtn.type = "button";
    deleteBtn.title = "Delete goal";

    deleteBtn.onclick = () =>
      deleteGoal(goal.id);

    top.append(title, deleteBtn);

    card.append(top);

    // DAILY ACTION
    card.append(
      element(
        "p",
        "goal-action",
        "📌 Daily action: " + goal.action
      )
    );

    // TARGET
    if (goal.target) {
      card.append(
        element(
          "p",
          "goal-meta",
          "🎯 Target: " + goal.target
        )
      );
    }

    // SELECTED DATE
    card.append(
      element(
        "p",
        "goal-meta",
        "📅 Editing: " +
          formatReadableDate(selectedDate)
      )
    );

    // EFFORT LABEL
    const effortLabel = element(
      "div",
      "goal-label"
    );

    const effortText = element(
      "span",
      "",
      "My Effort"
    );

    const effortValue = element(
      "strong",
      "",
      selectedEffort + "%"
    );

    effortLabel.append(
      effortText,
      effortValue
    );

    card.append(effortLabel);

    // EFFORT BAR
    const effortBar = createEffortBar(
      selectedEffort
    );

    card.append(effortBar.track);

    // EFFORT SLIDER
    const effortSlider = document.createElement(
      "input"
    );

    effortSlider.type = "range";
    effortSlider.min = "0";
    effortSlider.max = "100";
    effortSlider.step = "1";
    effortSlider.value = selectedEffort;
    effortSlider.className = "goal-slider";

    effortSlider.setAttribute(
      "aria-label",
      "Effort for " + goal.name +
        " on " + selectedDate
    );

    const status = element(
      "p",
      "effort-status",
      level.label
    );

    status.style.color = level.color;

    const message = element(
      "p",
      "goal-message",
      level.message
    );

    // LIVE SLIDER UPDATE
    effortSlider.addEventListener(
      "input",
      () => {
        const value = clampEffort(
          effortSlider.value
        );

        const newLevel = getEffortLevel(
          value
        );

        card.style.setProperty(
          "--effort-color",
          newLevel.color
        );

        effortBar.fill.style.width =
          value + "%";

        effortValue.textContent =
          value + "%";

        status.textContent =
          newLevel.label;

        status.style.color =
          newLevel.color;

        message.textContent =
          newLevel.message;

        // Immediately color selected date.
        const selectedBox = card.querySelector(
          '.calendar-day[data-date="' +
          selectedDate + '"]'
        );

        if (selectedBox) {
          selectedBox.style.backgroundColor =
            newLevel.color;

          selectedBox.title =
            formatReadableDate(selectedDate) +
            " - " + value + "% effort";
        }

        const selectedInfo = card.querySelector(
          ".calendar-selected-info"
        );

        if (selectedInfo) {
          const infoText =
            selectedInfo.querySelector("div");

          if (infoText) {
            infoText.textContent =
              "Recorded effort: " + value + "%";
          }
        }
      }
    );

    // SAVE SELECTED DATE'S EFFORT
    effortSlider.addEventListener(
      "change",
      () => {
        updateEffort(
          goal.id,
          effortSlider.value
        );
      }
    );

    card.append(effortSlider);
    card.append(status);

    // CHECK-IN BUTTON
    const checked = goal.checkins.includes(
      selectedDate
    );

    const checkBtn = element(
      "button",
      "checkin-btn",
      checked
        ? "✓ Remove effort for selected date"
        : "♡ Record effort for selected date"
    );

    checkBtn.type = "button";

    if (checked) {
      checkBtn.classList.add("done");
    }

    checkBtn.onclick = () =>
      toggleCheckin(goal.id);

    card.append(checkBtn);
    // DAILY EFFORT WRITING SPACE
    card.append(
      createDailyEffortSection(goal, selectedDate)
    );

    // MONTHLY CALENDAR
    card.append(
      createCalendar(goal, view)
    );

    // MOTIVATIONAL MESSAGE
    card.append(message);

    // TOTAL RECORDED DAYS
    card.append(
      element(
        "p",
        "goal-history",
        "🌿 Total days of effort: " +
          goal.checkins.length
      )
    );

    root.append(card);
  });
}

// ===== BACKUP GOALS =====

document.getElementById("backupBtn")
  .addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify(goals, null, 2)],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      "My-Goals-Backup-" + today() + ".json";

    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });

// ===== RESTORE GOALS =====

document.getElementById("restoreBtn")
  .addEventListener("click", () => {
    document.getElementById(
      "restoreFile"
    ).click();
  });

document.getElementById("restoreFile")
  .addEventListener(
    "change",
    async event => {
      const file = event.target.files[0];

      if (!file) return;

      try {
        const restored = JSON.parse(
          await file.text()
        );

        if (!Array.isArray(restored)) {
          throw new Error("Invalid backup");
        }

        if (restored.some(g =>
          !g ||
          typeof g.name !== "string" ||
          typeof g.action !== "string"
        )) {
          throw new Error(
            "Invalid goal data"
          );
        }

        const cleanGoals = restored
          .map(normalizeGoal)
          .filter(Boolean);

        if (!confirm(
          "Replace your current goals with this backup?"
        )) {
          return;
        }

        const previous = goals;

        goals = cleanGoals;

        if (!saveGoals()) {
          goals = previous;
          return;
        }

        // Reset calendar navigation.
        Object.keys(calendarViews).forEach(
          id => delete calendarViews[id]
        );

        renderGoals();

        alert(
          "Your goals have been restored! ♡"
        );

      } catch (error) {
        console.error(error);

        alert(
          "Invalid goals backup file."
        );

      } finally {
        event.target.value = "";
      }
    }
  );

// ===== INITIALIZE =====

loadGoals();
renderGoals();

console.log(
  "🌷 My Goals & Growth is ready!"
);

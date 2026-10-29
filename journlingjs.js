
"use strict";

const $ = id => document.getElementById(id);
const sheet = $("journalSheet");
const layer = $("itemLayer");
const canvas = $("drawingCanvas");
const ctx = canvas.getContext("2d");
const KEY = "my-real-scrapbook-v1";

const colors = {
  pink: "#f8c9de",
  yellow: "#fff0a8",
  green: "#d0eacb",
  red: "#f6bfc0",
  blue: "#c8e4fc"
};

const themes = [
  "cream", "pink", "yellow", "green", "blue",
  "red", "lavender", "lined", "grid"
];

let data = { entries: {}, moods: {} };
let date = today();
let month = new Date();
let mode = "write";
let selected = null;
let topLayer = 10;
let drawing = false;
let currentStroke = null;
let strokes = [];
let imageKind = "photo";
let currentStickyColor = "#fff0ae";

function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function readable(d) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(
    "en-IN",
    { weekday: "long", day: "numeric",
      month: "long", year: "numeric" }
  );
}

function store() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(e);
    alert("Storage is full. Download a backup of your journal.");
    return false;
  }
}

function readStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.entries && saved.moods) data = saved;
  } catch (e) {
    console.error("Unable to read saved journal", e);
  }
}

// ===== CALENDAR =====

function renderCalendar() {
  const root = $("calendar");
  root.replaceChildren();

  const y = month.getFullYear();
  const m = month.getMonth();

  $("monthTitle").textContent = month.toLocaleDateString(
    "en-IN", { month: "long", year: "numeric" }
  );

  const offset = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    root.append(document.createElement("span"));
  }

  for (let n = 1; n <= days; n++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    const b = document.createElement("button");
    b.textContent = n;

    if (data.moods[key]) {
      b.style.background = colors[data.moods[key]];
    }

    if (key === date) b.classList.add("selected");
    if (data.entries[key]) b.classList.add("saved");

    b.onclick = () => {
    date = key;
    loadPage();
    renderCalendar();
  };

    root.append(b);
  }
}

$("prevMonth").onclick = () => {
  month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  renderCalendar();
};

$("nextMonth").onclick = () => {
  month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  renderCalendar();
};

document.querySelectorAll("[data-mood]").forEach(b => {
  b.onclick = () => {
    data.moods[date] = b.dataset.mood;
    store();
    renderCalendar();
  };
});

$("clearMood").onclick = () => {
  delete data.moods[date];
  store();
  renderCalendar();
};

// ===== EDITOR MODES =====

const hints = {
  write: "Write mode: click anywhere on empty paper to type.",
  draw: "Draw mode: hold and move your mouse to draw.",
  erase: "Erase Ink: draw over pen strokes to erase them.",
  move: "Move mode: drag text, stickers, and photographs."
};


function setMode(next) {
  mode = next;

  document.querySelectorAll(".mode").forEach(b => {
    b.classList.toggle(
      "active",
      b.dataset.mode === mode
    );
  });

  $("modeHint").textContent = hints[mode];

  sheet.style.cursor =
    mode === "write" ? "text" :
    mode === "move" ? "grab" : "crosshair";

  const isDrawing =
    mode === "draw" || mode === "erase";

  // Enable canvas when drawing or erasing
  canvas.style.pointerEvents =
    isDrawing ? "auto" : "none";

  // Prevent item layer from blocking canvas
  layer.style.pointerEvents =
    isDrawing ? "none" : "auto";

  // Disable interaction with individual items
  layer.querySelectorAll(".journal-item").forEach(item => {
    item.style.pointerEvents =
      isDrawing ? "none" : "auto";
  });
}


document.querySelectorAll(".mode").forEach(b => {
  b.onclick = () => setMode(b.dataset.mode);
});

// ===== PAPER THEMES =====

function setTheme(theme) {
  if (!themes.includes(theme)) theme = "cream";
  sheet.className = `journal-sheet ${theme}`;
  $("paperTheme").value = theme;
}

$("paperTheme").onchange = e => setTheme(e.target.value);

// ===== ITEMS =====

function selectItem(item) {
  if (selected) selected.classList.remove("selected");
  selected = item;

  if (!item) return;

  item.classList.add("selected");
  
if (item.dataset.type === "todo") {
  $("todoStyle").value =
    item.dataset.design || "rainbow";

  $("todoCheckStyle").value =
    item.dataset.todoStyle || "strike";

  $("todoColor").value =
    item.dataset.todoColor || "#ffd6e7";

  $("todoOpacity").value =
    item.dataset.todoOpacity ?? 100;

  $("todoOpacityValue").textContent =
    $("todoOpacity").value + "%";
}

  $("itemWidth").value = Math.max(
    40, Math.min(500, parseFloat(item.style.width) || 180)
  );
  $("itemRotation").value = item.dataset.rotation || 0;
  $("textDirection").value =
  item.dataset.textDirection || "horizontal";
  
if (item.dataset.type === "note") {
  const opacity = parseFloat(item.style.opacity || "1");
  const transparency = Math.round((1 - opacity) * 100);

  $("stickyTransparency").value = transparency;
  $("transparencyValue").textContent = `${transparency}%`;
}

}

function makeItem(type, opt = {}) {
  const el = document.createElement("div");
  el.className = `journal-item ${type}`;
  el.dataset.type = type;
  el.dataset.rotation = opt.rotation || 0;

  el.style.left = `${opt.x ?? 80}px`;
  el.style.top = `${opt.y ?? 90}px`;
  el.style.width = `${opt.width ?? 200}px`;
  if (opt.height) {
  el.style.height = `${opt.height}px`;
    }   
  el.style.zIndex = opt.z ?? ++topLayer;
  el.style.transform = `rotate(${el.dataset.rotation}deg)`;
  el.style.opacity = opt.opacity ?? 1;


if (type === "text" || type === "note") {
  el.textContent = opt.text ?? "";
  el.style.fontFamily = opt.font || $("fontSelect").value;
  el.style.fontSize = `${opt.size || $("fontSize").value}px`;
  el.style.color = opt.color || $("inkColor").value;

if (type === "note") {
  el.style.backgroundColor =
    opt.backgroundColor || "#fff0ae";
}

  // Restore saved text direction
  applyTextDirection(el, opt.textDirection || "horizontal");
}


  if (type === "sticker") {
    el.textContent = opt.text || "🌸";
    el.style.fontSize = `${opt.size || 65}px`;
  }

  if (type === "image") {
    const img = document.createElement("img");
    img.src = opt.src || "";
    img.crossOrigin = "anonymous";
    img.alt = "Scrapbook image";
    img.draggable = false;
    el.append(img);
  }

  el.addEventListener("pointerdown", e => {
    if (["draw", "erase"].includes(mode)) return;

    e.stopPropagation();
    selectItem(el);

    if (el.isContentEditable) return;

    if (mode === "write" &&
        ["text", "note"].includes(type)) {
      editText(el);
      return;
    }

    if (mode !== "move") return;

    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);



    function move(ev) {
      const bounds = sheet.getBoundingClientRect();
      const scaleX = sheet.clientWidth / bounds.width;
      const scaleY = sheet.clientHeight / bounds.height;

      el.style.left = `${Math.max(0, Math.min(
        700 - el.offsetWidth,
        x + (ev.clientX - startX) * scaleX
      ))}px`;

      el.style.top = `${Math.max(0, Math.min(
        900 - el.offsetHeight,
        y + (ev.clientY - startY) * scaleY
      ))}px`;
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  });

  el.addEventListener("dblclick", () => {
    if (type === "text" || type === "note") editText(el);
  });

 
el.addEventListener("blur", () => {
  el.contentEditable = "false";
  el.classList.remove("editing");
});


  layer.append(el);
  selectItem(el);
  return el;
}

 

function editText(el) {
  setMode("write");

  el.classList.add("editing");
  el.contentEditable = "true";

  // Keep normal left-to-right typing
  el.setAttribute("dir", "ltr");

  // Ensure text is before the resize handles
  let textNode = [...el.childNodes].find(
    node => node.nodeType === Node.TEXT_NODE
  );

  if (!textNode) {
    textNode = document.createTextNode("");
    el.insertBefore(textNode, el.firstChild);
  }

  el.focus();

  // Place cursor at the end of the actual text
  const range = document.createRange();
  range.setStart(textNode, textNode.textContent.length);
  range.collapse(true);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}


// ===== WRITING FONT SETTINGS =====

let writingFontSize = 30;
let writingFontColor = "#654b59";

$("writingFontSize").addEventListener("input", function () {
  writingFontSize = Number(this.value);

  if (selected && selected.dataset.type === "text") {
    selected.style.fontSize = `${writingFontSize}px`;
  }
});

$("writingFontColor").addEventListener("input", function () {
  writingFontColor = this.value;

  if (selected && selected.dataset.type === "text") {
    selected.style.color = writingFontColor;
  }
});




// ===== CLICK ANYWHERE TO WRITE =====

sheet.addEventListener("pointerdown", e => {
  if (mode !== "write") return;
  if (e.target.closest(".journal-item")) return;

  const rect = sheet.getBoundingClientRect();
  const x = (e.clientX - rect.left) * 700 / rect.width;
  const y = (e.clientY - rect.top) * 900 / rect.height;

 
  const item = makeItem("text", {
    x: Math.min(x, 430),
    y: Math.min(y, 850),
    width: 260,
    text: "",
    size: writingFontSize,
    color: writingFontColor
  });


  editText(item);
});


$("addTextBtn").onclick = () => {
  const item = makeItem("text", {
    x: 90,
    y: 110,
    width: 270,
    text: "",
    size: writingFontSize,
    color: writingFontColor
  });

  editText(item);
};


// ===== FREEHAND DRAWING =====

function pointOnCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height
  };
}

function paintStroke(s) {
  if (!s.points.length) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.size;

  if (s.erase) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
  }

  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);

  if (s.points.length === 1) {
    ctx.arc(
      s.points[0].x,
      s.points[0].y,
      s.size / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    for (const p of s.points.slice(1)) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function redrawInk() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach(paintStroke);
}

canvas.addEventListener("pointerdown", e => {
  if (!["draw", "erase"].includes(mode)) return;
    e.preventDefault();
  drawing = true;
  canvas.setPointerCapture(e.pointerId);

  currentStroke = {
    color: $("inkColor").value,
    size: Number($("penSize").value) * (mode === "erase" ? 5 : 1),
    erase: mode === "erase",
    points: [pointOnCanvas(e)]
  };

  strokes.push(currentStroke);
  redrawInk();
});

canvas.addEventListener("pointermove", e => {
  if (!drawing || !currentStroke) return;

  currentStroke.points.push(pointOnCanvas(e));
  redrawInk();
});

function stopDrawing() {
  drawing = false;
  currentStroke = null;
}

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

$("undoInkBtn").onclick = () => {
  strokes.pop();
  redrawInk();
};

// ===== STICKERS AND DECORATIONS =====


$("stickyGradientPicker").addEventListener("input", function () {
  const color = this.value;

  currentStickyColor = color;
  $("stickyColorValue").textContent = color;

  // Change only the selected sticky note
  if (selected && selected.dataset.type === "note") {
    selected.style.backgroundColor = color;
  }
});

document.querySelectorAll("[data-sticker]").forEach(b => {
  b.onclick = () => {
    makeItem("sticker", {
      text: b.dataset.sticker,
      width: 95
    });
    setMode("move");
  };
});


$("stickyNoteBtn").onclick = () => {
  const item = makeItem("note", {
    text: "",
    width: 220,
    height: 160,
    backgroundColor: currentStickyColor
  });

  item.style.backgroundColor = currentStickyColor;

  editText(item);
};


$("heartBtn").onclick = () => {
  makeItem("sticker", { text: "♡", width: 90, size: 75 });
  setMode("move");
};

$("dividerBtn").onclick = () => {
  makeItem("text", {
    text: "✦ ───────── ✦",
    width: 260,
    size: 25
  });
  setMode("move");
};

$("tapeBtn").onclick = () => {
  makeItem("text", {
    text: "▰ ▰ ▰ ▰ ▰",
    width: 200,
    size: 28,
    color: "#dca7c3"
  });
  setMode("move");
};

// ===== UPLOAD PHOTOS AND STICKERS =====

$("uploadPhotoBtn").onclick = () => {
  imageKind = "photo";
  $("imageFile").click();
};

$("uploadStickerBtn").onclick = () => {
  imageKind = "sticker";
  $("imageFile").click();
};

$("imageFile").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      const c = document.createElement("canvas");
      const scale = Math.min(
        1, 1100 / Math.max(img.width, img.height)
      );

      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));

      c.getContext("2d").drawImage(
        img, 0, 0, c.width, c.height
      );

      const transparent =
        imageKind === "sticker" &&
        ["image/png", "image/webp"].includes(file.type);

      const src = transparent
        ? c.toDataURL("image/png")
        : c.toDataURL("image/jpeg", 0.8);

      makeItem("image", {
        src,
        width: imageKind === "photo" ? 250 : 130
      });

      setMode("move");
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
  e.target.value = "";
};

$("addUrlBtn").onclick = () => {
  try {
    const url = new URL($("imageUrl").value.trim());

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Unsupported URL");
    }

    makeItem("image", { src: url.href, width: 150 });
    $("imageUrl").value = "";
    setMode("move");
  } catch {
    alert("Enter a valid image URL.");
  }
};

// ===== SELECTED ITEM CONTROLS =====

function applyTextDirection(item, direction) {
  if (!item || !["text", "note"].includes(item.dataset.type)) {
    return;
  }

  item.dataset.textDirection = direction;

  if (direction === "vertical") {
    item.style.writingMode = "vertical-rl";
    item.style.textOrientation = "upright";
  } else {
    item.style.writingMode = "horizontal-tb";
    item.style.textOrientation = "mixed";
  }
}

$("textDirection").addEventListener("change", function () {
  if (!selected) return;

  applyTextDirection(selected, this.value);
});


const stickyTransparency = $("stickyTransparency");
const transparencyValue = $("transparencyValue");

stickyTransparency.addEventListener("input", function () {
  if (!selected || selected.dataset.type !== "note") return;

  const transparency = Number(this.value);

  // Convert transparency percentage to opacity
  const opacity = 1 - transparency / 100;

  selected.style.opacity = opacity;
  transparencyValue.textContent = `${transparency}%`;
});


$("itemWidth").oninput = e => {
  if (selected) selected.style.width = `${e.target.value}px`;
};

$("itemRotation").oninput = e => {
  if (!selected) return;
  selected.dataset.rotation = e.target.value;
  selected.style.transform = `rotate(${e.target.value}deg)`;
};

$("fontSelect").onchange = e => {
  if (selected && ["text", "note"].includes(selected.dataset.type)) {
    selected.style.fontFamily = e.target.value;
  }
};

$("fontSize").oninput = e => {
  if (selected && ["text", "note"].includes(selected.dataset.type)) {
    selected.style.fontSize = `${e.target.value}px`;
  }
};

$("inkColor").oninput = e => {
  if (selected && ["text", "note"].includes(selected.dataset.type)) {
    selected.style.color = e.target.value;
  }
};

$("frontBtn").onclick = () => {
  if (selected) selected.style.zIndex = ++topLayer;
};

$("backBtn").onclick = () => {
  if (selected) selected.style.zIndex = 1;
};

$("deleteItemBtn").onclick = () => {
  if (!selected) return;
  selected.remove();
  selected = null;
};

// ===== SAVE AND LOAD =====


function serializeItems() {
  
  
const todoItems = [...layer.querySelectorAll(
  ".journal-item.todo"
)].map(el => ({
  type: "todo",
  x: parseFloat(el.style.left) || 0,
  y: parseFloat(el.style.top) || 0,
  width: parseFloat(el.style.width) || 260,
  height: parseFloat(el.style.height) || 200,
  z: Number(el.style.zIndex || 1),

  rotation: Number(el.dataset.rotation || 0),

  // Save completion style
  todoStyle: el.dataset.todoStyle || "strike",

  // Save visual design
  design: el.dataset.design || "rainbow",
  color: el.dataset.todoColor || "#ffd6e7",
  opacity: Number(el.dataset.todoOpacity ?? 100),

  title: el.querySelector(".todo-title")
    ?.textContent || "",

  tasks: [...el.querySelectorAll(".todo-row")].map(row => ({
    text: row.querySelector(".todo-task-text")
      ?.textContent || "",
    checked: row.querySelector(".todo-checkbox")
      ?.checked || false
  }))
}));


  const regularItems = [...layer.querySelectorAll(
    ".journal-item:not(.todo):not(.water)"
  )].map(el => ({
    type: el.dataset.type,
    backgroundColor: el.dataset.type === "note"
  ? el.style.backgroundColor
  : "",

    x: parseFloat(el.style.left) || 0,
    y: parseFloat(el.style.top) || 0,

    width: parseFloat(el.style.width) || 180,
    height: parseFloat(el.style.height) || el.offsetHeight,

    opacity: parseFloat(el.style.opacity || "1"),

    rotation: Number(el.dataset.rotation || 0),
    z: Number(el.style.zIndex || 1),
    textDirection: el.dataset.textDirection || "horizontal",

    // Save only actual text, not resize handles
    text: el.dataset.type === "image"
      ? ""
      : [...el.childNodes]
          .filter(node => !(
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains("resize-handle")
          ))
          .map(node => node.textContent)
          .join(""),

    // Save uploaded image
    src: el.dataset.type === "image"
      ? el.querySelector("img")?.src || ""
      : "",

    font: el.style.fontFamily,
    size: parseFloat(el.style.fontSize) || 30,
    color: el.style.color
  }));
  return [...regularItems, ...todoItems, ...waterItems];
  
const waterItems = [...layer.querySelectorAll(
  ".journal-item.water"
)].map(el => ({
  type: "water",
  x: parseFloat(el.style.left) || 0,
  y: parseFloat(el.style.top) || 0,
  width: parseFloat(el.style.width) || 260,
  height: parseFloat(el.style.height) || 390,
  z: Number(el.style.zIndex || 1),
  rotation: Number(el.dataset.rotation || 0),
  goal: Number(el.dataset.goal || 2500),
  drunk: Number(el.dataset.drunk || 0)
}));

}


setInterval(() => {
  const hasItems = layer.querySelector(".journal-item") !== null;
  const hasInk = strokes.length > 0;

  // Don't recreate an empty journal entry
  if (hasItems || hasInk || data.entries[date]) {
    save(false);
  }
}, 30000);


function save(showMessage = true) {
  try {
    data.entries[date] = {
      theme: $("paperTheme").value,
      items: serializeItems(),
      strokes: structuredClone(strokes),
      updated: new Date().toISOString()
    };

    const ok = store();

    if (ok) {
      renderCalendar();
      renderEntries();

      if (showMessage) {
        alert("Your journal page has been saved! ♡");
      }
    }

    return ok;

  } catch (error) {
    console.error("Journal save failed:", error);

    if (showMessage) {
      alert("Unable to save your journal. Check the browser console.");
    }

    return false;
  }
}


function loadPage() {
  layer.replaceChildren();
  selected = null;
  topLayer = 10;

  const entry = data.entries[date];
  setTheme(entry?.theme || "cream");

  strokes = Array.isArray(entry?.strokes)
    ? structuredClone(entry.strokes) : [];

  redrawInk();

for (const item of entry?.items || []) {
  if (item.type === "todo") {
  createTodoList(item);
} else if (item.type === "water") {
  createWaterBuddy(item);
} else {
  makeItem(item.type, item);
}

  topLayer = Math.max(topLayer, item.z || 1);
}
  selectItem(null);
  $("dateLabel").textContent = readable(date);
  setMode("write");
}


function renderEntries() {
  const root = $("entryList");
  root.replaceChildren();

  const dates = Object.keys(data.entries)
    .sort()
    .reverse();

  if (!dates.length) {
    root.textContent =
      "Your memories will appear here ♡";
    return;
  }

  dates.forEach(d => {
    const row = document.createElement("div");
    row.className = "saved-entry-row";

    // Open saved journal
    const openBtn = document.createElement("button");
    openBtn.className = "saved-entry-open";
    openBtn.textContent = `📖 ${readable(d)}`;

    openBtn.onclick = () => {
      if (date !== d) {
        // Don't automatically save the previous page
        date = d;

        const [y, m] = d.split("-").map(Number);
        month = new Date(y, m - 1, 1);

        loadPage();
        renderCalendar();
      }
    };

    // Delete saved journal
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "saved-entry-delete";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Delete saved journal";

    deleteBtn.onclick = () => {
      const confirmed = confirm(
        `Delete the saved journal for ${readable(d)}?\n\n` +
        "This cannot be undone."
      );

      if (!confirmed) return;

      delete data.entries[d];

      if (!store()) {
        return;
      }

      // Clear the page if currently viewing it
      if (date === d) {
        loadPage();
      }

      renderEntries();
      renderCalendar();
    };

    row.append(openBtn, deleteBtn);
    root.appendChild(row);
  });
}


$("saveBtn").onclick = () => save(true);

$("newPageBtn").onclick = () => {
  if (!confirm("Clear this date's scrapbook page?")) return;

  layer.replaceChildren();
  strokes = [];
  redrawInk();
  selected = null;
  setTheme("cream");

  delete data.entries[date];
  store();
  renderCalendar();
  renderEntries();
};

// ===== DOWNLOAD SHEET =====

$("downloadBtn").onclick = async () => {
  if (typeof html2canvas === "undefined") {
    alert("Image export library not loaded. Check your internet.");
    return;
  }

  if (selected) {
    selected.contentEditable = "false";
    selected.classList.remove("selected");
  }

  try {
    const output = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: null
    });

    const link = document.createElement("a");
    link.download = `My-Scrapbook-${date}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error(error);
    alert("Download failed. Try uploading external stickers as files.");
  } finally {
    if (selected) selected.classList.add("selected");
  }
};

// ===== BACKUP AND RESTORE =====

$("backupBtn").onclick = () => {
  save(false);

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Scrapbook-Backup-${today()}.json`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$("restoreBtn").onclick = () => $("restoreFile").click();

$("restoreFile").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const restored = JSON.parse(await file.text());

    if (
      !restored ||
      !restored.entries ||
      !restored.moods ||
      typeof restored.entries !== "object" ||
      typeof restored.moods !== "object" ||
      Array.isArray(restored.entries) ||
      Array.isArray(restored.moods)
    ) {
      throw new Error("Invalid backup");
    }

    if (!confirm("Replace current journals with this backup?")) return;

    const previous = data;
    data = restored;

    if (!store()) {
      data = previous;
      return;
    }

    date = today();
    month = new Date();

    loadPage();
    renderCalendar();
    renderEntries();

    alert("Your memories have been restored ♡");
  } catch (error) {
    console.error(error);
    alert("Invalid journal backup file.");
  } finally {
    e.target.value = "";
  }
};

/* ===== TO-DO LIST ===== */

function createTodoList(options = {}) {
  const item = document.createElement("div");

  
item.className = "journal-item todo";
item.dataset.type = "todo";

// Checkbox completion style
item.dataset.todoStyle =
  options.todoStyle ||
  $("todoCheckStyle").value;

// Visual list design
item.dataset.design =
  options.design || $("todoStyle").value;

item.dataset.todoColor =
  options.color || $("todoColor").value;

item.dataset.todoOpacity =
  options.opacity ?? Number($("todoOpacity").value);

// Apply selected design
applyTodoDesign(item, {
  style: item.dataset.design,
  color: item.dataset.todoColor,
  opacity: Number(item.dataset.todoOpacity)
});


  item.style.position = "absolute";
  item.style.left = `${options.x ?? 90}px`;
  item.style.top = `${options.y ?? 110}px`;
  item.style.width = `${options.width ?? 260}px`;
  item.style.height = `${options.height ?? 200}px`;
  item.style.zIndex = options.z ?? ++topLayer;

  const title = document.createElement("div");
  title.className = "todo-title";
  title.contentEditable = "true";
  title.textContent = options.title ?? "My To-Do List ♡";

  const tasks = document.createElement("div");
  tasks.className = "todo-tasks";

  function addTask(text = "", checked = false) {
    const row = document.createElement("div");
    row.className = "todo-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = checked;

    const taskText = document.createElement("span");
    taskText.className = "todo-task-text";
    taskText.contentEditable = "true";
    taskText.textContent = text;

    row.append(checkbox, taskText);
    tasks.appendChild(row);

    
  }

  const savedTasks = options.tasks ?? [
    { text: "My first task", checked: false },
    { text: "My second task", checked: false }
  ];

  savedTasks.forEach(task => {
    addTask(task.text, task.checked);
  });

  const addTaskButton = document.createElement("button");
  addTaskButton.type = "button";
  addTaskButton.className = "todo-add-task";
  addTaskButton.textContent = "+ Add Task";

  addTaskButton.addEventListener("click", e => {
  e.stopPropagation();
  addTask();
});

  

  item.append(title, tasks, addTaskButton);
  layer.appendChild(item);

  item.addEventListener("pointerdown", e => {
    e.stopPropagation();
    selectItem(item);

    // Allow normal checkbox clicking and task editing
    if (e.target.closest(
      ".todo-checkbox, .todo-task-text, .todo-title, .todo-add-task"
    )) {
      return;
    }

    if (mode !== "move") return;

    const startX = e.clientX;
    const startY = e.clientY;
    const x = parseFloat(item.style.left);
    const y = parseFloat(item.style.top);

    function move(ev) {
      const bounds = sheet.getBoundingClientRect();
      const scaleX = sheet.clientWidth / bounds.width;
      const scaleY = sheet.clientHeight / bounds.height;

      item.style.left = `${x + (ev.clientX - startX) * scaleX}px`;
      item.style.top = `${y + (ev.clientY - startY) * scaleY}px`;
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  });

  selectItem(item);
  return item;
}


$("addTodoBtn").addEventListener("click", () => {
  const design = $("todoStyle").value;
  const checkStyle = $("todoCheckStyle").value;
  const color = $("todoColor").value;
  const opacity = Number($("todoOpacity").value);

  createTodoList({
    design: design,
    todoStyle: checkStyle,
    color: color,
    opacity: opacity,
    title: "My To-Do List ♡",
    width: 260,
    height: 200
  });

  setMode("move");
  save(false);
});



// Change selected To-Do List design
$("todoStyle").addEventListener("change", function () {
  if (!selected || selected.dataset.type !== "todo") {
    return;
  }

  selected.dataset.design = this.value;

  applyTodoDesign(selected, {
    style: this.value,
    color: selected.dataset.todoColor,
    opacity: Number(selected.dataset.todoOpacity)
  });

  save(false);
});

// Change checkbox completion style
$("todoCheckStyle").addEventListener("change", function () {
  if (!selected || selected.dataset.type !== "todo") {
    return;
  }

  selected.dataset.todoStyle = this.value;
  save(false);
});




/* ===== CANVA-STYLE RESIZE HANDLES ===== */

const RESIZE_HANDLES = [
  "nw", "n", "ne",
  "e", "se", "s",
  "sw", "w"
];

function addResizeHandles(item) {
  // Avoid duplicate handles
  if (item.querySelector(".resize-handle")) return;

  RESIZE_HANDLES.forEach(direction => {
    const handle = document.createElement("div");

    handle.className = `resize-handle handle-${direction}`;
    handle.dataset.direction = direction;

    handle.contentEditable = "false";
    handle.setAttribute("aria-hidden", "true");
    item.appendChild(handle);

    handle.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();

      selectItem(item);
      setMode("move");

      const startX = e.clientX;
      const startY = e.clientY;

      const startLeft = parseFloat(item.style.left) || 0;
      const startTop = parseFloat(item.style.top) || 0;
      const startWidth = item.offsetWidth;
      const startHeight = item.offsetHeight;

      const rect = sheet.getBoundingClientRect();
      const scaleX = sheet.clientWidth / rect.width;
      const scaleY = sheet.clientHeight / rect.height;

      function onResizeMove(ev) {
        const dx = (ev.clientX - startX) * scaleX;
        const dy = (ev.clientY - startY) * scaleY;

        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction.includes("e")) {
          newWidth = startWidth + dx;
        }

        if (direction.includes("w")) {
          newWidth = startWidth - dx;
          newLeft = startLeft + dx;
        }

        if (direction.includes("s")) {
          newHeight = startHeight + dy;
        }

        if (direction.includes("n")) {
          newHeight = startHeight - dy;
          newTop = startTop + dy;
        }

        
            const isText =
            item.dataset.type === "text" ||
            item.dataset.type === "note";

            
          const isWater = item.dataset.type === "water";

          const minWidth = isWater ? 150 : isText ? 120 : 40;
          const minHeight = isWater ? 230 : 30;



        if (newWidth < minWidth) {
          if (direction.includes("w")) {
            newLeft = startLeft + startWidth - minWidth;
          }
          newWidth = minWidth;
        }

        if (newHeight < minHeight) {
          if (direction.includes("n")) {
            newTop = startTop + startHeight - minHeight;
          }
          newHeight = minHeight;
        }

        item.style.left = `${newLeft}px`;
        item.style.top = `${newTop}px`;
        item.style.width = `${newWidth}px`;
        item.style.height = `${newHeight}px`;

        // Scale emoji stickers with the box
        if (item.dataset.type === "sticker") {
          item.style.fontSize = `${Math.min(
            newWidth * 0.75,
            newHeight * 0.75
          )}px`;
        }

        $("itemWidth").value = Math.min(500, newWidth);
      }

      function onResizeEnd() {
        window.removeEventListener("pointermove", onResizeMove);
        window.removeEventListener("pointerup", onResizeEnd);
      }

      window.addEventListener("pointermove", onResizeMove);
      window.addEventListener("pointerup", onResizeEnd);
    });
  });
}


const todoColor = $("todoColor");
const todoOpacity = $("todoOpacity");
const todoOpacityValue = $("todoOpacityValue");

function updateTodoDesign() {
  todoOpacityValue.textContent =
    todoOpacity.value + "%";

  if (!selected || selected.dataset.type !== "todo") {
    return;
  }

  selected.dataset.todoColor = todoColor.value;
  selected.dataset.todoOpacity = todoOpacity.value;

  applyTodoDesign(selected, {
    style: selected.dataset.design || "rainbow",
    color: todoColor.value,
    opacity: Number(todoOpacity.value)
  });

  save(false);
}

todoColor.addEventListener("input", updateTodoDesign);
todoOpacity.addEventListener("input", updateTodoDesign);



// Automatically attach handles to all existing and new items
const resizeObserver = new MutationObserver(() => {
  layer.querySelectorAll(".journal-item").forEach(addResizeHandles);
});

resizeObserver.observe(layer, {
  childList: true
});

layer.querySelectorAll(".journal-item").forEach(addResizeHandles);

// ===== START =====

readStorage();
loadPage();
renderCalendar();
renderEntries();

console.log("🌷 Scrapbook editor is ready!");


const todoStyleSelect =
  document.getElementById("todoStyle");

const todoCustomColor =
  document.getElementById("todoCustomColor");

const todoOpacitySlider =
  document.getElementById("todoOpacity");

function applyTodoDesign(todoElement, design) {
  if (!todoElement) return;

  const styles = [
    "rainbow", "dashed", "lined", "boxes",
    "dotted", "minimal", "gradient", "custom"
  ];

  todoElement.classList.remove(...styles);
  todoElement.classList.add(design.style);

  todoElement.style.setProperty(
    "--todo-bg",
    design.color || "#f9dce9"
  );

  // Apply transparency to the background only.
  // This preserves the visibility of text and checkboxes.
  const opacity = Math.max(
  0,
  Math.min(100, Number(design.opacity ?? 100))
) / 100;

  const backgrounds = {
    rainbow: [
      "#f9d6e5", "#ffe8be", "#fff4c8",
      "#d9f1d8", "#d9eafa", "#e7ddfa"
    ],
    gradient: ["#fbd9e8", "#e2dcfa", "#d9ecff"]
  };

  function rgba(hex) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},` +
      `${n >> 8 & 255},${n & 255},${opacity})`;
  }

  if (backgrounds[design.style]) {
    todoElement.style.background =
      `linear-gradient(135deg, ${
        backgrounds[design.style].map(rgba).join(",")
      })`;
  } else {
    const base = design.style === "custom"
      ? design.color
      : design.style === "minimal"
        ? "#ffffff"
        : design.style === "dotted"
          ? "#f1e5ff"
          : "#fffaf1";

    todoElement.style.background = rgba(base);
  }

  // Keep notebook ruling visible
  if (design.style === "lined") {
    todoElement.style.backgroundImage =
      `repeating-linear-gradient(to bottom,
      transparent 0px,
      transparent 33px,
      rgba(120,160,190,.5) 34px,
      transparent 35px)`;
  }
}

/* ===== WATER INTAKE BUDDY ===== */

function createWaterBuddy(options = {}) {
  const item = makeItem("water", {
    x: options.x ?? 110,
    y: options.y ?? 140,
    width: options.width ?? 260,
    height: options.height ?? 390,
    z: options.z,
    rotation: options.rotation ?? 0
  });

  item.dataset.goal = options.goal ?? 2500;
  item.dataset.drunk = options.drunk ?? 0;

  item.innerHTML = `
    <div class="water-heading">💧 My Water Buddy</div>
    <div class="water-subtitle">Every sip is self-love ♡</div>

    <div class="water-glass sad">
      <div class="water-liquid"></div>

      <div class="water-face">
        <div class="water-eyes">
          <span></span><span></span>
        </div>
        <div class="water-mouth"></div>
      </div>
    </div>

    <div class="water-message"></div>
    <div class="water-progress"></div>

    <div class="water-settings">
      <label>🎯 Daily goal (liters)</label>
      <input class="water-goal"
        type="number" min="0.25" max="10"
        step="0.25" value="${Number(item.dataset.goal) / 1000}">

      
      <label>💦 Water consumed (liters)</label>
      <input
        class="water-amount"
        type="number"
        min="0"
        step="0.1"
        value="${Number(item.dataset.drunk) / 1000}"
        placeholder="Enter water consumed"
      />


      <div class="water-actions">
        <button type="button" class="water-add">
          + Drink
        </button>
        <button type="button" class="water-reset">
          ↺ Reset
        </button>
      </div>
  `;

  const glass = item.querySelector(".water-glass");
  const liquid = item.querySelector(".water-liquid");
  const message = item.querySelector(".water-message");
  const progressText = item.querySelector(".water-progress");

  function updateWater() {
    const goal = Number(item.dataset.goal);
    const drunk = Number(item.dataset.drunk);
    const percent = Math.min(100, drunk / goal * 100);

    liquid.style.height = percent + "%";
    glass.classList.remove("sad", "happy");

    if (percent >= 100) {
      glass.classList.add("happy");
      message.textContent = "Yay! I'm feeling amazing! 💙";
    } else if (percent >= 40) {
      message.textContent = "A little more water, please! 🥹";
    } else {
      glass.classList.add("sad");
      message.textContent = "I'm thirsty! A sip for me? 🥺";
    }

    progressText.textContent =
      `${(drunk / 1000).toFixed(2)} L / ` +
      `${(goal / 1000).toFixed(2)} L ` +
      `(${Math.round(percent)}%)`;
  }

  item.querySelector(".water-goal").addEventListener(
    "input", e => {
      const liters = Number(e.target.value);

      if (!Number.isFinite(liters) ||
          liters < 0.25 || liters > 10) {
        e.target.value = Number(item.dataset.goal) / 1000;
        return;
      }

      item.dataset.goal = Math.round(liters * 1000);
      updateWater();
    }
  );

  
    // Directly update water level from the user's input
    const waterAmountInput = item.querySelector(".water-amount");

    waterAmountInput.addEventListener("input", function () {
      const liters = Number(this.value);

      if (!Number.isFinite(liters) || liters < 0) {
        return;
      }

      item.dataset.drunk = Math.round(liters * 1000);

      updateWater();
    });


  item.querySelector(".water-reset").addEventListener("click", () => {
  if (!confirm("Reset today's water intake?")) return;

  item.dataset.drunk = 0;
  item.querySelector(".water-amount").value = 0;

  updateWater();
});

  // Prevent input/button interactions from dragging the buddy
  item.querySelectorAll("input, button").forEach(control => {
    control.addEventListener("pointerdown", e => {
      e.stopPropagation();
    });
  });

  addResizeHandles(item);
  updateWater();
  return item;
}

$("addWaterBtn").addEventListener("click", () => {
  createWaterBuddy();
  setMode("move");
});

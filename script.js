/* ============================
    AI Productivity Assistant
    - Added localStorage for persistence
    - Corrected Planner output format (using <strong> instead of **)
    ============================ */

/* ---------- Theme Toggle ---------- */
const themeToggle = document.getElementById("themeToggle");

// Load theme preference on startup
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    // Save theme preference
    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.removeItem("theme");
    }
});

/* ---------- Task Manager Elements ---------- */
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const completedCount = document.getElementById("completedCount");
const pendingCount = document.getElementById("pendingCount");
const prioritySelect = document.getElementById("prioritySelect");
const taskForm = document.getElementById("taskForm");

/* Load tasks from localStorage or initialize empty array */
let tasks = JSON.parse(localStorage.getItem("tasks")) || []; // { id, text, priority, completed }

/* Helper: save tasks to localStorage */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

/* Helper: create unique id */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

/* Update counts */
function updateCounts() {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;
    completedCount.textContent = completed;
    pendingCount.textContent = pending;
}

/* Render tasks */
function renderTasks() {
    taskList.innerHTML = "";

    // Sort: pending first (non-completed), optionally by priority (high first).
    const sorted = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1; // completed at bottom
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    });

    sorted.forEach(task => {
        const li = document.createElement("li");
        li.classList.add(task.priority);
        if (task.completed) li.classList.add("completed");

        // left: text
        const textWrap = document.createElement("div");
        textWrap.className = "task-text";
        textWrap.textContent = task.text;
        li.appendChild(textWrap);

        // right: meta (badge/buttons)
        const meta = document.createElement("div");
        meta.className = "task-meta";

        // priority label (small)
        const badge = document.createElement("span");
        badge.className = "priority-badge";
        badge.textContent = task.priority === "high" ? "🔴" : (task.priority === "medium" ? "🟡" : "🟢");
        badge.title = `Priority: ${task.priority}`;
        meta.appendChild(badge);

        // done toggle
        const doneBtn = document.createElement("button");
        doneBtn.className = "done-btn";
        doneBtn.type = "button";
        doneBtn.textContent = task.completed ? "↺" : "✓";
        doneBtn.title = task.completed ? "Mark as not done" : "Mark as done";
        doneBtn.addEventListener("click", () => toggleTask(task.id));
        meta.appendChild(doneBtn);

        // delete
        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.type = "button";
        delBtn.textContent = "✕";
        delBtn.title = "Delete task";
        delBtn.addEventListener("click", () => deleteTask(task.id));
        meta.appendChild(delBtn);

        li.appendChild(meta);
        taskList.appendChild(li);
    });

    updateCounts();
    saveTasks(); // Save after every render
}

/* Add task */
function addTask(text, priority) {
    tasks.push({ id: uid(), text: text.trim(), priority, completed: false });
    renderTasks();
}

/* Toggle task */
function toggleTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
        tasks[idx].completed = !tasks[idx].completed;
        renderTasks();
    }
}

/* Delete task */
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
}

/* handle form submission / add click */
addTaskBtn.addEventListener("click", () => {
    const text = taskInput.value;
    const priority = prioritySelect.value || "low";
    if (text && text.trim()) {
        addTask(text, priority);
        taskInput.value = "";
        taskInput.focus();
    }
});

/* also allow Enter to add task */
taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTaskBtn.click();
});

/* ---------- Pomodoro Timer ---------- */
let totalTime = 25 * 60; // seconds
let timeLeft = totalTime;
let timer = null;
let isRunning = false;

const timerDisplay = document.getElementById("timerDisplay");
const progressBar = document.querySelector(".progress-ring-bar");
const R = 60; // r in SVG
const circumference = 2 * Math.PI * R;

// setup SVG stroke
if (progressBar) {
    progressBar.style.strokeDasharray = circumference;
    progressBar.style.strokeDashoffset = 0;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    if (progressBar) {
        // Ensure totalTime is not zero before dividing
        const ratio = totalTime > 0 ? (timeLeft / totalTime) : 0;
        const offset = circumference - ratio * circumference;
        progressBar.style.strokeDashoffset = offset;
    }
}

document.getElementById("startBtn").addEventListener("click", () => {
    if (isRunning) return;
    isRunning = true;
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
            timer = null;
            isRunning = false;
            // new Audio('notification.mp3').play(); 
            // alert("Pomodoro session complete!"); // Keep alert for minimal environment
            
            // reset to default after finish
            timeLeft = totalTime;
            updateTimerDisplay();
        }
    }, 1000);
});

document.getElementById("pauseBtn").addEventListener("click", () => {
    if (timer) clearInterval(timer);
    timer = null;
    isRunning = false;
});

document.getElementById("resetBtn").addEventListener("click", () => {
    if (timer) clearInterval(timer);
    timer = null;
    isRunning = false;
    timeLeft = totalTime;
    updateTimerDisplay();
});

updateTimerDisplay(); // Initial timer display

/* ---------- Smart Daily Planner ---------- */
const generatePlanBtn = document.getElementById("generatePlanBtn");
const planOutput = document.getElementById("planOutput");

generatePlanBtn.addEventListener("click", () => {
    const pendingTasks = tasks.filter(t => !t.completed);
    const highPriority = pendingTasks.filter(t => t.priority === 'high').length;
    const mediumPriority = pendingTasks.filter(t => t.priority === 'medium').length;

    planOutput.innerHTML = ""; // Clear previous plan

    if (pendingTasks.length === 0) {
        planOutput.textContent = "🎉 All tasks completed! Enjoy your day.";
    } else {
        let planText = "<h3>Your Daily Plan:</h3><ul>";
        
        // 1. High Priority tasks first (The "Eat the Frog" principle)
        if (highPriority > 0) {
            planText += `<li><strong>Morning Focus (First 1-2 Pomodoros):</strong> Tackle the <strong>${highPriority}</strong> high-priority tasks.</li>`;
        }

        // 2. Medium Priority tasks next
        if (mediumPriority > 0) {
            planText += `<li><strong>Afternoon/Deep Work:</strong> Move on to the <strong>${mediumPriority}</strong> important tasks.</li>`;
        }
        
        // 3. Low Priority tasks (if any remain)
        if (pendingTasks.length > highPriority + mediumPriority) {
            const lowPriority = pendingTasks.length - highPriority - mediumPriority;
             planText += `<li><strong>Wrap Up/Evening:</strong> Handle the <strong>${lowPriority}</strong> less important tasks or save them for tomorrow.</li>`;
        }
        
        planText += "</ul>";
        planOutput.innerHTML = planText; 
    }
});

/* ---------- initial render ---------- */
renderTasks();
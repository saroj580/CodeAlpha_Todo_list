const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDate');
const reminderInput = document.getElementById('reminderMinutes');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.getElementById('clearCompleted');


let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let editingTaskId = null;
let reminderTimeouts = new Map();

addButton.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter')
        addTask();
})

clearCompletedButton.addEventListener('click', clearCompleted);

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        renderTasks();
    })
})

function renderTasks() {
    let filteredTasks = tasks;
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }

    taskList.innerHTML = filteredTasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}">
            ${editingTaskId === task.id ? `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onclick="toggleTask(${task.id})">
                    <input type="text" id="edit-${task.id}" class="edit-input" 
                           value="${task.text}" onkeypress="if(event.key === 'Enter') saveEdit(${task.id})">
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="saveEdit(${task.id})">
                            <i class="fas fa-save"></i>
                        </button>
                        <button class="delete-btn" onclick="cancelEdit()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="date-reminder-group">
                    <input type="datetime-local" id="edit-due-${task.id}" 
                           value="${task.dueDate || ''}" class="edit-input">
                    <input type="number" id="edit-reminder-${task.id}" 
                           value="${task.reminderMinutes || ''}" placeholder="Reminder (mins)" 
                           min="0" class="edit-input">
                </div>
            ` : `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onclick="toggleTask(${task.id})">
                    <span class="task-text">${task.text}</span>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="startEditing(${task.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteTask(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${(task.dueDate || task.reminderMinutes) ? `
                    <div class="task-details">
                        ${task.dueDate ? `
                            <span class="due-date ${isOverdue(task.dueDate, task.completed) ? 'overdue' : ''}">
                                <i class="fas fa-calendar"></i> Due: ${formatDate(task.dueDate)}
                            </span>
                        ` : ''}
                        ${task.reminderMinutes ? `
                            <span class="reminder">
                                <i class="fas fa-bell"></i> ${task.reminderMinutes} mins before
                            </span>
                        ` : ''}
                    </div>
                ` : ''}
            `}
        </li>
    `).join('');
}

function addTask() {
    const taskText = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    const reminderMinutes = parseInt(reminderInput.value) || 0;
    
    if (taskText) {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            dueDate: dueDate || null,
            reminderMinutes: reminderMinutes || 0,
            createdAt: new Date().toString()
        };
        console.log('Adding task:', task); // Debug log
        tasks.push(task);
        saveTasks();
        renderTasks();
        
        if (task.dueDate && task.reminderMinutes) {
            setupReminder(task);
        }
        // Clear inputs
        taskInput.value = '';
        dueDateInput.value = '';
        reminderInput.value = '';
    }
}

function setupReminder(task) {
    if (!task.dueDate || !task.reminderMinutes) return;

    const dueDate = new Date(task.dueDate);
    const reminderTime = new Date(dueDate.getTime() - task.reminderMinutes * 60000);
    const now = new Date();

    if (reminderTime > now) {
        const timeoutId = setTimeout(() => {
            showNotification(task);
        }, reminderTime.getTime() - now.getTime());

        reminderTimeouts.set(task.id, timeoutId);
    }
}

function showNotification(task) {
    if (!("Notification" in window)) {
        alert(`Reminder: ${task.text}`);
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("Task Reminder", {
                body: task.text,
                icon: "https://example.com/icon.png"
            });
        } else {
            alert(`Reminder: ${task.text}`);
        }
    });
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    const timeoutId = reminderTimeouts.get(id);
    if (timeoutId) {
        clearTimeout(timeoutId);
        reminderTimeouts.delete(id);
    }
    saveTasks();
    renderTasks();
}

function startEditing(id) {
    editingTaskId = id;
    renderTasks();
}

function saveEdit(id) {
    const editInput = document.querySelector(`#edit-${id}`);
    const newText = editInput.value.trim();
    const newDueDate = document.querySelector(`#edit-due-${id}`).value;
    const newReminder = parseInt(document.querySelector(`#edit-reminder-${id}`).value) || 0;
    
    if (newText) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                const updatedTask = { 
                    ...task, 
                    text: newText,
                    dueDate: newDueDate,
                    reminderMinutes: newReminder
                };
                
                // Clear existing reminder
                const timeoutId = reminderTimeouts.get(id);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    reminderTimeouts.delete(id);
                }
                
                // Setup new reminder
                setupReminder(updatedTask);
                
                return updatedTask;
            }
            return task;
        });
        saveTasks();
        editingTaskId = null;
        renderTasks();
    }
}

function cancelEdit() {
    editingTaskId = null;
    renderTasks();
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            const newCompleted = !task.completed;
            if (newCompleted) {
                showCompletionNotification(task);
            }
            return { ...task, completed: newCompleted };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function showCompletionNotification(task) {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        return;
    }

    // Request permission if not granted
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                createNotification(task);
            }
        });
    } else {
        createNotification(task);
    }
}

function createNotification(task) {
    const notificationTitle = "Task Completed! 🎉";
    const notificationOptions = {
        body: `Congratulations! You've completed: ${task.text}`,
        icon: "https://cdn-icons-png.flaticon.com/512/4697/4697260.png",
        badge: "https://cdn-icons-png.flaticon.com/512/4697/4697260.png",
        vibrate: [200, 100, 200],
    };

    new Notification(notificationTitle, notificationOptions);
}

// Request notification permission when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

function clearCompleted() {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function isOverdue(dueDate, completed) {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date();
}

renderTasks();
tasks.forEach(task => setupReminder(task));
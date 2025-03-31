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
            test: taskText,
            completed: false,
            dueDate: dueDate || null,
            reminderMinutes: reminderMinutes || 0,
            createdAt: new Date().toString();
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
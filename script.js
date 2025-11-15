// Структура данных для окон
let windows = JSON.parse(localStorage.getItem('taskWindows')) || [];
let currentTheme = localStorage.getItem('appTheme') || 'blue';


// Структура данных для таймеров
let timers = JSON.parse(localStorage.getItem('taskTimers')) || [];
let isTimersMenuOpen = false;

// Инициализация приложения
function init() {
    // Применяем сохраненную тему
    applyTheme(currentTheme);
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Если окон нет, создаем первое
    if (windows.length === 0) {
        createNewWindow();
    } else {
        renderWindows();
    }
    
    // Инициализируем таймеры
    initTimers();
    
    setupServiceWorker();
    
    console.log('App fully initialized');
}

// Настройка всех обработчиков событий
function setupEventListeners() {
    // Обработчики для тем
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.classList[1].replace('-theme', '');
            switchTheme(theme);
        });
    });
    
    // Обработчики для окон
    document.querySelector('.new-window-btn').addEventListener('click', createNewWindow);
    
    // Обработчики для таймеров
    setupTimerEventListeners();
}

// ==================== //
// СИСТЕМА ТЕМ
// ==================== //

// Переключение темы
function switchTheme(themeName) {
    currentTheme = themeName;
    localStorage.setItem('appTheme', themeName);
    applyTheme(themeName);
}

// Применение темы
function applyTheme(themeName) {
    console.log('Applying theme:', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    currentTheme = themeName;
    localStorage.setItem('appTheme', themeName);
    
    // Обновляем активную кнопку темы
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.theme-btn.${themeName}-theme`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ==================== //
// СИСТЕМА ОКОН И ЗАДАЧ
// ==================== //

// Создание нового окна
function createNewWindow() {
    const newWindow = {
        id: Date.now(),
        title: `Список ${windows.length + 1}`,
        tasks: [],
        createdAt: new Date().toISOString()
    };
    
    windows.push(newWindow);
    saveWindows();
    renderWindows();
    
    // Фокус на поле ввода нового окна
    setTimeout(() => {
        const input = document.querySelector(`.window[data-window-id="${newWindow.id}"] .window-input`);
        if (input) input.focus();
    }, 100);
}

// Удаление окна
function deleteWindow(windowId) {
    if (windows.length <= 1) {
        alert('Должен остаться хотя бы один список');
        return;
    }
    
    if (confirm('Удалить этот список со всеми задачами?')) {
        // Находим элемент окна
        const windowElement = document.querySelector(`.window[data-window-id="${windowId}"]`);
        
        // Добавляем класс для анимации
        windowElement.classList.add('removing');
        
        // Удаляем после анимации
        setTimeout(() => {
            windows = windows.filter(win => win.id !== windowId);
            saveWindows();
            renderWindows();
        }, 300);
    }
}

// Переименование окна
function renameWindow(windowId) {
    const newTitle = prompt('Введите новое название списка:');
    if (newTitle && newTitle.trim()) {
        windows = windows.map(win => 
            win.id === windowId ? { ...win, title: newTitle.trim() } : win
        );
        saveWindows();
        renderWindows();
    }
}

// Добавление задачи в конкретное окно
function addTask(windowId) {
    const input = document.querySelector(`.window[data-window-id="${windowId}"] .window-input`);
    const text = input.value.trim();
    
    if (text === '') {
        alert('Пожалуйста, введите текст задачи');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    windows = windows.map(win => {
        if (win.id === windowId) {
            return {
                ...win,
                tasks: [...win.tasks, newTask]
            };
        }
        return win;
    });
    
    saveWindows();
    
    // Очищаем поле ввода
    input.value = '';
    input.focus();
    
    // Обновляем только список задач этого окна
    updateTasksList(windowId);
    updateWindowStats(windowId);
}

// Переключение статуса задачи БЕЗ перерисовки всего окна
function toggleTask(windowId, taskId) {
    // Находим элемент задачи ДО изменения данных
    const taskElement = document.querySelector(`.window-task-item input[onchange*="${taskId}"]`).closest('.window-task-item');
    const taskText = taskElement.querySelector('.window-task-text');
    
    // Обновляем данные
    windows = windows.map(win => {
        if (win.id === windowId) {
            return {
                ...win,
                tasks: win.tasks.map(task => 
                    task.id === taskId ? { ...task, completed: !task.completed } : task
                )
            };
        }
        return win;
    });
    
    saveWindows();
    
    // Обновляем только визуальное состояние этой задачи
    if (taskElement && taskText) {
        if (windows.find(win => win.id === windowId)?.tasks.find(task => task.id === taskId)?.completed) {
            taskElement.classList.add('completed');
            taskText.style.textDecoration = 'line-through';
            taskText.style.color = 'var(--text-muted)';
        } else {
            taskElement.classList.remove('completed');
            taskText.style.textDecoration = 'none';
            taskText.style.color = 'var(--text-color)';
        }
    }
    
    // Обновляем только статистику и прогресс-бар этого окна
    updateWindowStats(windowId);
}

// Удаление задачи
function deleteTask(windowId, taskId) {
    if (confirm('Удалить эту задачу?')) {
        // Находим элемент задачи
        const taskElement = document.querySelector(`.window-task-item input[onchange*="${taskId}"]`).closest('.window-task-item');
        
        // Добавляем класс для анимации
        taskElement.classList.add('removing');
        
        // Удаляем после анимации
        setTimeout(() => {
            windows = windows.map(win => {
                if (win.id === windowId) {
                    return {
                        ...win,
                        tasks: win.tasks.filter(task => task.id !== taskId)
                    };
                }
                return win;
            });
            
            saveWindows();
            
            // После удаления обновляем статистику
            updateWindowStats(windowId);
            
            // Если задач не осталось, показываем placeholder
            const window = windows.find(win => win.id === windowId);
            const tasksList = document.querySelector(`.window[data-window-id="${windowId}"] .window-tasks-list`);
            if (window.tasks.length === 0 && tasksList) {
                tasksList.innerHTML = `
                    <div class="empty-window-state">
                        <p>📝 Задач пока нет</p>
                        <p>Добавьте первую задачу!</p>
                    </div>
                `;
            }
        }, 250);
    }
}

// Сброс всех галочек в окне БЕЗ перерисовки
function resetWindowTasks(windowId) {
    if (confirm('Сбросить все выполненные задачи?')) {
        windows = windows.map(win => {
            if (win.id === windowId) {
                return {
                    ...win,
                    tasks: win.tasks.map(task => ({ ...task, completed: false }))
                };
            }
            return win;
        });
        
        saveWindows();
        
        // Обновляем все задачи в этом окне
        const windowElement = document.querySelector(`.window[data-window-id="${windowId}"]`);
        if (windowElement) {
            const taskItems = windowElement.querySelectorAll('.window-task-item');
            taskItems.forEach(item => {
                item.classList.remove('completed');
                const text = item.querySelector('.window-task-text');
                if (text) {
                    text.style.textDecoration = 'none';
                    text.style.color = 'var(--text-color)';
                }
                const checkbox = item.querySelector('.window-task-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
            
            // Обновляем статистику
            updateWindowStats(windowId);
        }
    }
}

// Отображение всех окон
function renderWindows() {
    const container = document.getElementById('windowsContainer');
    const tabsContainer = document.getElementById('windowsList');
    
    // Очистка контейнеров
    container.innerHTML = '';
    tabsContainer.innerHTML = '';
    
    // Создание вкладок
    windows.forEach(win => {
        const tab = document.createElement('div');
        tab.className = 'window-tab active';
        tab.textContent = win.title;
        tab.onclick = () => scrollToWindow(win.id);
        tabsContainer.appendChild(tab);
    });
    
    // Создание окон
    windows.forEach(win => {
        const completedCount = win.tasks.filter(task => task.completed).length;
        const totalCount = win.tasks.length;
        const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        
        const windowElement = document.createElement('div');
        windowElement.className = 'window';
        windowElement.setAttribute('data-window-id', win.id);
        
        windowElement.innerHTML = `
            <div class="window-header">
                <div class="window-title">${escapeHtml(win.title)}</div>
                <div class="window-controls">
                    <button class="window-btn">✏️</button>
                    <button class="window-btn">🗑️</button>
                </div>
            </div>
            <div class="window-content">
                <div class="window-input-section">
                    <input type="text" class="window-input" placeholder="Введите новую задачу...">
                    <button>Добавить</button>
                </div>
                <div class="window-tasks-list">
                    ${renderWindowTasks(win)}
                </div>
                <div class="window-footer">
                    <button class="window-reset-btn">Сбросить выполненные (${completedCount}/${totalCount})</button>
                    <div class="window-stats">
                        Выполнено: ${completedCount} из ${totalCount}
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(windowElement);
        
        // Настраиваем обработчики для этого окна
        const input = windowElement.querySelector('.window-input');
        const addButton = windowElement.querySelector('.window-input-section button');
        const renameBtn = windowElement.querySelector('.window-controls .window-btn:first-child');
        const deleteBtn = windowElement.querySelector('.window-controls .window-btn:last-child');
        const resetBtn = windowElement.querySelector('.window-reset-btn');
        
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask(win.id);
        });
        
        addButton.addEventListener('click', () => addTask(win.id));
        renameBtn.addEventListener('click', () => renameWindow(win.id));
        deleteBtn.addEventListener('click', () => deleteWindow(win.id));
        resetBtn.addEventListener('click', () => resetWindowTasks(win.id));
    });
}

// Отображение задач конкретного окна
function renderWindowTasks(win) {
    if (win.tasks.length === 0) {
        return `
            <div class="empty-window-state">
                <p>📝 Задач пока нет</p>
                <p>Добавьте первую задачу!</p>
            </div>
        `;
    }
    
    return win.tasks.map(task => `
        <div class="window-task-item ${task.completed ? 'completed' : ''}">
            <input 
                type="checkbox" 
                class="window-task-checkbox" 
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask(${win.id}, ${task.id})"
            >
            <span class="window-task-text">${escapeHtml(task.text)}</span>
            <button class="window-delete-btn" onclick="deleteTask(${win.id}, ${task.id})">✕</button>
        </div>
    `).join('');
}

// Обновляем только список задач конкретного окна
function updateTasksList(windowId) {
    const window = windows.find(win => win.id === windowId);
    if (!window) return;
    
    const tasksList = document.querySelector(`.window[data-window-id="${windowId}"] .window-tasks-list`);
    if (!tasksList) return;
    
    if (window.tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-window-state">
                <p>📝 Задач пока нет</p>
                <p>Добавьте первую задачу!</p>
            </div>
        `;
    } else {
        // Обновляем только если изменилось количество задач
        const currentTaskCount = tasksList.querySelectorAll('.window-task-item').length;
        if (currentTaskCount !== window.tasks.length) {
            tasksList.innerHTML = renderWindowTasks(window);
        }
    }
}

// Обновляем только статистику окна без полной перерисовки
function updateWindowStats(windowId) {
    const window = windows.find(win => win.id === windowId);
    if (!window) return;
    
    const completedCount = window.tasks.filter(task => task.completed).length;
    const totalCount = window.tasks.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    // Находим элементы статистики этого окна
    const windowElement = document.querySelector(`.window[data-window-id="${windowId}"]`);
    if (windowElement) {
        const resetBtn = windowElement.querySelector('.window-reset-btn');
        const stats = windowElement.querySelector('.window-stats');
        const progressFill = windowElement.querySelector('.progress-fill');
        
        if (resetBtn) {
            resetBtn.textContent = `Сбросить выполненные (${completedCount}/${totalCount})`;
        }
        if (stats) {
            stats.textContent = `Выполнено: ${completedCount} из ${totalCount}`;
        }
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
    }
}

// Прокрутка к окну
function scrollToWindow(windowId) {
    const element = document.querySelector(`.window[data-window-id="${windowId}"]`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Сохранение в localStorage
function saveWindows() {
    localStorage.setItem('taskWindows', JSON.stringify(windows));
}

// ==================== //
// СИСТЕМА ТАЙМЕРОВ
// ==================== //

// Настройка обработчиков для таймеров
function setupTimerEventListeners() {
    // Обработчик для кнопки переключения меню
    const toggleBtn = document.querySelector('.timers-toggle-btn');
    toggleBtn.addEventListener('click', toggleTimersMenu);
    
    // Обработчик для кнопки добавления таймера
    const addTimerBtn = document.querySelector('.add-timer-btn');
    addTimerBtn.addEventListener('click', createNewTimer);
    
    // Обработчики для контейнера таймеров
    const timersContainer = document.getElementById('timersContainer');
    timersContainer.addEventListener('click', handleTimerClick);
    timersContainer.addEventListener('input', handleTimerInput);
    timersContainer.addEventListener('change', handleTimerChange);
}

// Переключение видимости меню таймеров
function toggleTimersMenu() {
    console.log('Toggle timers menu');
    const container = document.getElementById('timersContainer');
    isTimersMenuOpen = !isTimersMenuOpen;
    container.classList.toggle('show', isTimersMenuOpen);
}

// Создание нового таймера
function createNewTimer() {
    console.log('Creating new timer');
    const newTimer = {
        id: Date.now(),
        title: 'Новый таймер',
        hours: 0,
        minutes: 5,
        seconds: 0,
        initialTime: 5 * 60,
        remainingTime: 5 * 60,
        isRunning: false,
        isPaused: false,
        intervalId: null
    };
    
    timers.push(newTimer);
    saveTimers();
    renderTimers();
    
    // Показываем меню таймеров при создании нового
    if (!isTimersMenuOpen) {
        toggleTimersMenu();
    }
}

// Обработчик кликов по кнопкам таймеров
function handleTimerClick(event) {
    const target = event.target;
    console.log('Timer click:', target);
    
    // Находим ближайшую кнопку
    const button = target.closest('.timer-btn');
    if (!button) return;
    
    // Находим родительский элемент таймера
    const timerItem = target.closest('.timer-item');
    if (!timerItem) return;
    
    const timerId = parseInt(timerItem.dataset.timerId);
    console.log('Timer ID:', timerId);
    
    // Определяем какая кнопка была нажата по содержимому
    if (button.innerHTML.includes('▶️')) {
        console.log('Start button clicked');
        startTimer(timerId);
    } else if (button.innerHTML.includes('⏸️')) {
        console.log('Pause button clicked');
        pauseTimer(timerId);
    } else if (button.innerHTML.includes('🔄')) {
        console.log('Reset button clicked');
        resetTimer(timerId);
    } else if (button.innerHTML.includes('🗑️')) {
        console.log('Delete button clicked');
        deleteTimer(timerId);
    }
}

// Обработчик ввода в поля времени
function handleTimerInput(event) {
    const target = event.target;
    if (!target.classList.contains('timer-input')) return;
    
    const timerItem = target.closest('.timer-item');
    if (!timerItem) return;
    
    const timerId = parseInt(timerItem.dataset.timerId);
    const field = target.placeholder;
    
    let fieldName;
    if (field === 'ч') fieldName = 'hours';
    else if (field === 'м') fieldName = 'minutes';
    else if (field === 'с') fieldName = 'seconds';
    else return;
    
    updateTimerTime(timerId, fieldName, target.value);
}

// Обработчик изменения названия таймера
function handleTimerChange(event) {
    const target = event.target;
    if (!target.classList.contains('timer-title')) return;
    
    const timerItem = target.closest('.timer-item');
    if (!timerItem) return;
    
    const timerId = parseInt(timerItem.dataset.timerId);
    updateTimerTitle(timerId, target.value);
}

// Обновление времени таймера
function updateTimerTime(timerId, field, value) {
    const timer = timers.find(t => t.id === timerId);
    if (!timer || timer.isRunning) return;
    
    let numValue = parseInt(value) || 0;
    
    // Ограничиваем значения
    if (field === 'hours') {
        numValue = Math.max(0, Math.min(99, numValue));
    } else if (field === 'minutes') {
        numValue = Math.max(0, Math.min(59, numValue));
    } else if (field === 'seconds') {
        numValue = Math.max(0, Math.min(59, numValue));
    }
    
    // Обновляем значение
    if (field === 'hours') {
        timer.hours = numValue;
    } else if (field === 'minutes') {
        timer.minutes = numValue;
    } else if (field === 'seconds') {
        timer.seconds = numValue;
    }
    
    // Пересчитываем общее время в секундах
    timer.initialTime = timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
    timer.remainingTime = timer.initialTime;
    
    saveTimers();
    renderTimers();
}

// Обновление названия таймера
function updateTimerTitle(timerId, newTitle) {
    const timer = timers.find(t => t.id === timerId);
    if (timer) {
        timer.title = newTitle || 'Новый таймер';
        saveTimers();
        renderTimers();
    }
}

// Запуск таймера
function startTimer(timerId) {
    console.log('Starting timer:', timerId);
    const timer = timers.find(t => t.id === timerId);
    if (!timer || timer.isRunning || timer.remainingTime <= 0) {
        console.log('Cannot start timer');
        return;
    }
    
    timer.isRunning = true;
    timer.isPaused = false;
    
    timer.intervalId = setInterval(() => {
        timer.remainingTime--;
        
        if (timer.remainingTime <= 0) {
            finishTimer(timerId);
        } else {
            updateTimerDisplay(timerId);
            saveTimers();
        }
    }, 1000);
    
    saveTimers();
    renderTimers();
}

// Пауза таймера
function pauseTimer(timerId) {
    console.log('Pausing timer:', timerId);
    const timer = timers.find(t => t.id === timerId);
    if (!timer || !timer.isRunning) return;
    
    timer.isRunning = false;
    timer.isPaused = true;
    
    if (timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
    
    saveTimers();
    renderTimers();
}

// Сброс таймера
function resetTimer(timerId) {
    console.log('Resetting timer:', timerId);
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    timer.isRunning = false;
    timer.isPaused = false;
    timer.remainingTime = timer.initialTime;
    
    if (timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
    
    saveTimers();
    renderTimers();
}

// Удаление таймера
function deleteTimer(timerId) {
    console.log('Deleting timer:', timerId);
    if (!confirm('Удалить этот таймер?')) return;
    
    const timer = timers.find(t => t.id === timerId);
    if (timer && timer.intervalId) {
        clearInterval(timer.intervalId);
    }
    
    timers = timers.filter(t => t.id !== timerId);
    saveTimers();
    renderTimers();
}

// Завершение таймера
function finishTimer(timerId) {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    timer.isRunning = false;
    timer.isPaused = false;
    timer.remainingTime = 0;
    clearInterval(timer.intervalId);
    
    // Браузерное уведомление
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Таймер завершен!", {
            body: `Таймер "${timer.title}" завершил работу`
        });
    }
    
    // Звуковое уведомление
    beep();
    
    saveTimers();
    renderTimers();
    
    // Автоматически скрыть уведомление через 5 секунд
    setTimeout(() => {
        const timerElement = document.querySelector(`.timer-item[data-timer-id="${timerId}"]`);
        if (timerElement) {
            timerElement.classList.remove('finished');
        }
    }, 5000);
}

// Простой звуковой сигнал
function beep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log("Audio not supported");
    }
}

// Обновление отображения таймера
function updateTimerDisplay(timerId) {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    const display = document.querySelector(`.timer-item[data-timer-id="${timerId}"] .timer-display`);
    const progressFill = document.querySelector(`.timer-item[data-timer-id="${timerId}"] .timer-progress-fill`);
    
    if (display) {
        const hours = Math.floor(timer.remainingTime / 3600);
        const minutes = Math.floor((timer.remainingTime % 3600) / 60);
        const seconds = timer.remainingTime % 60;
        
        display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (progressFill && timer.initialTime > 0) {
        const progress = ((timer.initialTime - timer.remainingTime) / timer.initialTime) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

// Отображение всех таймеров
function renderTimers() {
    const container = document.getElementById('timersContainer');
    
    if (timers.length === 0) {
        container.innerHTML = '<div class="timer-item"><p style="text-align: center; color: var(--text-muted); margin: 0;">Таймеров пока нет</p></div>';
        return;
    }
    
    container.innerHTML = timers.map(timer => {
        const totalSeconds = timer.remainingTime;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const progress = timer.initialTime > 0 ? ((timer.initialTime - timer.remainingTime) / timer.initialTime) * 100 : 0;
        
        let timerClass = 'timer-item';
        if (timer.isRunning) timerClass += ' running';
        if (timer.isPaused) timerClass += ' paused';
        if (timer.remainingTime === 0 && !timer.isRunning) timerClass += ' finished';
        
        const isDisabled = timer.remainingTime === 0 || timer.isRunning;
        
        return `
            <div class="${timerClass}" data-timer-id="${timer.id}">
                <div class="timer-header">
                    <input type="text" class="timer-title" value="${escapeHtml(timer.title)}" 
                           placeholder="Название таймера"
                           ${timer.isRunning ? 'readonly' : ''}>
                    <div class="timer-controls">
                        <button class="timer-btn" ${isDisabled && !timer.isRunning ? 'disabled' : ''}>
                            ${timer.isRunning ? '⏸️' : '▶️'}
                        </button>
                        <button class="timer-btn">🔄</button>
                        <button class="timer-btn delete">🗑️</button>
                    </div>
                </div>
                <div class="timer-display">
                    ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
                </div>
                <div class="timer-inputs">
                    <input type="number" class="timer-input" min="0" max="99" value="${timer.hours}" 
                           ${timer.isRunning ? 'readonly' : ''} 
                           placeholder="ч" title="Часы">
                    <input type="number" class="timer-input" min="0" max="59" value="${timer.minutes}" 
                           ${timer.isRunning ? 'readonly' : ''} 
                           placeholder="м" title="Минуты">
                    <input type="number" class="timer-input" min="0" max="59" value="${timer.seconds}" 
                           ${timer.isRunning ? 'readonly' : ''} 
                           placeholder="с" title="Секунды">
                </div>
                <div class="timer-progress">
                    <div class="timer-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');
}



// Сохранение таймеров в localStorage
function saveTimers() {
    localStorage.setItem('taskTimers', JSON.stringify(timers));
}

// Запрос разрешения на уведомления
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

// Инициализация таймеров при загрузке
function initTimers() {
    console.log('Initializing timers...');
    renderTimers();
    setupTimerEventListeners();
    requestNotificationPermission();
    
    // Восстанавливаем работающие таймеры
    timers.forEach(timer => {
        if (timer.isRunning && timer.remainingTime > 0) {
            console.log('Restarting running timer:', timer.id);
            startTimer(timer.id);
        } else if (timer.isRunning) {
            timer.isRunning = false;
            timer.isPaused = false;
            saveTimers();
        }
    });
}

// ==================== //
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==================== //

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Настройка Service Worker для PWA
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);

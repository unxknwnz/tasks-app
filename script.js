// Структура данных для окон
let windows = JSON.parse(localStorage.getItem('taskWindows')) || [];
let currentTheme = localStorage.getItem('appTheme') || 'blue';

// Инициализация приложения
function init() {
    // Применяем сохраненную тему
    applyTheme(currentTheme);
    
    // Если окон нет, создаем первое
    if (windows.length === 0) {
        createNewWindow();
    } else {
        renderWindows();
    }
    setupServiceWorker();
}

// Переключение темы
function switchTheme(themeName) {
    currentTheme = themeName;
    localStorage.setItem('appTheme', themeName);
    applyTheme(themeName);
}

// Применение темы с анимацией
function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Обновляем активную кнопку темы с анимацией
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = 'scale(1)';
    });
    
    const activeBtn = document.querySelector(`.theme-btn.${themeName}-theme`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
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
        windows = windows.filter(win => win.id !== windowId);
        saveWindows();
        renderWindows();
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

// Удаление задачи с анимацией но без полной перерисовки
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
                    <button class="window-btn" onclick="renameWindow(${win.id})">✏️</button>
                    <button class="window-btn" onclick="deleteWindow(${win.id})">🗑️</button>
                </div>
            </div>
            <div class="window-content">
                <div class="window-input-section">
                    <input type="text" class="window-input" placeholder="Введите новую задачу..." 
                           onkeypress="if(event.key==='Enter') addTask(${win.id})">
                    <button onclick="addTask(${win.id})">Добавить</button>
                </div>
                <div class="window-tasks-list">
                    ${renderWindowTasks(win)}
                </div>
                <div class="window-footer">
                    <button onclick="resetWindowTasks(${win.id})" class="window-reset-btn">
                        Сбросить выполненные (${completedCount}/${totalCount})
                    </button>
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

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработка нажатия Enter в полях ввода
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('window-input')) {
        const windowId = e.target.closest('.window').dataset.windowId;
        addTask(parseInt(windowId));
    }
});

// Удаление задачи с анимацией
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
            renderWindows();
        }, 250); // Время должно совпадать с длительностью анимации
    }
}

// Удаление окна с анимацией
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);

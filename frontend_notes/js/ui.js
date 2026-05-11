function toggleTheme() {
    preferences.theme =
        preferences.theme === 'dark'
            ? 'light'
            : 'dark';
    savePreferences();
    applyTheme(preferences.theme);
}
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeButton();
}
function updateThemeButton() {
    const btn =
        document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.textContent =
        preferences.theme === 'dark'
            ? '☀️ Light Mode'
            : '🌙 Dark Mode';
}
function toggleView(type, savePref = true) {
    const container =
        document.getElementById('notes-container');
    if (type === 'grid') {
        container.classList.add('grid-view');
        document
            .getElementById('btn-grid')
            .classList.add('active');
        document
            .getElementById('btn-list')
            .classList.remove('active');
    } else {
        container.classList.remove('grid-view');
        document
            .getElementById('btn-list')
            .classList.add('active');
        document
            .getElementById('btn-grid')
            .classList.remove('active');
    }
    if (savePref) {
        preferences.view = type;
        savePreferences();
    }
}
function handleAutoSaveIntervalChange() {
    const value = Number(
        document.getElementById(
            'autosave-interval'
        ).value
    );
    if (!value) return;
    preferences.autoSaveInterval = value;
    savePreferences();
    updateAutoSaveUI();
}
function savePreferences() {
    localStorage.setItem(
        preferencesKey,
        JSON.stringify(preferences)
    );
    localStorage.setItem(
        'theme',
        preferences.theme
    );
}
function loadPreferences() {
    const saved =
        localStorage.getItem(
            preferencesKey
        );
    const globalTheme =
        localStorage.getItem(
            'theme'
        );
    if (globalTheme) {
        preferences.theme =
            globalTheme;
    }
    if (!saved) return;
    try {
        const parsed =
            JSON.parse(saved);
        preferences = {
            ...preferences,
            ...parsed,
            // Ưu tiên theme global
            theme:
                globalTheme ||
                parsed.theme ||
                'light'
        };
    } catch (error) {
        console.error(
            'loadPreferences error:',
            error
        );
    }
}
function updateAutoSaveUI() {

    const toggle =
        document.getElementById(
            'autosave-toggle'
        );
    const interval =
        document.getElementById(
            'autosave-interval'
        );
    const status =
        document.getElementById(
            'auto-save-status'
        );
    if (toggle) {
        toggle.checked =
            preferences.autoSaveEnabled;
    }
    if (interval) {
        interval.value =
            preferences.autoSaveInterval;
    }
    if (status) {
        status.innerText =
            preferences.autoSaveEnabled
                ? `Tự động lưu: Bật (${preferences.autoSaveInterval / 1000}s)`
                : 'Tự động lưu: Tắt';
    }
    const saveButton = document.getElementById('save-now-button');
    if (saveButton) {
        saveButton.style.display = preferences.autoSaveEnabled ? 'none' : 'inline-flex';
    }
}
function handleAutoSaveToggle() {
    preferences.autoSaveEnabled =
        document.getElementById(
            'autosave-toggle'
        ).checked;
    savePreferences();
    updateAutoSaveUI();
}
function applyViewPreference() {
    // Mobile luôn dùng list
    if (window.innerWidth <= 768) {
        toggleView('list', false);
        return;
    }
    // Desktop dùng preference đã lưu
    toggleView(
        preferences.view || 'list',
        false
    );
}
function updateOnlineStatus() {
    const el =
        document.getElementById(
            'offline-status'
        );
    if (!el) return;
    if (navigator.onLine) {
        el.innerText = 'Trực tuyến';
        el.style.color = 'green';
    } else {
        el.innerText = 'Ngoại tuyến';
        el.style.color = 'red';
    }
}
function showSaveStatus(message) {
    const el =
        document.getElementById(
            'save-status'
        );
    if (!el) return;
    el.innerText = message;
    setTimeout(() => {
        el.innerText = '';
    }, 4000);
}
window.addEventListener('resize', () => {
    applyViewPreference();
});
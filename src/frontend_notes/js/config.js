const token = localStorage.getItem('token');
const displayName = localStorage.getItem('displayName');
const apiHost = window.location.origin;

if (!token) {
    window.location.href = 'index.html';
}

let globalNotes = [];
let globalLabels = [];
let currentLabelFilterId = null;

let editingNoteId = null;
let editingNoteExistingImages = [];
let deletedImageUrls = [];

let unlockingNoteId = null;
let sharingNoteId = null;

let unlockedPasswords = {};

let saveTimeout;
let ws = null;
let wsReconnectTimeout = null;

const saveStatus =
    document.getElementById('save-status');

const preferencesKey =
    'noteAppPreferences';

const draftKey =
    'noteAppDraft';

let preferences = {
    theme:
        localStorage.getItem('theme')
        || 'light',
    view: 'list',
    autoSaveEnabled: true,
    autoSaveInterval: 1000
};

if (displayName) {
    document.getElementById('user-welcome')
        .innerText = `Chào mừng, ${displayName}!`;
}
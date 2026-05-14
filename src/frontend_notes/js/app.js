let selectedAvatarColor = 'blue';
async function saveDraft() {
    const title = document.getElementById('note-title')?.value || '';
    const content = document.getElementById('note-content')?.value || '';
    const labelIds = getSelectedLabelIds();
    const draft = { title, content, labelIds };
    localStorage.setItem(draftKey, JSON.stringify(draft));

    if (typeof autoSaveNote === 'function') {
        try {
            await autoSaveNote({ silent: true });
        } catch (error) {
            console.error('autoSaveNote error:', error);
            showSaveStatus('Tự động lưu tạm thời thất bại.');
        }
    } else {
        showSaveStatus('Đã lưu nháp');
    }
}
function loadDraft() {
    try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) return;
        const draft = JSON.parse(saved);
        document.getElementById('note-title').value =
            draft.title || '';
        document.getElementById('note-content').value =
            draft.content || '';
        renderLabelCheckboxes(
            draft.labelIds || []
        );
        // THÊM DÒNG NÀY
        showSaveStatus(
            '📝 Đã khôi phục ghi chú đang chỉnh sửa'
        );
    } catch (error) {
        console.error(
            'loadDraft error:',
            error
        );
    }
}
function clearDraft() {
    localStorage.removeItem(draftKey);
}
function initAutoSave() {
    // Sử dụng event delegation để đảm bảo hoạt động sau khi DOM render
    const handler = () => {
        if (!preferences.autoSaveEnabled) {
            return;
        }
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await saveDraft();
        }, preferences.autoSaveInterval);
    };

    document.addEventListener('input', (e) => {
        if (e.target.id === 'note-title' || e.target.id === 'note-content' || e.target.name === 'label_ids') {
            handler();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.id === 'note-images' || e.target.name === 'label_ids') {
            handler();
        }
    });
}

// Service worker registration is currently disabled to avoid runtime warning noise.
async function registerServiceWorker() {
    return;
}

async function logoutToLogin() {
    const currentTheme = preferences.theme;
    localStorage.removeItem('token');
    localStorage.removeItem('displayName');
    localStorage.removeItem(draftKey);
    localStorage.setItem('theme', currentTheme);
    window.location.href = 'index.html';
}

function handleApiAuthFailure(response) {
    if (response.status === 401 || response.status === 403) {
        logoutToLogin();
        return true;
    }
    return false;
}

function logout() {
    logoutToLogin();
}

async function fetchUserInfo() {
    const alertBox = document.getElementById('unverified-alert');
    try {
        const response = await fetch(`${apiHost}/api/auth/me`, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            if (handleApiAuthFailure(response)) return;
            if (alertBox) {
                alertBox.classList.remove('hidden');
            }
            return;
        }
        const data = await response.json();
        if (alertBox) {
            if (data.emailVerified) {
                alertBox.classList.add('hidden');
            } else {
                alertBox.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('fetchUserInfo error:', error);
        if (alertBox) {
            alertBox.classList.remove('hidden');
        }
    }
}

function logout() {
    const currentTheme =
        preferences.theme;
    localStorage.removeItem('token');
    localStorage.removeItem(
        'displayName'
    );
    // Giữ nguyên theme
    localStorage.setItem(
        'theme',
        currentTheme
    );
    window.location.href =
        'index.html';
}

async function loadProfile() {
    try {
        const response = await fetch(
            `${apiHost}/api/auth/profile`,
            {
                headers: {
                    Authorization:
                        'Bearer ' + token
                }
            }
        );
        if (!response.ok) {
            if (handleApiAuthFailure(response)) return;
            return;
        }
        const data = await response.json();
        const displayName =
            data.displayName || 'User';
        const avatarColor =
            data.avatarColor || 'blue';
        selectedAvatarColor =
            avatarColor;
        document.getElementById(
            'profile-name'
        ).textContent = displayName;
        const avatar =
            document.getElementById(
                'profile-avatar'
            );
        avatar.textContent =
            displayName.charAt(0).toUpperCase();
        avatar.className =
            `profile-avatar ${avatarColor}`;
    } catch (error) {
        console.error(
            'loadProfile error:',
            error
        );
    }
}
function openProfileModal() {
    document.getElementById(
        'profile-modal'
    ).classList.add('show');
    const currentName =
        document.getElementById(
            'profile-name'
        ).textContent;
    document.getElementById(
        'profile-display-name'
    ).value = currentName;
    const preview =
        document.getElementById(
            'profile-avatar-preview'
        );
    preview.textContent =
        currentName.charAt(0).toUpperCase();
    preview.className =
        `profile-avatar large ${selectedAvatarColor}`;
}
function closeProfileModal() {
    document.getElementById(
        'profile-modal'
    ).classList.remove('show');
}
function selectAvatarColor(color) {
    selectedAvatarColor = color;
    const preview =
        document.getElementById(
            'profile-avatar-preview'
        );
    preview.className =
        `profile-avatar large ${color}`;
}
async function saveProfile() {
    try {
        const displayName =
            document.getElementById(
                'profile-display-name'
            ).value.trim();
        const response = await fetch(
            `${apiHost}/api/auth/profile`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type':
                        'application/json',
                    Authorization:
                        'Bearer ' + token
                },
                body: JSON.stringify({
                    displayName,
                    avatarColor:
                        selectedAvatarColor
                })
            }
        );
        const data =
            await response.json();
        if (!response.ok) {
            alert(
                data.message ||
                'Cập nhật thất bại'
            );
            return;
        }
        closeProfileModal();
        await loadProfile();
        Toastify({
            text:
                'Cập nhật hồ sơ thành công',
            duration: 3000,
            gravity: 'top',
            position: 'right',
            backgroundColor: '#22c55e'
        }).showToast();
    } catch (error) {
        console.error(
            'saveProfile error:',
            error
        );
    }
}

window.addEventListener('load', async () => {
    loadPreferences();
    applyTheme(preferences.theme);
    updateAutoSaveUI();
    applyViewPreference();
    updateOnlineStatus();
    await fetchUserInfo();
    await loadProfile();
    await fetchLabels();
    await fetchNotes();
    loadDraft();
    initAutoSave();
    setupWebSocket();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('beforeunload', () => {
        saveDraft();
    });
});
function openChangePasswordModal() {
    const modal =
        document.getElementById(
            'changePasswordModal'
        );
    modal.classList.remove(
        'hidden'
    );
    modal.classList.add(
        'show'
    );
}
function closeChangePasswordModal() {
    const modal =
        document.getElementById(
            'changePasswordModal'
        );
    modal.classList.remove(
        'show'
    );
    modal.classList.add(
        'hidden'
    );
}
async function changePassword() {
    const oldPassword =
        document.getElementById('oldPassword').value;
    const newPassword =
        document.getElementById('newPassword').value;
    const confirmPassword =
        document.getElementById('confirmPassword').value;
    if (!oldPassword || !newPassword || !confirmPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Thiếu thông tin',
            text: 'Vui lòng nhập đầy đủ thông tin!',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Mật khẩu không khớp',
            text: 'Xác nhận mật khẩu mới chưa đúng!',
            confirmButtonColor: '#ef4444'
        });
        return;
    }
    try {
        const response = await fetch(
            `${apiHost}/api/auth/change-password`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword,
                    confirmPassword
                })
            }
        );
        const data = await response.json();
        if (!response.ok) {
            Swal.fire({
                icon: 'error',
                title: 'Đổi mật khẩu thất bại',
                text: data.message || 'Có lỗi xảy ra!',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: 'Đổi mật khẩu thành công!',
            confirmButtonColor: '#2563eb'
        });
        closeChangePasswordModal();
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi server',
            text: 'Không thể kết nối server!',
            confirmButtonColor: '#ef4444'
        });
    }
}

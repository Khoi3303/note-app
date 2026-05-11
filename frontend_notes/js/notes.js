let lastAutoSavedFileSignature = null;

function showLoadingNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;
    container.innerHTML = renderSkeletonCards(6);
}

function getFilesSignature(files) {
    return Array.from(files)
        .map(file => `${file.name}:${file.size}:${file.lastModified}`)
        .join('|');
}

async function autoSaveNote({ silent = false } = {}) {
    const title = document.getElementById('note-title')?.value.trim();
    const content = document.getElementById('note-content')?.value.trim();
    const imagesInput = document.getElementById('note-images');
    const labelIds = getSelectedLabelIds();

    if (!title && !content) {
        if (!silent) {
            showToast('Vui lòng nhập tiêu đề hoặc nội dung.', 'warning');
        }
        return false;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('label_ids', JSON.stringify(labelIds));

    if (imagesInput && imagesInput.files.length > 0) {
        const signature = getFilesSignature(imagesInput.files);
        if (signature !== lastAutoSavedFileSignature) {
            Array.from(imagesInput.files).forEach(file => {
                formData.append('images', file);
            });
            lastAutoSavedFileSignature = signature;
        }
    }

    try {
        const endpoint = editingNoteId ? `${apiHost}/api/notes/${editingNoteId}` : `${apiHost}/api/notes`;
        const method = editingNoteId ? 'PUT' : 'POST';
        const response = await fetch(endpoint, {
            method,
            headers: {
                Authorization: 'Bearer ' + token
            },
            body: formData
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (!silent) {
                showToast(result?.message || 'Lưu tự động thất bại.', 'error');
            }
            return false;
        }

        if (!editingNoteId) {
            editingNoteId = result?.note?.id || result?.id || editingNoteId;
        }
        clearDraft();

        if (!silent) {
            showToast(editingNoteId ? 'Đã lưu ghi chú.' : 'Đã lưu ghi chú.', 'success');
        }
        showSaveStatus('Đã tự động lưu ghi chú.');
        await fetchNotes();
        return true;
    } catch (error) {
        console.error('autoSaveNote error:', error);
        if (!silent) {
            showToast('Lưu tự động thất bại.', 'error');
        }
        return false;
    }
}

function renderSkeletonCards(count = 5) {
    return Array.from({ length: count }).map(() => `
        <article class="note-card skeleton-card">
            <div class="note-card-header">
                <div class="note-title-stack">
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="skeleton-line skeleton-meta"></div>
                </div>
                <div class="note-card-actions">
                    <div class="skeleton-chip"></div>
                </div>
            </div>
            <div class="skeleton-line skeleton-text short"></div>
            <div class="skeleton-line skeleton-text"></div>
            <div class="skeleton-line skeleton-text long"></div>
            <div class="note-images-preview">
                <div class="skeleton-image"></div>
                <div class="skeleton-image"></div>
            </div>
        </article>
    `).join('');
}

function onSearchInput() {
    if (!globalNotes) return;
    renderNotes(globalNotes);
}

function showEmptyState(message = 'Không có ghi chú nào.') {
    const container = document.getElementById('notes-container');
    if (!container) return;
    container.innerHTML = `<div class="notes-empty">${message}</div>`;
}

function renderNotes(notes) {
    const container = document.getElementById('notes-container');
    if (!container) return;
    const searchText = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    const filtered = [...notes]
    .filter(note => {

        const titleMatch =
            note.title &&
            note.title
                .toLowerCase()
                .includes(searchText);

        const contentMatch =
            note.content &&
            note.content
                .toLowerCase()
                .includes(searchText);

        const labelMatch =
            note.labels &&
            note.labels.some(label =>
                label.name
                    .toLowerCase()
                    .includes(searchText)
            );

        const activeLabel =
            currentLabelFilterId
                ? note.labels.some(
                    label =>
                        label.id ===
                        currentLabelFilterId
                )
                : true;

        return (
            activeLabel &&
            (
                titleMatch ||
                contentMatch ||
                labelMatch ||
                searchText === ''
            )
        );
    })

    .sort((a, b) => {

        const aPinned =
            a.is_pinned === true ||
            a.is_pinned === 1 ||
            a.is_pinned === '1';

        const bPinned =
            b.is_pinned === true ||
            b.is_pinned === 1 ||
            b.is_pinned === '1';

        if (aPinned && !bPinned) {
            return -1;
        }

        if (!aPinned && bPinned) {
            return 1;
        }

        return new Date(
            b.updated_at ||
            b.created_at
        ) - new Date(
            a.updated_at ||
            a.created_at
        );
    });
    if (!filtered.length) {
        showEmptyState(searchText ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có ghi chú nào.');
        return;
    }
    container.innerHTML = filtered.map(note => renderNoteCard(note)).join('');
}

function renderNoteCard(note) {
    const isLocked = note.note_password && note.note_password !== '';
    const isPinned = note.is_pinned === true || note.is_pinned === 1 || note.is_pinned === '1';
    const canEdit = note.access_level === 'owner' || note.access_level === 'edit';
    const canDelete = note.access_level === 'owner';
    const canPin = note.access_level === 'owner';
    const canLock = note.access_level === 'owner';
    const canShare = note.access_level === 'owner' && !note.shared_by_name;
    const canRemoveShared = note.access_level !== 'owner' && note.shared_by_name;

    const titleLabels = note.labels && note.labels.length > 0
        ? `<div class="note-labels note-labels-inline">${note.labels.map(label => `<button type="button" class="note-label note-label-button ${currentLabelFilterId === label.id ? 'active' : ''}" onclick="event.stopPropagation(); filterByLabel(${label.id})">${label.name}</button>`).join('')}</div>`
        : '';

    const imageHtml = note.images && note.images.length > 0
        ? `<div class="note-images-preview">${note.images.map(url => `<img src="${url}" alt="Ảnh ghi chú" class="note-preview-image" />`).join('')}</div>`
        : '';

    const noteMeta = note.access_level !== 'owner'
        ? `Được chia sẻ bởi ${note.shared_by_name || 'người khác'} • ${formatDate(note.updated_at || note.created_at)}`
        : `${note.last_edited_by ? `Cập nhật bởi ${note.last_edited_by}` : 'Tạo bởi bạn'} • ${formatDate(note.updated_at || note.created_at)}`;

    return `
        <article class="note-card ${isPinned ? 'pinned-note' : ''} ${isLocked && note.access_level !== 'owner' ? 'note-locked' : ''}" data-note-id="${note.id}" onclick="openNoteModal(${note.id})">
            <div class="note-card-header">
                <div class="note-title-stack">
                    <div class="note-title-row">
                        <h3>${note.title || 'Ghi chú không có tiêu đề'}</h3>
                        ${isPinned ? `
                            <span class="note-status-icon pinned-icon">
                                📌
                            </span>
                        ` : ''}
                        ${isLocked ? `
                            <span class="note-status-icon locked-icon">
                                🔒
                            </span>
                        ` : ''}
                        ${titleLabels}
                    </div>
                    <div class="note-card-meta">${noteMeta}</div>
                </div>
                <div class="note-card-actions">
                    ${canPin ? `
                        <button class="btn-pin" type="button" onclick="event.stopPropagation(); togglePin(${note.id})">
                            <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Bỏ ghim' : 'Ghim'}
                        </button>
                    ` : ''}
                    ${canLock ? `
                        <button class="btn-lock" type="button" onclick="event.stopPropagation(); toggleLock(${note.id}, ${isLocked})">
                            <i class="fa-solid ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${isLocked ? 'Mở khóa' : 'Khóa'}
                        </button>
                    ` : ''}
                    ${canShare ? `
                        <button class="btn-share" type="button" onclick="openShareDialog(event, ${note.id})">
                            <i class="fa-solid fa-share-from-square"></i> Chia sẻ
                        </button>
                    ` : ''}
                    ${canRemoveShared ? `
                        <button class="btn-remove" type="button" onclick="removeSharedNote(event, ${note.id})">
                            <i class="fa-solid fa-eye-slash"></i> Bỏ xem
                        </button>
                    ` : ''}
                    ${canEdit ? `
                        <button class="btn-edit" type="button" onclick="editNote(event, ${note.id})">
                            <i class="fa-solid fa-pen"></i> Sửa
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-delete" type="button" onclick="event.stopPropagation(); deleteNote(${note.id})">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="note-content">${isLocked && note.access_level !== 'owner' ? '[Đã khóa]' : note.content || '<i>Không có nội dung</i>'}</div>
            ${imageHtml}
        </article>
    `;
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function fetchNotes() {
    showLoadingNotes();
    try {
        const response = await fetch(`${apiHost}/api/notes`, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            if (typeof handleApiAuthFailure === 'function' && handleApiAuthFailure(response)) return;
            throw new Error('Không thể tải ghi chú.');
        }
        globalNotes = await response.json();
        renderNotes(globalNotes);
    } catch (error) {
        console.error('fetchNotes error:', error);
        showToast('Không thể tải ghi chú. Vui lòng thử lại.', 'error');
        showEmptyState('Lỗi khi tải dữ liệu.');
    }
}

function onNoteInput() {
    // legacy hook; autosave được xử lý qua event delegation trong app.js
}

function resetForm() {
    editingNoteId = null;
    editingNoteExistingImages = [];
    deletedImageUrls = [];
    document.getElementById('form-title').innerText = 'Đang tạo Ghi chú mới';
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('note-images').value = '';
    document.getElementById('existing-images').innerHTML = '';
    renderLabelCheckboxes([]);
    showSaveStatus('');
}

async function saveNoteNow() {
    const title = document.getElementById('note-title')?.value.trim();
    const content = document.getElementById('note-content')?.value.trim();
    const imagesInput = document.getElementById('note-images');
    const labelIds = getSelectedLabelIds();

    if (!title && !content) {
        showToast('Vui lòng nhập tiêu đề hoặc nội dung.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('label_ids', JSON.stringify(labelIds));

    if (imagesInput && imagesInput.files.length > 0) {
        const signature = getFilesSignature(imagesInput.files);
        if (signature !== lastAutoSavedFileSignature) {
            Array.from(imagesInput.files).forEach(file => {
                formData.append('images', file);
            });
            lastAutoSavedFileSignature = signature;
        }
    }

    try {
        const endpoint = editingNoteId ? `${apiHost}/api/notes/${editingNoteId}` : `${apiHost}/api/notes`;
        const method = editingNoteId ? 'PUT' : 'POST';
        const response = await fetch(endpoint, {
            method,
            headers: {
                Authorization: 'Bearer ' + token
            },
            body: formData
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Lưu ghi chú thất bại.');
        }

        showToast(editingNoteId ? 'Đã cập nhật ghi chú.' : 'Đã lưu ghi chú.', 'success');
        resetForm();
        await fetchNotes();
    } catch (error) {
        console.error('saveNoteNow error:', error);
        showToast(error.message || 'Lưu ghi chú thất bại.', 'error');
    }
}

function editNote(eventOrId, id) {
    let event = null;
    if (typeof eventOrId === 'number' || typeof eventOrId === 'string') {
        id = eventOrId;
    } else {
        event = eventOrId;
    }
    event?.stopPropagation();
    closeNoteModal();
    const note = globalNotes.find(item => item.id === id);
    if (!note) return;
    editingNoteId = id;
    document.getElementById('form-title').innerText = 'Chỉnh sửa Ghi chú';
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content === '[Đã khóa]' ? '' : note.content || '';
    renderLabelCheckboxes(note.labels?.map(item => item.id) || []);
    document.querySelector('.create-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('note-content')?.focus();
}

async function deleteNote(id) {
    // Tìm note để kiểm tra password
    const note = globalNotes.find(n => n.id === id);
    if (!note) {
        showToast('Không tìm thấy ghi chú.', 'error');
        return;
    }

    let confirmed = false;

    if (note.note_password) {
        // Nếu có password, yêu cầu nhập
        const { value: password } = await Swal.fire({
            title: 'Nhập mật khẩu ghi chú',
            input: 'password',
            inputPlaceholder: 'Mật khẩu để xóa ghi chú...',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444',
            inputValidator: (value) => {
                if (!value) {
                    return 'Vui lòng nhập mật khẩu!';
                }
            }
        });

        if (!password) return;

        // Verify password
        try {
            const response = await fetch(`${apiHost}/api/notes/${id}/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                showToast(data.message || 'Mật khẩu không đúng.', 'error');
                return;
            }
            confirmed = true;
        } catch (error) {
            console.error('verify password error:', error);
            showToast('Lỗi xác thực mật khẩu.', 'error');
            return;
        }
    } else {
        // Không có password, confirm bình thường
        confirmed = await Swal.fire({
            title: 'Xóa ghi chú?',
            text: 'Hành động này không thể hoàn tác.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444'
        }).then(result => result.isConfirmed);
    }

    if (!confirmed) return;

    try {
        const response = await fetch(`${apiHost}/api/notes/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Xóa thất bại.');
        }
        showToast('Đã xóa ghi chú.', 'success');
        await fetchNotes();
    } catch (error) {
        console.error('deleteNote error:', error);
        showToast(error.message || 'Xóa ghi chú thất bại.', 'error');
    }
}

async function togglePin(id) {
    try {
        const response = await fetch(`${apiHost}/api/notes/${id}/pin`, {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Không thể thay đổi trạng thái ghim.');
        }
        await fetchNotes();
        showToast('Đã cập nhật trạng thái ghim.', 'success');
    } catch (error) {
        console.error('togglePin error:', error);
        showToast(error.message || 'Không thể thay đổi ghim.', 'error');
    }
}

async function toggleLock(id, currentlyLocked) {
    try {
        if (currentlyLocked) {
            openPasswordDialog(id);
        } else {
            const { value: password } = await Swal.fire({
                title: 'Khóa ghi chú',
                input: 'password',
                inputLabel: 'Nhập mật khẩu để khóa ghi chú',
                inputPlaceholder: 'Mật khẩu...',
                showCancelButton: true,
                confirmButtonText: 'Khóa',
                cancelButtonText: 'Hủy',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off'
                }
            });

            if (!password) return;

            const response = await fetch(`${apiHost}/api/notes/${id}/lock`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Không thể khóa ghi chú.');
            }
            showToast('Đã khóa ghi chú.', 'success');
            await fetchNotes();
        }
    } catch (error) {
        console.error('toggleLock error:', error);
        showToast(error.message || 'Không thể thay đổi khóa.', 'error');
    }
}

function openPasswordDialog(noteId) {
    unlockingNoteId = noteId;
    const dialog = document.getElementById('password-dialog');
    const passwordInput = document.getElementById('unlock-password');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    if (dialog) {
        dialog.classList.add('show');
    }
}

async function unlockNote() {
    if (!unlockingNoteId) {
        showToast('Không có ghi chú để mở khóa.', 'warning');
        return;
    }

    const passwordInput = document.getElementById('unlock-password');
    const password = passwordInput?.value?.trim();

    if (!password) {
        showToast('Vui lòng nhập mật khẩu để mở khóa.', 'warning');
        return;
    }

    try {
        const response = await fetch(`${apiHost}/api/notes/${unlockingNoteId}/unlock`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ password })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Không thể mở khóa ghi chú.');
        }
        showToast('Đã mở khóa ghi chú.', 'success');
        closePasswordDialog();
        unlockingNoteId = null;
        await fetchNotes();
    } catch (error) {
        console.error('unlockNote error:', error);
        showToast(error.message || 'Không thể mở khóa ghi chú.', 'error');
    }
}

function closePasswordDialog() {
    document.getElementById('password-dialog')?.classList.remove('show');
}

function closeShareDialog() {
    document.getElementById('share-dialog')?.classList.remove('show');
}

async function resendVerificationEmail() {
    try {
        const response = await fetch(`${apiHost}/api/auth/resend-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Không thể gửi lại email.');
        }
        showToast('Đã gửi lại email kích hoạt.', 'success');
    } catch (error) {
        console.error('resendVerificationEmail error:', error);
        showToast(error.message || 'Gửi lại email thất bại.', 'error');
    }
}
function openShareDialog(eventOrId, noteId) {
    let event = null;
    if (typeof eventOrId === 'number' || typeof eventOrId === 'string') {
        noteId = eventOrId;
    } else {
        event = eventOrId;
    }
    event?.stopPropagation();
    closeNoteModal();
    sharingNoteId = noteId;
    const dialog =
        document.getElementById('share-dialog');
    if (dialog) {
        dialog.classList.add('show');
    }
}
async function shareNote() {
    const email =
        document
            .getElementById('share-email')
            ?.value
            .trim();
    const permission =
        document
            .getElementById('share-permission')
            ?.value;
    if (!email) {
        showToast(
            'Vui lòng nhập email.',
            'warning'
        );
        return;
    }
    try {
        const response = await fetch(
            `${apiHost}/api/notes/${sharingNoteId}/share`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization:
                        'Bearer ' + token
                },
                body: JSON.stringify({
                    email,
                    permission
                })
            }
        );
        if (!response.ok) {
            const data =
                await response.json()
                    .catch(() => ({}));
            throw new Error(
                data.message ||
                'Không thể chia sẻ ghi chú.'
            );
        }
        showToast(
            'Đã chia sẻ ghi chú.',
            'success'
        );
        closeShareDialog();
    } catch (error) {
        console.error(
            'shareNote error:',
            error
        );
        showToast(
            error.message ||
            'Chia sẻ thất bại.',
            'error'
        );
    }
}

async function removeSharedNote(eventOrId, id) {
    let event = null;
    if (typeof eventOrId === 'number' || typeof eventOrId === 'string') {
        id = eventOrId;
    } else {
        event = eventOrId;
    }
    event?.stopPropagation();
    const confirmed = await Swal.fire({
        title: 'Xóa khỏi danh sách?',
        text: 'Ghi chú này sẽ không còn hiển thị với bạn nữa, nhưng không xóa khỏi tác giả.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#ef4444'
    }).then(result => result.isConfirmed);

    if (!confirmed) return;

    try {
        const response = await fetch(`${apiHost}/api/notes/${id}/unshare`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Xóa khỏi danh sách thất bại.');
        }
        showToast('Đã xóa khỏi danh sách của bạn.', 'success');
        closeNoteModal();
        const card = document.querySelector(`article.note-card[data-note-id="${id}"]`);
        if (card) card.remove();
        const remaining = document.querySelectorAll('#notes-container .note-card');
        if (!remaining.length) {
            showEmptyState('Chưa có ghi chú nào.');
        }
        await fetchNotes();
    } catch (error) {
        console.error('removeSharedNote error:', error);
        showToast(error.message || 'Xóa khỏi danh sách thất bại.', 'error');
    }
}

// Modal view cho note
function openNoteModal(noteId) {
    const note = globalNotes.find(item => item.id === noteId);
    if (!note) return;

    const isLocked = note.note_password && note.note_password !== '';
    const isPinned = note.is_pinned === true || note.is_pinned === 1 || note.is_pinned === '1';
    const canEdit = note.access_level === 'owner' || note.access_level === 'edit';
    const canDelete = note.access_level === 'owner';
    const canPin = note.access_level === 'owner';
    const canLock = note.access_level === 'owner';
    const canShare = note.access_level === 'owner' && !note.shared_by_name;
    const canRemoveShared = note.access_level !== 'owner' && note.shared_by_name;

    const actionsHtml = `
        <div class="note-modal-actions">
            ${canPin ? `<button class="btn-pin" type="button" onclick="togglePin(${note.id})"><i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Bỏ ghim' : 'Ghim'}</button>` : ''}
            ${canLock ? `<button class="btn-lock" type="button" onclick="toggleLock(${note.id}, ${isLocked})"><i class="fa-solid ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${isLocked ? 'Mở khóa' : 'Khóa'}</button>` : ''}
            ${canShare ? `<button class="btn-share" type="button" onclick="openShareDialog(event, ${note.id})"><i class="fa-solid fa-share-from-square"></i> Chia sẻ</button>` : ''}
            ${canEdit ? `<button class="btn-edit" type="button" onclick="editNote(event, ${note.id})"><i class="fa-solid fa-pen"></i> Sửa</button>` : ''}
            ${canDelete ? `<button class="btn-delete" type="button" onclick="deleteNote(${note.id})"><i class="fa-solid fa-trash"></i> Xóa</button>` : ''}
            ${canRemoveShared ? `<button class="btn-remove" type="button" onclick="removeSharedNote(event, ${note.id})"><i class="fa-solid fa-eye-slash"></i> Bỏ xem</button>` : ''}
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'note-modal-overlay';
    modal.innerHTML = `
        <div class="note-modal">
            <div class="note-modal-header">
                <h2>${note.title || 'Ghi chú không có tiêu đề'}</h2>
                <button class="note-modal-close" onclick="closeNoteModal()">✕</button>
            </div>
            ${actionsHtml}
            <div class="note-modal-meta">${note.access_level !== 'owner' ? `Được chia sẻ bởi ${note.shared_by_name || 'người khác'}` : `${note.last_edited_by ? `Cập nhật bởi ${note.last_edited_by}` : 'Tạo bởi bạn'}`}</div>
            <div class="note-modal-content">
                ${isLocked && note.access_level !== 'owner' ? '[Đã khóa]' : (note.content || '<i>Không có nội dung</i>')}
            </div>
            ${note.images && note.images.length > 0 ? `
                <div class="note-modal-images">
                    ${note.images.map(url => `<img src="${url}" alt="Ảnh ghi chú" class="note-modal-image">`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeNoteModal();
    });
}

function closeNoteModal() {
    document.body.style.overflow = '';
    const modal = document.querySelector('.note-modal-overlay');
    if (modal) modal.remove();
}
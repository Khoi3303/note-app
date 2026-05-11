async function fetchLabels() {
    try {
        const response = await fetch(
            `${apiHost}/api/notes/labels`,
            {
                headers: {
                    'Authorization':
                        'Bearer ' + token
                }
            }
        );
        if (!response.ok) {
            if (typeof handleApiAuthFailure === 'function' && handleApiAuthFailure(response)) return;
            throw new Error(
                'Không thể tải labels'
            );
        }
        globalLabels = await response.json();
        renderLabels();
        renderLabelCheckboxes();
    } catch (error) {
        console.error(error);
        showToast(
            'Không thể tải labels.'
        );
    }
}
function renderLabels() {
    const container =
        document.getElementById(
            'label-list'
        );
    if (!container) return;
    container.innerHTML = '';
    globalLabels.forEach(label => {
        const div =
            document.createElement('div');
        div.className = `label-chip ${currentLabelFilterId === label.id ? 'active' : ''}`;
        div.style.cursor = 'pointer';
        div.onclick = () => filterByLabel(label.id);
        div.innerHTML = `
            <span>
                ${label.name}
            </span>
            <div class="label-actions">
                <button
                    onclick="
                        event.stopPropagation();
                        editLabel(${label.id})
                    "
                >
                    ✏️
                </button>
                <button
                    onclick="
                        event.stopPropagation();
                        deleteLabel(${label.id})
                    "
                >
                    🗑️
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}
function renderLabelCheckboxes(
    selectedIds = []
) {
    const container =
        document.getElementById(
            'label-checkboxes'
        );
    if (!container) return;
    container.innerHTML = '';
    globalLabels.forEach(label => {
        const checked =
            selectedIds.includes(label.id)
                ? 'checked'
                : '';
        container.innerHTML += `
            <label class="checkbox-pill">
                <input
                    type="checkbox"
                    name="label_ids"
                    value="${label.id}"
                    ${checked}
                >
                ${label.name}
            </label>
        `;
    });
}
function getSelectedLabelIds() {
    return Array.from(
        document.querySelectorAll(
            '#label-checkboxes input:checked'
        )
    ).map(input => Number(input.value));
}
async function createLabel() {
    const input =
        document.getElementById(
            'new-label-name'
        );
    const name =
        input.value.trim();
    if (!name) {
        showToast(
            'Tên nhãn không được để trống.'
        );
        return;
    }
    try {
        const response = await fetch(
            `${apiHost}/api/notes/labels`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json',
                    'Authorization':
                        'Bearer ' + token
                },
                body: JSON.stringify({
                    name
                })
            }
        );
        if (response.ok) {
            input.value = '';
            fetchLabels();
            showToast(
                'Đã thêm nhãn.'
            );
        } else {
            const data =
                await response.json();
            showToast(
                data.message ||
                'Tạo nhãn thất bại.'
            );
        }
    } catch {
        showToast(
            'Lỗi kết nối.'
        );
    }
}
async function editLabel(id) {
    const label =
        globalLabels.find(
            l => l.id === id
        );
    if (!label) return;
    const result =
        await Swal.fire({
            title: 'Sửa nhãn',
            input: 'text',
            inputValue: label.name,
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            cancelButtonText: 'Hủy'
        });
    if (!result.isConfirmed) return;
    const newName =
        result.value.trim();
    if (!newName) return;
    try {
        const response = await fetch(
            `${apiHost}/api/notes/labels/${id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type':
                        'application/json',
                    'Authorization':
                        'Bearer ' + token
                },
                body: JSON.stringify({
                    name: newName
                })
            }
        );
        if (response.ok) {
            fetchLabels();
            fetchNotes();
            showToast(
                'Đã cập nhật nhãn.'
            );
        } else {
            showToast(
                'Sửa nhãn thất bại.'
            );
        }
    } catch {
        showToast(
            'Lỗi kết nối.'
        );
    }
}
async function deleteLabel(id) {
    const result =
        await Swal.fire({
            title: 'Xóa nhãn?',
            text: 'Bạn có chắc chắn?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });
    if (!result.isConfirmed) return;
    try {
        const response = await fetch(
            `${apiHost}/api/notes/labels/${id}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization':
                        'Bearer ' + token
                }
            }
        );
        if (response.ok) {
            fetchLabels();
            fetchNotes();
            showToast(
                'Đã xóa nhãn.'
            );
        } else {
            const data =
                await response.json();
            showToast(
                data.message ||
                'Xóa thất bại.'
            );
        }

    } catch {
        showToast(
            'Lỗi kết nối.'
        );
    }
}

function filterByLabel(id) {
    if (currentLabelFilterId === id) {
        currentLabelFilterId = null;
    } else {
        currentLabelFilterId = id;
    }
    // render lại label để active đổi màu
    renderLabels();
    // load lại notes
    fetchNotes();
}
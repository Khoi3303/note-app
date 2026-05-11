const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { sql, poolPromise } = require('../config/db');
const { broadcastNoteEvent } = require('../wsServer');

// Lấy danh sách ghi chú kèm ảnh
const getNotes = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('email', sql.NVarChar, req.user.email)
            .query(`
                SELECT n.*, i.image_url, l.id AS label_id, l.name AS label_name,
                       CASE WHEN n.user_id = @user_id THEN 'owner' ELSE s.permission END AS access_level,
                       CASE WHEN n.user_id != @user_id THEN u.display_name END AS shared_by_name
                FROM Notes n
                LEFT JOIN Images i ON n.id = i.note_id
                LEFT JOIN NoteLabels nl ON n.id = nl.note_id
                LEFT JOIN Labels l ON nl.label_id = l.id
                LEFT JOIN Shares s ON n.id = s.note_id AND s.shared_with_email = @email
                LEFT JOIN Users u ON s.shared_by_user_id = u.id
                WHERE n.user_id = @user_id OR (s.shared_with_email = @email AND s.permission IN ('read', 'edit'))
                ORDER BY n.is_pinned DESC, n.pinned_at DESC, n.created_at DESC
            `);

        const notesMap = {};
        result.recordset.forEach(row => {
            if (!notesMap[row.id]) {
                const note = { ...row, images: [], labels: [] };
                delete note.image_url;
                delete note.label_id;
                delete note.label_name;
                note.note_password = !!note.note_password;
                // Nếu có mật khẩu và không phải chủ sở hữu, ẩn nội dung và ảnh
                if (note.note_password && note.access_level !== 'owner') {
                    note.content = '[Đã khóa]';
                    note.images = [];
                }
                notesMap[row.id] = note;
            }

            if (row.image_url && !notesMap[row.id].images.includes(row.image_url)) {
                notesMap[row.id].images.push(row.image_url);
            }
            if (row.label_id && !notesMap[row.id].labels.some(label => label.id === row.label_id)) {
                notesMap[row.id].labels.push({ id: row.label_id, name: row.label_name });
            }
        });

        res.status(200).json(Object.values(notesMap));
    } catch (error) {
        console.error('Lỗi lấy ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

// Tạo ghi chú mới có ảnh
const createNote = async (req, res) => {
    try {
        const { title, content, label_ids } = req.body;
        console.log('BODY:', req.body);
        console.log('LABEL IDS:', label_ids);
        const pool = await poolPromise;

        // Lưu Note trước
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content || '')
            .query(`
                INSERT INTO Notes (user_id, title, content)
                OUTPUT INSERTED.id, INSERTED.created_at
                VALUES (@user_id, @title, @content)
            `);

        const newNote = result.recordset[0];

        // Lưu ảnh vào bảng Images (nếu có)
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                await pool.request()
                    .input('note_id', sql.Int, newNote.id)
                    .input('image_url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO Images (note_id, image_url) VALUES (@note_id, @image_url)');
            }
        }

        await syncNoteLabels(pool, newNote.id, label_ids, req.user.id);

        broadcastNoteEvent({ type: 'note-changed', noteId: newNote.id, action: 'created' });
        res.status(201).json({ note: newNote });
    } catch (error) {
        console.error('Lỗi tạo ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

// Cập nhật ghi chú
const updateNote = async (req, res) => {
    try {
        const { title, content, label_ids, unlock_password } = req.body;
        const noteId = req.params.id;
        const pool = await poolPromise;

        // Kiểm tra quyền sở hữu ghi chú hoặc quyền chia sẻ
        let hasPermission = false;
        let isOwner = false;

        const ownerCheck = await pool.request()
            .input('id', sql.Int, noteId)
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT id FROM Notes WHERE id = @id AND user_id = @user_id');

        if (ownerCheck.recordset.length) {
            hasPermission = true;
            isOwner = true;
        } else {
            // Kiểm tra quyền chia sẻ
            const shareCheck = await pool.request()
                .input('note_id', sql.Int, noteId)
                .input('email', sql.NVarChar, req.user.email)
                .query('SELECT permission FROM Shares WHERE note_id = @note_id AND LOWER(shared_with_email) = LOWER(@email)');

            if (shareCheck.recordset.length && shareCheck.recordset[0].permission === 'edit') {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa ghi chú này.' });
        }

        const check = await pool.request()
            .input('id', sql.Int, noteId)
            .query('SELECT note_password FROM Notes WHERE id = @id');

        const notePasswordHash = check.recordset[0]?.note_password;
        if (notePasswordHash) {
            if (!unlock_password || !(await bcrypt.compare(unlock_password, notePasswordHash))) {
                return res.status(403).json({ message: 'Mật khẩu ghi chú không đúng.' });
            }
        }

        await pool.request()
            .input('id', sql.Int, noteId)
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content || '')
            .input(
                'last_edited_by',
                sql.NVarChar,
                req.user.display_name || req.user.email
            )
            .query(`
                UPDATE Notes
                SET
                    title = @title,
                    content = @content,
                    updated_at = GETDATE(),
                    last_edited_by = @last_edited_by,
                    last_edited_at = GETDATE()
                WHERE id = @id
            `);

        // Chỉ cho phép chủ sở hữu thay đổi nhãn
        if (isOwner) {
            await syncNoteLabels(pool, noteId, label_ids, req.user.id);
        }

        // Xóa ảnh đã chọn nếu đang chỉnh sửa
        if (req.body.deleted_images) {
            let deletedImages = req.body.deleted_images;
            try {
                if (typeof deletedImages === 'string') {
                    deletedImages = JSON.parse(deletedImages);
                }
                if (Array.isArray(deletedImages) && deletedImages.length > 0) {
                    for (let imageUrl of deletedImages) {
                        await pool.request()
                            .input('note_id', sql.Int, noteId)
                            .input('image_url', sql.NVarChar, imageUrl)
                            .query('DELETE FROM Images WHERE note_id = @note_id AND image_url = @image_url');

                        const relativePath = imageUrl.replace(/^\//, '');
                        const filePath = path.join(__dirname, '..', relativePath);
                        if (fs.existsSync(filePath)) {
                            try {
                                fs.unlinkSync(filePath);
                            } catch (err) {
                                console.warn('Không thể xóa file ảnh:', filePath, err);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Không thể phân tích deleted_images:', req.body.deleted_images, error);
            }
        }

        // Nếu có ảnh mới thì thêm vào (giữ ảnh cũ)
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                await pool.request()
                    .input('note_id', sql.Int, noteId)
                    .input('image_url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO Images (note_id, image_url) VALUES (@note_id, @image_url)');
            }
        }

        broadcastNoteEvent({ type: 'note-changed', noteId: noteId, action: 'updated' });
        res.status(200).json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const deleteNote = async (req, res) => {
    try {
        const pool = await poolPromise;
        // Xóa quan hệ label, ảnh trước khi xóa note
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM NoteLabels WHERE note_id = @id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Images WHERE note_id = @id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Notes WHERE id = @id');
        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(req.params.id, 10), action: 'deleted' });
        res.status(200).json({ message: 'Xóa thành công!' });
    } catch (error) {
        console.error('Lỗi xóa ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const syncNoteLabels = async (pool, noteId, labelIds = [], userId) => {

    await pool.request()
        .input('note_id', sql.Int, noteId)
        .query('DELETE FROM NoteLabels WHERE note_id = @note_id');

    // Nếu frontend gửi 1 giá trị đơn
    if (!Array.isArray(labelIds)) {

        // Nếu là string JSON
        if (typeof labelIds === 'string') {

            try {

                labelIds = JSON.parse(labelIds);

            } catch {

                // Nếu là "1,2,3"
                labelIds = labelIds
                    .split(',')
                    .map(v => v.trim());

            }
        } else {

            labelIds = [labelIds];
        }
    }

    // Ép về số
    const validIds = labelIds
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));

    if (!validIds.length) {
        return;
    }

    // Chỉ lấy label thuộc user
    const labelCheck = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
            SELECT id
            FROM Labels
            WHERE user_id = @user_id
        `);

    const userLabelIds = labelCheck.recordset.map(l => l.id);

    for (const labelId of validIds) {

        if (!userLabelIds.includes(labelId)) {
            continue;
        }

        await pool.request()
            .input('note_id', sql.Int, noteId)
            .input('label_id', sql.Int, labelId)
            .query(`
                INSERT INTO NoteLabels (note_id, label_id)
                VALUES (@note_id, @label_id)
            `);
    }
};

const getLabels = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT id, name FROM Labels WHERE user_id = @user_id ORDER BY name ASC');

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy nhãn:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const createLabel = async (req, res) => {
    try {
        const { name } = req.body;
        const normalizedName = name ? name.trim() : '';
        if (!normalizedName) {
            return res.status(400).json({ message: 'Tên nhãn không được để trống.' });
        }

        const pool = await poolPromise;
        const existing = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('name', sql.NVarChar, normalizedName)
            .query('SELECT id FROM Labels WHERE user_id = @user_id AND LOWER(name) = LOWER(@name)');

        if (existing.recordset.length) {
            return res.status(409).json({ message: 'Nhãn này đã tồn tại.' });
        }

        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('name', sql.NVarChar, normalizedName)
            .query(`
                INSERT INTO Labels (user_id, name)
                OUTPUT INSERTED.id, INSERTED.name
                VALUES (@user_id, @name)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Lỗi tạo nhãn:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const updateLabel = async (req, res) => {
    try {
        const { name } = req.body;
        const labelId = req.params.id;
        const normalizedName = name ? name.trim() : '';
        if (!normalizedName) {
            return res.status(400).json({ message: 'Tên nhãn không được để trống.' });
        }

        const pool = await poolPromise;
        const existing = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('name', sql.NVarChar, normalizedName)
            .input('id', sql.Int, labelId)
            .query('SELECT id FROM Labels WHERE user_id = @user_id AND LOWER(name) = LOWER(@name) AND id != @id');

        if (existing.recordset.length) {
            return res.status(409).json({ message: 'Nhãn này đã tồn tại.' });
        }

        await pool.request()
            .input('id', sql.Int, labelId)
            .input('user_id', sql.Int, req.user.id)
            .input('name', sql.NVarChar, normalizedName)
            .query('UPDATE Labels SET name = @name WHERE id = @id AND user_id = @user_id');

        res.status(200).json({ message: 'Cập nhật nhãn thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật nhãn:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const deleteLabel = async (req, res) => {
    try {
        const pool = await poolPromise;
        const labelId = req.params.id;

        await pool.request()
            .input('id', sql.Int, labelId)
            .input('user_id', sql.Int, req.user.id)
            .query(`DELETE FROM NoteLabels WHERE label_id = @id AND note_id IN (SELECT id FROM Notes WHERE user_id = @user_id)`);

        await pool.request()
            .input('id', sql.Int, labelId)
            .input('user_id', sql.Int, req.user.id)
            .query('DELETE FROM Labels WHERE id = @id AND user_id = @user_id');

        res.status(200).json({ message: 'Xóa nhãn thành công!' });
    } catch (error) {
        console.error('Lỗi xóa nhãn:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const togglePin = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        // Kiểm tra trạng thái hiện tại và quyền sở hữu note
        const check = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT is_pinned FROM Notes WHERE id = @id AND user_id = @user_id');

        if (!check.recordset.length) {
            return res.status(404).json({ message: 'Ghi chú không tồn tại hoặc không thuộc về bạn.' });
        }
        
        const newStatus = check.recordset[0].is_pinned ? 0 : 1;
        const pinnedAt = newStatus ? 'GETDATE()' : 'NULL';

        await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, req.user.id)
            .query(`UPDATE Notes SET is_pinned = ${newStatus}, pinned_at = ${pinnedAt} WHERE id = @id AND user_id = @user_id`);

        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(id, 10), action: 'pinned' });
        res.status(200).json({ message: 'Cập nhật trạng thái Ghim thành công!', is_pinned: newStatus });
    } catch (error) {
        console.error('Lỗi toggle pin:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const setNotePassword = async (req, res) => {
    try {
        const { password } = req.body;
        const noteId = req.params.id;
        const passwordValue = password ? password.trim() : '';
        if (!passwordValue) {
            return res.status(400).json({ message: 'Mật khẩu không được để trống.' });
        }

        const hashedPassword = await bcrypt.hash(passwordValue, 10);
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, noteId)
            .input('user_id', sql.Int, req.user.id)
            .input('password', sql.NVarChar, hashedPassword)
            .query('UPDATE Notes SET note_password = @password WHERE id = @id AND user_id = @user_id');

        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(noteId, 10), action: 'locked' });
        res.status(200).json({ message: 'Khóa ghi chú thành công!' });
    } catch (error) {
        console.error('Lỗi khóa ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const removeNotePassword = async (req, res) => {
    try {
        const { password } = req.body;
        const noteId = req.params.id;
        const passwordValue = password ? password.trim() : '';
        if (!passwordValue) {
            return res.status(400).json({ message: 'Mật khẩu mở khóa không được để trống.' });
        }

        const pool = await poolPromise;
        const check = await pool.request()
            .input('id', sql.Int, noteId)
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT note_password FROM Notes WHERE id = @id AND user_id = @user_id');

        if (!check.recordset.length || !check.recordset[0].note_password) {
            return res.status(404).json({ message: 'Ghi chú không tồn tại hoặc không bị khóa.' });
        }

        const notePasswordHash = check.recordset[0].note_password;
        const isMatch = await bcrypt.compare(passwordValue, notePasswordHash);
        if (!isMatch) {
            return res.status(403).json({ message: 'Mật khẩu mở khóa không đúng.' });
        }

        await pool.request()
            .input('id', sql.Int, noteId)
            .input('user_id', sql.Int, req.user.id)
            .query('UPDATE Notes SET note_password = NULL WHERE id = @id AND user_id = @user_id');

        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(noteId, 10), action: 'unlocked' });
        res.status(200).json({ message: 'Mở khóa ghi chú thành công!' });
    } catch (error) {
        console.error('Lỗi mở khóa ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const shareNote = async (req, res) => {
    try {
        const { email, permission } = req.body;
        const noteId = req.params.id;
        if (!email || !permission || !['read', 'edit'].includes(permission)) {
            return res.status(400).json({ message: 'Email và quyền chia sẻ không hợp lệ.' });
        }

        const pool = await poolPromise;

        // Kiểm tra quyền sở hữu ghi chú
        const noteCheck = await pool.request()
            .input('id', sql.Int, noteId)
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT id FROM Notes WHERE id = @id AND user_id = @user_id');

        if (!noteCheck.recordset.length) {
            return res.status(404).json({ message: 'Ghi chú không tồn tại hoặc không thuộc về bạn.' });
        }

        // Kiểm tra xem đã chia sẻ với email này chưa
        const existingShare = await pool.request()
            .input('note_id', sql.Int, noteId)
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM Shares WHERE note_id = @note_id AND shared_with_email = @email');

        if (existingShare.recordset.length) {
            // Cập nhật quyền nếu đã chia sẻ
            await pool.request()
                .input('id', sql.Int, existingShare.recordset[0].id)
                .input('permission', sql.NVarChar, permission)
                .query('UPDATE Shares SET permission = @permission WHERE id = @id');
        } else {
            // Thêm chia sẻ mới
            await pool.request()
                .input('note_id', sql.Int, noteId)
                .input('shared_by_user_id', sql.Int, req.user.id)
                .input('email', sql.NVarChar, email)
                .input('permission', sql.NVarChar, permission)
                .query('INSERT INTO Shares (note_id, shared_by_user_id, shared_with_email, permission) VALUES (@note_id, @shared_by_user_id, @email, @permission)');
        }

        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(noteId, 10), action: 'shared' });
        res.status(200).json({ message: 'Chia sẻ ghi chú thành công!' });
    } catch (error) {
        console.error('Lỗi chia sẻ ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const unshareNote = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('note_id', sql.Int, id)
            .input('email', sql.NVarChar, req.user.email)
            .query('DELETE FROM Shares WHERE note_id = @note_id AND LOWER(shared_with_email) = LOWER(@email)');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Ghi chú chia sẻ không tìm thấy hoặc không thuộc về bạn.' });
        }

        broadcastNoteEvent({ type: 'note-changed', noteId: parseInt(id, 10), action: 'unshared' });
        res.status(200).json({ message: 'Đã xóa khỏi danh sách chia sẻ của bạn.' });
    } catch (error) {
        console.error('Lỗi xóa khỏi danh sách chia sẻ:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const getSharedNotes = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, req.user.email)
            .query(`
                SELECT n.*, s.permission, u.display_name AS shared_by_name,
                       i.image_url, l.id AS label_id, l.name AS label_name
                FROM Shares s
                JOIN Notes n ON s.note_id = n.id
                JOIN Users u ON s.shared_by_user_id = u.id
                LEFT JOIN Images i ON n.id = i.note_id
                LEFT JOIN NoteLabels nl ON n.id = nl.note_id
                LEFT JOIN Labels l ON nl.label_id = l.id
                WHERE s.shared_with_email = @email
                ORDER BY n.updated_at DESC
            `);

        const notesMap = {};
        result.recordset.forEach(row => {
            if (!notesMap[row.id]) {
                const note = { ...row, images: [], labels: [] };
                delete note.image_url;
                delete note.label_id;
                delete note.label_name;
                note.note_password = !!note.note_password;
                // Nếu có mật khẩu, ẩn nội dung và ảnh
                if (note.note_password) {
                    note.content = '[Đã khóa]';
                    note.images = [];
                }
                notesMap[row.id] = note;
            }

            if (row.image_url && !notesMap[row.id].images.includes(row.image_url)) {
                notesMap[row.id].images.push(row.image_url);
            }
            if (row.label_id && !notesMap[row.id].labels.some(label => label.id === row.label_id)) {
                notesMap[row.id].labels.push({ id: row.label_id, name: row.label_name });
            }
        });

        res.status(200).json(Object.values(notesMap));
    } catch (error) {
        console.error('Lỗi lấy ghi chú được chia sẻ:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

// Xác thực mật khẩu ghi chú
const verifyPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Vui lòng nhập mật khẩu!' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('note_id', sql.Int, id)
            .input('user_id', sql.Int, req.user.id)
            .query(`
                SELECT note_password FROM Notes
                WHERE id = @note_id AND user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Ghi chú không tồn tại!' });
        }

        const note = result.recordset[0];
        if (!note.note_password) {
            return res.status(400).json({ message: 'Ghi chú không có mật khẩu!' });
        }

        const isValid = await bcrypt.compare(password, note.note_password);
        if (!isValid) {
            return res.status(401).json({ message: 'Mật khẩu không đúng!' });
        }

        res.status(200).json({ message: 'Mật khẩu đúng!' });
    } catch (error) {
        console.error('Lỗi xác thực mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

module.exports = { getNotes, createNote, updateNote, deleteNote, togglePin, getLabels, createLabel, updateLabel, deleteLabel, setNotePassword, removeNotePassword, shareNote, unshareNote, getSharedNotes, verifyPassword };
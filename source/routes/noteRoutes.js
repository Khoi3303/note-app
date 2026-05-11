const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const noteController = require('../controllers/noteController');
const { verifyToken } = require('../middleware/authMiddleware');

const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {

    fs.mkdirSync(uploadsDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadsDir);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1E9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );
    }
});

const fileFilter = (req, file, cb) => {

    const allowed = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    if (allowed.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error('Chỉ được upload file ảnh!'),
            false
        );
    }
};

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
    }
});

router.get(
    '/',
    verifyToken,
    noteController.getNotes
);

router.get(
    '/shared',
    verifyToken,
    noteController.getSharedNotes
);

router.get(
    '/labels',
    verifyToken,
    noteController.getLabels
);

router.post(
    '/labels',
    verifyToken,
    noteController.createLabel
);

router.put(
    '/labels/:id',
    verifyToken,
    noteController.updateLabel
);

router.delete(
    '/labels/:id',
    verifyToken,
    noteController.deleteLabel
);

router.post(
    '/',
    verifyToken,
    upload.array('images', 10),
    noteController.createNote
);

router.put(
    '/:id',
    verifyToken,
    upload.array('images', 10),
    noteController.updateNote
);

router.patch(
    '/:id',
    verifyToken,
    upload.array('images', 10),
    noteController.updateNote
);

router.patch(
    '/:id/pin',
    verifyToken,
    noteController.togglePin
);

router.patch(
    '/:id/lock',
    verifyToken,
    noteController.setNotePassword
);

router.patch(
    '/:id/unlock',
    verifyToken,
    noteController.removeNotePassword
);

router.post(
    '/:id/share',
    verifyToken,
    noteController.shareNote
);

router.delete(
    '/:id/unshare',
    verifyToken,
    noteController.unshareNote
);

router.post(
    '/:id/verify-password',
    verifyToken,
    noteController.verifyPassword
);

router.delete(
    '/:id',
    verifyToken,
    noteController.deleteNote
);

module.exports = router;
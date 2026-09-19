// src/routes/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import 'dotenv/config';       // ✅ ensure env loaded

const router = Router();

// ✅ Base path from env (with fallback)
const BASE_PATH = process.env.BASE_PATH || 'http://localhost:3001';

// Ensure uploads folder
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
     const allowed = /jpeg|jpg|png|gif|webp|mp3|wav|ogg|webm|m4a|aac/;
    const ok = allowed.test(file.mimetype);
    cb(null, ok);
  },
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // ✅ Dynamic URL
    const url = `${BASE_PATH}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url,
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

export default router;
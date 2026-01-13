/**
 * Import Routes
 * Routes for importing historical data
 */

import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import * as importController from '../controllers/importController';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Only accept Excel files
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Preview import data without saving
router.post('/preview', upload.single('file'), importController.previewImport);

// Import timesheets
router.post('/timesheets', upload.single('file'), importController.importTimesheets);

export default router;

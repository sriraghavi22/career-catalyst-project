import express from 'express';
import { registerIndividual, loginIndividual, uploadPDF, deletePDF, uploadAnalysisReport } from '../controllers/individualController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateUser } from '../middlewares/validateUser.js';
import Individual from '../models/Individual.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/register', upload.single('resume'), validateUser, (req, res, next) => {
    console.log('Route req.body:', req.body); // Debug log for text fields
    console.log('Route req.file:', req.file); // Debug log for file
    registerIndividual(req, res, next);
});
router.post('/login', validateUser, loginIndividual);
router.post('/upload/:id', authMiddleware, upload.single('pdf'), uploadPDF);
router.delete('/delete/:id', authMiddleware, deletePDF);
// Add this debug middleware before your routes
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Modify the upload-report route with debug logs
router.post('/upload-report/:id', 
  (req, res, next) => {
    console.log('-----Debug Logs-----');
    console.log('1. Request received for upload-report');
    console.log('Params:', req.params);
    console.log('Headers:', req.headers);
    next();
  },
  authMiddleware,
  (req, res, next) => {
    console.log('2. Passed auth middleware');
    next();
  },
  upload.single('pdf'),
  (req, res, next) => {
    console.log('3. Passed file upload middleware');
    console.log('File:', req.file);
    next();
  },
  uploadAnalysisReport
);
// New route to fetch students with filters
router.get('/students', authMiddleware, async (req, res) => {
    try {
        const { year, department, search } = req.query;
        const query = {};

        // Filter by year if provided and not 'all'
        if (year && year !== 'all') {
            query.year = Number(year);
        }

        // Filter by department if provided and not 'all'
        if (department && department !== 'all') {
            query.department = department;
        }

        // Search by name if provided
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        // Fetch students from the Individual model
        const students = await Individual.find(query).select('name email department year resumeFilePath');

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching students'
        });
    }
});

export default router;
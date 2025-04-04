const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
    require('dotenv').config({ path: '.env.production' });
} else {
    require('dotenv').config();
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create and serve placeholder SVG
const placeholderSvg = `
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#666" text-anchor="middle">
        Ảnh không khả dụng
    </text>
</svg>`;

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: [
        'https://lover.huygoodboy.io.vn',
        'https://love-count.onrender.com',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    console.log('Headers:', req.headers);
    next();
});

// Add security and CORS headers middleware
app.use((req, res, next) => {
    // CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);

    // Security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Remove browsing-topics from Permissions-Policy if present
    const permissionsPolicy = res.getHeader('Permissions-Policy');
    if (permissionsPolicy && permissionsPolicy.includes('browsing-topics')) {
        res.header('Permissions-Policy', permissionsPolicy.replace(/,?\s*browsing-topics=[^,]*/, ''));
    }

    next();
});

app.use(express.json());
// Serve static files
app.use(express.static(path.join(__dirname, '../')));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add a route to check if an image exists
app.get('/uploads/:filename', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        next();
    } else {
        res.status(404).json({ message: 'Image not found' });
    }
});

// Serve placeholder SVG directly without saving file
app.get('/placeholder.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(placeholderSvg);
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB Atlas');
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Memory Schema
const memorySchema = new mongoose.Schema({
    image: String,
    date: String,
    uploadDate: Date
});

const Memory = mongoose.model('Memory', memorySchema);

// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        // Tạo thư mục uploads nếu chưa tồn tại
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file ngẫu nhiên để tránh trùng lặp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận file ảnh
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

// Routes
// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Get all memories
app.get('/api/memories', async (req, res) => {
    try {
        const memories = await Memory.find().sort({ uploadDate: -1 });
        // Chuyển đổi đường dẫn tương đối thành tuyệt đối cho các memories cũ
        const memoriesWithFullPaths = memories.map(memory => ({
            ...memory.toObject(),
            image: memory.image.startsWith('http') 
                ? memory.image 
                : `https://love-count.onrender.com${memory.image}`
        }));
        res.json(memoriesWithFullPaths);
    } catch (error) {
        console.error('Error getting memories:', error);
        res.status(500).json({ message: error.message });
    }
});

// Upload new memory
app.post('/api/memories', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có file được upload' });
        }

        const memory = new Memory({
            image: `https://love-count.onrender.com/uploads/${req.file.filename}`,  // Sử dụng URL đầy đủ
            date: new Date().toLocaleDateString('vi-VN'),
            uploadDate: new Date()
        });

        const savedMemory = await memory.save();
        console.log('Memory saved:', savedMemory);
        res.status(201).json(savedMemory);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete memory
app.delete('/api/memories/:id', async (req, res) => {
    try {
        console.log('Attempting to delete memory with ID:', req.params.id);
        
        const memory = await Memory.findById(req.params.id);
        if (!memory) {
            console.log('Memory not found:', req.params.id);
            return res.status(404).json({ message: 'Không tìm thấy ảnh' });
        }
        
        console.log('Found memory:', memory);
        
        // Extract filename from the full URL
        const imageUrl = memory.image;
        const filename = imageUrl.split('/').pop();
        const filePath = path.join(__dirname, 'uploads', filename);
        
        console.log('Attempting to delete file:', filePath);
        
        // Delete file if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File deleted successfully');
        } else {
            console.log('File not found on disk:', filePath);
        }
        
        // Delete from database
        const result = await Memory.findByIdAndDelete(req.params.id);
        console.log('Database delete result:', result);
        
        res.json({ message: 'Đã xóa ảnh thành công' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            message: 'Có lỗi xảy ra khi xóa ảnh',
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File quá lớn. Giới hạn là 5MB' });
        }
        return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Có lỗi xảy ra khi xử lý file' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 
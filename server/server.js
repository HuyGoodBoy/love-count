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

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://huygoodboy.github.io'  // GitHub Pages URL của bạn
    ],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Get all memories
app.get('/api/memories', async (req, res) => {
    try {
        const memories = await Memory.find().sort({ uploadDate: -1 });
        res.json(memories);
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
            image: `/uploads/${req.file.filename}`,
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
        const memory = await Memory.findById(req.params.id);
        if (!memory) {
            return res.status(404).json({ message: 'Không tìm thấy ảnh' });
        }
        
        // Delete file from uploads folder
        const filePath = path.join(__dirname, memory.image);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await Memory.deleteOne({ _id: req.params.id });
        res.json({ message: 'Đã xóa ảnh thành công' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: error.message });
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
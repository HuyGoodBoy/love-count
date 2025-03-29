const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
    require('dotenv').config({ path: '.env.production' });
} else {
    require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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
        res.status(500).json({ message: error.message });
    }
});

// Upload new memory
app.post('/api/memories', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
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
            return res.status(404).json({ message: 'Memory not found' });
        }
        
        // Delete file from uploads folder
        const filePath = path.join(__dirname, memory.image);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await Memory.deleteOne({ _id: req.params.id });
        res.json({ message: 'Memory deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 
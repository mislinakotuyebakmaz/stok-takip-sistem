const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();


const { swaggerUi, specs, swaggerUiOptions } = require('./config/swagger');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products'); 
const reportRoutes = require('./routes/report'); 
const uploadRoutes = require('./routes/upload');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB bağlantısı başarılı!');
    })
    .catch((error) => {
        console.error('❌ MongoDB bağlantı hatası:', error);
    });


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api-docs', 
    swaggerUi.serve, 
    swaggerUi.setup(specs, swaggerUiOptions)
);


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/api/products', productRoutes);
app.use('/api/reports', reportRoutes); 

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '🚀 Backend server çalışıyor!',
        timestamp: new Date().toISOString(),
        status: 'success'
    });
});
// Database status endpoint
app.get('/api/db-status', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMessages = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting'
    };
    
    res.json({
        database: statusMessages[dbStatus],
        status: dbStatus === 1 ? 'success' : 'error',
        timestamp: new Date().toISOString()
    });
});

// Server başlat
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor!`);
    console.log(`Test URL: http://localhost:${PORT}/api/test`);
    console.log(`Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`Products API: http://localhost:${PORT}/api/products`);
    console.log(`Reports API: http://localhost:${PORT}/api/reports`); 
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

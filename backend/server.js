const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '🚀 Backend server çalışıyor!',
        timestamp: new Date().toISOString(),
        status: 'success'
    });
});

// Server başlat
app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT} portunda çalışıyor!`);
    console.log(`📡 Test URL: http://localhost:${PORT}/api/test`);
});

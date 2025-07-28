const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT token doğrulama middleware
const authenticateToken = async (req, res, next) => {
    try {
        // Token'ı header'dan al
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN formatı

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Erişim token\'ı gerekli'
            });
        }

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Kullanıcıyı database'den al
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token veya kullanıcı bulunamadı'
            });
        }

        // User bilgisini request'e ekle
        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token süresi dolmuş'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Token doğrulanırken hata oluştu',
            error: error.message
        });
    }
};

// Admin yetki kontrolü
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için admin yetkisi gerekli'
        });
    }
    next();
};

// Kendi profili veya admin kontrolü
const requireOwnerOrAdmin = (req, res, next) => {
    const targetUserId = req.params.userId || req.params.id;
    
    if (req.user.role === 'admin' || req.user.userId.toString() === targetUserId) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Bu işlem için yetkiniz yok'
        });
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireOwnerOrAdmin
};
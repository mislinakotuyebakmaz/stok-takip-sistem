const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT token oluştur
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d' // 7 gün geçerli
    });
};

// Kullanıcı kayıt
const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Kullanıcı zaten var mı kontrol et
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Bu email veya kullanıcı adı zaten kullanılıyor'
            });
        }

        // Yeni kullanıcı oluştur
        const user = new User({
            username,
            email,
            password,
            role: role === 'admin' ? 'admin' : 'user'
        });

        await user.save();

        // Token oluştur
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla oluşturuldu',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Kullanıcı oluşturulurken hata oluştu',
            error: error.message
        });
    }
};

// Kullanıcı giriş
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        // Şifre kontrol et
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        // Aktif kullanıcı kontrolü
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Hesabınız deaktive edilmiş'
            });
        }

        // Token oluştur
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Giriş yapılırken hata oluştu',
            error: error.message
        });
    }
};

// Kullanıcı profili
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Profil bilgileri alınırken hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    getProfile
};
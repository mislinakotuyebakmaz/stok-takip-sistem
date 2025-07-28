const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Kullanıcı adı
 *         email:
 *           type: string
 *           description: Email adresi
 *         password:
 *           type: string
 *           description: Şifre
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Kullanıcı rolü
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               email:
 *                 type: string
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: admin123
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: admin
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *       401:
 *         description: Geçersiz kimlik bilgileri
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profili
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Token doğrulama
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token geçerli
 *       401:
 *         description: Geçersiz token
 */
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token geçerli',
        user: req.user
    });
});

router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Başarıyla çıkış yapıldı'
    });
});

module.exports = router;
// Kullanıcı kayıt
// POST /api/auth/register
router.post('/register', register);

// Kullanıcı giriş  
// POST /api/auth/login
router.post('/login', login);

// Kullanıcı profili (korumalı route)
// GET /api/auth/profile
router.get('/profile', authenticateToken, getProfile);

// Token doğrulama endpoint
// GET /api/auth/verify
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token geçerli',
        user: req.user
    });
});

// Logout (client-side işlem, token'ı silmek)
// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Başarıyla çıkış yapıldı'
    });
});

module.exports = router;
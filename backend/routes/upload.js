const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadProductImage: multerUpload } = require('../config/upload');
const {
    uploadProductImage,
    uploadMultipleProductImages,
    deleteProductImage,
    setPrimaryImage,
    getProductImages
} = require('../controllers/uploadController');

// Tüm upload route'ları admin yetkisi gerektirir
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Dosya yükleme işlemleri
 */

/**
 * @swagger
 * /api/upload/product/{productId}/image:
 *   post:
 *     summary: Tek ürün resmi yükle
 *     description: Bir ürüne tek resim yükler. Sadece JPEG, JPG, PNG, GIF, WEBP formatları kabul edilir. Maksimum dosya boyutu 5MB.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           example: "65f8a5b2c1234567890abcdef"
 *         description: Ürün ID (MongoDB ObjectId)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Resim dosyası (JPEG, JPG, PNG, GIF, WEBP - max 5MB)
 *           encoding:
 *             image:
 *               contentType: image/png, image/jpeg, image/gif, image/webp
 *     responses:
 *       200:
 *         description: Resim başarıyla yüklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Resim başarıyla yüklendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     image:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           example: "/uploads/products/iphone-15-pro-1234567890.jpg"
 *                         size:
 *                           type: number
 *                           example: 156789
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         images:
 *                           type: array
 *       400:
 *         description: Geçersiz dosya veya dosya seçilmedi
 *       404:
 *         description: Ürün bulunamadı
 *       413:
 *         description: Dosya boyutu çok büyük (max 5MB)
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Admin yetkisi gerekli
 */
router.post('/product/:productId/image', 
    multerUpload.single('image'), 
    uploadProductImage
);

/**
 * @swagger
 * /api/upload/product/{productId}/images:
 *   post:
 *     summary: Birden fazla ürün resmi yükle
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Resim dosyaları (max 5MB her biri, max 5 dosya)
 *     responses:
 *       200:
 *         description: Resimler başarıyla yüklendi
 *       400:
 *         description: Geçersiz dosyalar
 *       404:
 *         description: Ürün bulunamadı
 */
router.post('/product/:productId/images', 
    multerUpload.array('images', 5), 
    uploadMultipleProductImages
);

/**
 * @swagger
 * /api/upload/product/{productId}/images:
 *   get:
 *     summary: Ürün resimlerini getir
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     responses:
 *       200:
 *         description: Ürün resimleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           url:
 *                             type: string
 *                           isPrimary:
 *                             type: boolean
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Ürün bulunamadı
 */
router.get('/product/:productId/images', getProductImages);

/**
 * @swagger
 * /api/upload/product/{productId}/image/{imageId}:
 *   delete:
 *     summary: Ürün resmini sil
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resim ID
 *     responses:
 *       200:
 *         description: Resim başarıyla silindi
 *       404:
 *         description: Ürün veya resim bulunamadı
 */
router.delete('/product/:productId/image/:imageId', deleteProductImage);

/**
 * @swagger
 * /api/upload/product/{productId}/image/{imageId}/primary:
 *   patch:
 *     summary: Ana resmi değiştir
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resim ID
 *     responses:
 *       200:
 *         description: Ana resim başarıyla güncellendi
 *       404:
 *         description: Ürün veya resim bulunamadı
 */




router.patch('/product/:productId/image/:imageId/primary', setPrimaryImage);

module.exports = router;
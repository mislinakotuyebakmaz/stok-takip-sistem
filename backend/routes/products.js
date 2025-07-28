const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getStatistics,
    updateStock
} = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - code
 *         - name
 *         - category
 *         - quantity
 *         - costPrice
 *         - salePrice
 *       properties:
 *         code:
 *           type: string
 *           description: Ürün kodu (3-10 karakter, büyük harf ve rakam)
 *           example: "EL001"
 *         name:
 *           type: string
 *           description: Ürün adı
 *           example: "iPhone 15 Pro"
 *         category:
 *           type: string
 *           enum: [Elektronik, Giyim, Ev & Bahçe, Spor, Kitap, Kozmetik, Gıda, Oyuncak, Diğer]
 *           example: "Elektronik"
 *         description:
 *           type: string
 *           description: Ürün açıklaması
 *           example: "Apple iPhone 15 Pro 128GB"
 *         quantity:
 *           type: integer
 *           minimum: 0
 *           description: Stok miktarı
 *           example: 50
 *         unit:
 *           type: string
 *           enum: [adet, kg, gram, litre, ml, metre, cm, paket]
 *           default: adet
 *           example: "adet"
 *         minStock:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *           example: 5
 *         costPrice:
 *           type: number
 *           minimum: 0
 *           description: Alış fiyatı
 *           example: 800
 *         salePrice:
 *           type: number
 *           minimum: 0
 *           description: Satış fiyatı
 *           example: 1000
 *         supplier:
 *           type: string
 *           description: Tedarikçi adı
 *           example: "Apple Store"
 *         barcode:
 *           type: string
 *           description: Barkod (8-13 haneli)
 *           example: "1234567890123"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["smartphone", "apple", "premium"]
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Tüm ürünleri getir
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Sayfa başına ürün sayısı
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategori filtresi
 *       - in: query
 *         name: stockStatus
 *         schema:
 *           type: string
 *           enum: [in-stock, low-stock, out-of-stock]
 *         description: Stok durumu filtresi
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi (ürün adı, kodu, açıklama)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sıralama alanı
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sıralama yönü
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum fiyat
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maksimum fiyat
 *     responses:
 *       200:
 *         description: Ürünler başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/', authenticateToken, getProducts);

/**
 * @swagger
 * /api/products/statistics:
 *   get:
 *     summary: Dashboard istatistikleri
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/statistics', authenticateToken, getStatistics);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Tek ürün getir
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     responses:
 *       200:
 *         description: Ürün başarıyla getirildi
 *       404:
 *         description: Ürün bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/:id', authenticateToken, getProduct);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Yeni ürün oluştur (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *           example:
 *             code: "EL001"
 *             name: "iPhone 15 Pro"
 *             category: "Elektronik"
 *             description: "Apple iPhone 15 Pro 128GB Space Black"
 *             quantity: 50
 *             unit: "adet"
 *             minStock: 5
 *             costPrice: 800
 *             salePrice: 1000
 *             supplier: "Apple Store"
 *             barcode: "1234567890123"
 *             tags: ["smartphone", "apple", "premium"]
 *     responses:
 *       201:
 *         description: Ürün başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Admin yetkisi gerekli
 */
router.post('/', authenticateToken, requireAdmin, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Ürün güncelle (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Ürün başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       404:
 *         description: Ürün bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Admin yetkisi gerekli
 */
router.put('/:id', authenticateToken, requireAdmin, updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Ürün sil (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     responses:
 *       200:
 *         description: Ürün başarıyla silindi
 *       404:
 *         description: Ürün bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Admin yetkisi gerekli
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Stok güncelle (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - operation
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Miktar
 *                 example: 10
 *               operation:
 *                 type: string
 *                 enum: [set, add, subtract]
 *                 description: İşlem türü
 *                 example: "add"
 *     responses:
 *       200:
 *         description: Stok başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       404:
 *         description: Ürün bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Admin yetkisi gerekli
 */
router.patch('/:id/stock', authenticateToken, requireAdmin, updateStock);

module.exports = router;
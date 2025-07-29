const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getStatistics,
    updateStock,
    getLowStockProducts,
    getOutOfStockProducts,
    getCategories,
    searchProducts,
    getProductsByPriceRange,
    getBrands
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

// Public routes (authentication not required)
/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Tüm kategorileri ve istatistiklerini getir
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Kategori listesi ve istatistikleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: number
 *                       totalValue:
 *                         type: number
 *                       avgPrice:
 *                         type: number
 *                       lowStockCount:
 *                         type: number
 *                       outOfStockCount:
 *                         type: number
 *                       stockHealth:
 *                         type: number
 *                         description: Stok sağlığı yüzdesi (0-100)
 */
router.get('/categories', getCategories);

/**
 * @swagger
 * /api/products/brands:
 *   get:
 *     summary: Tüm markaları/tedarikçileri getir
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Marka/tedarikçi listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       brand:
 *                         type: string
 *                       count:
 *                         type: number
 *                       totalValue:
 *                         type: number
 *                       categories:
 *                         type: array
 *                         items:
 *                           type: string
 *                       avgProductValue:
 *                         type: number
 */
router.get('/brands', getBrands);

// Protected routes (authentication required)
router.use(authenticateToken); // Bu noktadan sonra tüm route'lar auth gerektirir

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Tüm ürünleri getir (gelişmiş filtreleme)
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
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, Elektronik, Giyim, Ev & Bahçe, Spor, Kitap, Kozmetik, Gıda, Oyuncak, Diğer]
 *         description: Kategori filtresi
 *       - in: query
 *         name: stockStatus
 *         schema:
 *           type: string
 *           enum: [all, in-stock, low-stock, out-of-stock, available]
 *         description: Stok durumu filtresi (available = in-stock + low-stock)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi (ad, kod, açıklama, tedarikçi)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, salePrice, quantity, totalValue, profitMargin]
 *           default: createdAt
 *         description: Sıralama kriteri
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
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Tedarikçi filtresi
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Tag filtresi (virgülle ayrılmış)
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Barkod numarası
 *     responses:
 *       200:
 *         description: Ürün listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                     limit:
 *                       type: integer
 *                 filters:
 *                   type: object
 *                   description: Uygulanan filtreler
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalValue:
 *                       type: number
 *                     avgPrice:
 *                       type: number
 *                     lowStockCount:
 *                       type: number
 *                     outOfStockCount:
 *                       type: number
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/', getProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Gelişmiş ürün araması
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Arama terimi
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *           default: name,code,description
 *         description: Aranacak alanlar (virgülle ayrılmış)
 *       - in: query
 *         name: fuzzy
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Bulanık arama aktif/pasif
 *     responses:
 *       200:
 *         description: Arama sonuçları
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Product'
 *                       - type: object
 *                         properties:
 *                           _score:
 *                             type: number
 */
router.get('/search', searchProducts);

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
router.get('/statistics', getStatistics);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     summary: Düşük stoklu ürünleri getir
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maksimum sonuç sayısı
 *       - in: query
 *         name: includeOutOfStock
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Stokta olmayan ürünleri dahil et
 *     responses:
 *       200:
 *         description: Düşük stoklu ürünler listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: number
 *                     totalValue:
 *                       type: number
 *                     byCategory:
 *                       type: object
 *                     criticalProducts:
 *                       type: number
 */
router.get('/low-stock', getLowStockProducts);

/**
 * @swagger
 * /api/products/out-of-stock:
 *   get:
 *     summary: Stokta olmayan ürünleri getir
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stokta olmayan ürünler ve analiz
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     totalOutOfStock:
 *                       type: number
 *                     bySupplier:
 *                       type: object
 *                     estimatedLoss:
 *                       type: number
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/out-of-stock', getOutOfStockProducts);

/**
 * @swagger
 * /api/products/price-range:
 *   get:
 *     summary: Fiyat aralığına göre ürün dağılımı
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fiyat aralığı dağılımı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       range:
 *                         type: string
 *                       count:
 *                         type: number
 *                       totalValue:
 *                         type: number
 *                       avgStock:
 *                         type: number
 */
router.get('/price-range', getProductsByPriceRange);

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
router.get('/:id', getProduct);

// Admin only routes
router.use(requireAdmin); // Bu noktadan sonra admin yetkisi gerekir

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
router.post('/', createProduct);

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
router.put('/:id', updateProduct);

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
router.delete('/:id', deleteProduct);

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
 *               note:
 *                 type: string
 *                 description: Açıklama notu
 *                 example: "Yeni parti geldi"
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
router.patch('/:id/stock', updateStock);

module.exports = router;
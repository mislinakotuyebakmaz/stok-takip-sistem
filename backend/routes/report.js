const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    getDashboardStats,
    getInventoryMovement,
    getABCAnalysis,
    getCategoryAnalysis,
    getSupplierAnalysis,
    exportToExcel,
    exportToCSV
} = require('../controllers/reportController');

// Tüm rapor route'ları authentication gerektirir
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Raporlama ve analitik API'leri
 */

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Dashboard KPI'ları ve özet istatistikler
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, all]
 *           default: 30days
 *         description: Zaman periyodu
 *     responses:
 *       200:
 *         description: Dashboard verileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 period:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         totalProducts:
 *                           type: number
 *                         totalInventoryValue:
 *                           type: number
 *                         potentialRevenue:
 *                           type: number
 *                         potentialProfit:
 *                           type: number
 *                         profitMargin:
 *                           type: string
 *                         avgProductPrice:
 *                           type: string
 *                         totalQuantity:
 *                           type: number
 *                     stockDistribution:
 *                       type: array
 *                     topValueProducts:
 *                       type: array
 *                     lowStockAlerts:
 *                       type: array
 *                     categoryPerformance:
 *                       type: array
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/reports/inventory-movement:
 *   get:
 *     summary: Stok hareket raporu
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategori filtresi
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Tedarikçi filtresi
 *     responses:
 *       200:
 *         description: Stok hareketleri
 */
router.get('/inventory-movement', getInventoryMovement);

/**
 * @swagger
 * /api/reports/abc-analysis:
 *   get:
 *     summary: ABC analizi (Pareto prensibi)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ABC analiz sonuçları
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
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           classification:
 *                             type: string
 *                             enum: [A, B, C]
 *                           valuePercentage:
 *                             type: string
 *                           cumulativePercentage:
 *                             type: string
 *                           rank:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         A:
 *                           type: object
 *                         B:
 *                           type: object
 *                         C:
 *                           type: object
 *                     insights:
 *                       type: object
 */
router.get('/abc-analysis', getABCAnalysis);

/**
 * @swagger
 * /api/reports/category-analysis:
 *   get:
 *     summary: Kategori bazlı detaylı analiz
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kategori analiz raporu
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
 *                     categories:
 *                       type: array
 *                     summary:
 *                       type: object
 *                     chartData:
 *                       type: object
 *                       properties:
 *                         valueDistribution:
 *                           type: array
 *                         productDistribution:
 *                           type: array
 */
router.get('/category-analysis', getCategoryAnalysis);

/**
 * @swagger
 * /api/reports/supplier-analysis:
 *   get:
 *     summary: Tedarikçi performans analizi
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tedarikçi analiz raporu
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
 *                     suppliers:
 *                       type: array
 *                     summary:
 *                       type: object
 *                     rankings:
 *                       type: object
 *                       properties:
 *                         byValue:
 *                           type: array
 *                         byProductCount:
 *                           type: array
 *                         byProfitMargin:
 *                           type: array
 *                         byStockHealth:
 *                           type: array
 */
router.get('/supplier-analysis', getSupplierAnalysis);

/**
 * @swagger
 * /api/reports/export/excel:
 *   get:
 *     summary: Excel formatında rapor indir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [inventory, categories, suppliers, low-stock, all]
 *           default: inventory
 *         description: Rapor tipi
 *     responses:
 *       200:
 *         description: Excel dosyası
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', exportToExcel);

/**
 * @swagger
 * /api/reports/export/csv:
 *   get:
 *     summary: CSV formatında rapor indir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV dosyası
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export/csv', exportToCSV);

// Admin-only routes
router.use(requireAdmin);

// Buraya admin-only rapor route'ları eklenebilir
// Örneğin: Kullanıcı aktivite raporları, sistem logları vb.

module.exports = router;
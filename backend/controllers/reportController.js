const Product = require('../models/Product');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Dashboard KPI'ları
const getDashboardStats = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        
        // Tarih hesaplama
        let dateFilter = {};
        const now = new Date();
        
        switch(period) {
            case '7days':
                dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
                break;
            case '30days':
                dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
                break;
            case '90days':
                dateFilter = { createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
                break;
            case 'all':
                dateFilter = {};
                break;
        }

        // Genel istatistikler
        const generalStats = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                totalValue: { $sum: '$totalValue' },
                                totalCost: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
                                avgPrice: { $avg: '$salePrice' },
                                avgCost: { $avg: '$costPrice' },
                                totalQuantity: { $sum: '$quantity' }
                            }
                        }
                    ],
                    stockStatus: [
                        {
                            $group: {
                                _id: '$stockStatus',
                                count: { $sum: 1 },
                                value: { $sum: '$totalValue' }
                            }
                        }
                    ],
                    topProducts: [
                        { $sort: { totalValue: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                name: 1,
                                code: 1,
                                totalValue: 1,
                                quantity: 1,
                                category: 1
                            }
                        }
                    ],
                    lowStockAlert: [
                        { $match: { stockStatus: { $in: ['low-stock', 'out-of-stock'] } } },
                        { $sort: { quantity: 1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                name: 1,
                                code: 1,
                                quantity: 1,
                                minStock: 1,
                                stockStatus: 1,
                                supplier: 1
                            }
                        }
                    ]
                }
            }
        ]);

        // KPI hesaplamaları
        const overview = generalStats[0].overview[0] || {};
        const potentialRevenue = overview.totalValue || 0;
        const totalCost = overview.totalCost || 0;
        const potentialProfit = potentialRevenue - totalCost;
        const profitMargin = totalCost > 0 ? (potentialProfit / potentialRevenue * 100) : 0;

        // Kategori performansı
        const categoryPerformance = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$category',
                    products: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    avgPrice: { $avg: '$salePrice' },
                    totalQuantity: { $sum: '$quantity' }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        res.json({
            success: true,
            period,
            data: {
                kpis: {
                    totalProducts: overview.totalProducts || 0,
                    totalInventoryValue: overview.totalValue || 0,
                    potentialRevenue,
                    potentialProfit,
                    profitMargin: profitMargin.toFixed(2),
                    avgProductPrice: overview.avgPrice?.toFixed(2) || 0,
                    totalQuantity: overview.totalQuantity || 0
                },
                stockDistribution: generalStats[0].stockStatus,
                topValueProducts: generalStats[0].topProducts,
                lowStockAlerts: generalStats[0].lowStockAlert,
                categoryPerformance,
                lastUpdate: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dashboard verileri alınırken hata oluştu',
            error: error.message
        });
    }
};

// Stok hareket raporu
const getInventoryMovement = async (req, res) => {
    try {
        const { startDate, endDate, category, supplier } = req.query;
        
        // Filtre oluştur
        const filter = { status: 'active' };
        
        if (startDate || endDate) {
            filter.updatedAt = {};
            if (startDate) filter.updatedAt.$gte = new Date(startDate);
            if (endDate) filter.updatedAt.$lte = new Date(endDate);
        }
        
        if (category) filter.category = category;
        if (supplier) filter.supplier = { $regex: supplier, $options: 'i' };

        // Stok hareketleri (şu an için güncelleme tarihlerine bakıyoruz)
        const movements = await Product.find(filter)
            .select('name code quantity minStock stockStatus category supplier updatedAt totalValue')
            .sort({ updatedAt: -1 })
            .limit(100);

        // Özet bilgiler
        const summary = await Product.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalMovements: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    categories: { $addToSet: '$category' },
                    suppliers: { $addToSet: '$supplier' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                movements,
                summary: summary[0] || {},
                filters: { startDate, endDate, category, supplier }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Stok hareketleri alınırken hata oluştu',
            error: error.message
        });
    }
};

// ABC Analizi (Pareto Prensibi)
const getABCAnalysis = async (req, res) => {
    try {
        // Tüm ürünleri değere göre sırala
        const products = await Product.find({ status: 'active' })
            .select('name code category totalValue quantity salePrice')
            .sort({ totalValue: -1 });

        const totalValue = products.reduce((sum, p) => sum + p.totalValue, 0);
        let cumulativeValue = 0;
        let cumulativePercentage = 0;

        // ABC sınıflandırması
        const classifiedProducts = products.map((product, index) => {
            cumulativeValue += product.totalValue;
            cumulativePercentage = (cumulativeValue / totalValue) * 100;
            
            let classification;
            if (cumulativePercentage <= 80) {
                classification = 'A'; // İlk %80 değer
            } else if (cumulativePercentage <= 95) {
                classification = 'B'; // Sonraki %15 değer
            } else {
                classification = 'C'; // Son %5 değer
            }

            return {
                ...product.toObject(),
                classification,
                valuePercentage: ((product.totalValue / totalValue) * 100).toFixed(2),
                cumulativePercentage: cumulativePercentage.toFixed(2),
                rank: index + 1
            };
        });

        // Sınıf özetleri
        const classSummary = {
            A: { count: 0, value: 0, percentage: 0 },
            B: { count: 0, value: 0, percentage: 0 },
            C: { count: 0, value: 0, percentage: 0 }
        };

        classifiedProducts.forEach(product => {
            classSummary[product.classification].count++;
            classSummary[product.classification].value += product.totalValue;
        });

        Object.keys(classSummary).forEach(key => {
            classSummary[key].percentage = ((classSummary[key].value / totalValue) * 100).toFixed(2);
        });

        res.json({
            success: true,
            data: {
                products: classifiedProducts,
                summary: classSummary,
                totalValue,
                insights: {
                    A: 'Yüksek değerli ürünler - Sıkı stok kontrolü gerekli',
                    B: 'Orta değerli ürünler - Normal stok kontrolü',
                    C: 'Düşük değerli ürünler - Basit stok kontrolü yeterli'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'ABC analizi yapılırken hata oluştu',
            error: error.message
        });
    }
};

// Kategori analiz raporu
const getCategoryAnalysis = async (req, res) => {
    try {
        const analysis = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$category',
                    totalProducts: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    totalQuantity: { $sum: '$quantity' },
                    avgPrice: { $avg: '$salePrice' },
                    avgCost: { $avg: '$costPrice' },
                    minPrice: { $min: '$salePrice' },
                    maxPrice: { $max: '$salePrice' },
                    lowStockCount: {
                        $sum: { $cond: [{ $eq: ['$stockStatus', 'low-stock'] }, 1, 0] }
                    },
                    outOfStockCount: {
                        $sum: { $cond: [{ $eq: ['$stockStatus', 'out-of-stock'] }, 1, 0] }
                    },
                    suppliers: { $addToSet: '$supplier' }
                }
            },
            {
                $project: {
                    category: '$_id',
                    totalProducts: 1,
                    totalValue: 1,
                    totalQuantity: 1,
                    avgPrice: { $round: ['$avgPrice', 2] },
                    avgCost: { $round: ['$avgCost', 2] },
                    priceRange: {
                        min: '$minPrice',
                        max: '$maxPrice'
                    },
                    stockHealth: {
                        $round: [{
                            $multiply: [
                                { $divide: [
                                    { $subtract: ['$totalProducts', { $add: ['$lowStockCount', '$outOfStockCount'] }] },
                                    '$totalProducts'
                                ]},
                                100
                            ]
                        }, 2]
                    },
                    lowStockCount: 1,
                    outOfStockCount: 1,
                    supplierCount: { $size: '$suppliers' },
                    avgProfitMargin: {
                        $round: [{
                            $multiply: [
                                { $divide: [
                                    { $subtract: ['$avgPrice', '$avgCost'] },
                                    '$avgPrice'
                                ]},
                                100
                            ]
                        }, 2]
                    }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        // Genel özet
        const totalValue = analysis.reduce((sum, cat) => sum + cat.totalValue, 0);
        const totalProducts = analysis.reduce((sum, cat) => sum + cat.totalProducts, 0);

        res.json({
            success: true,
            data: {
                categories: analysis,
                summary: {
                    totalCategories: analysis.length,
                    totalProducts,
                    totalValue,
                    avgProductsPerCategory: Math.round(totalProducts / analysis.length)
                },
                chartData: {
                    valueDistribution: analysis.map(cat => ({
                        name: cat.category,
                        value: cat.totalValue,
                        percentage: ((cat.totalValue / totalValue) * 100).toFixed(2)
                    })),
                    productDistribution: analysis.map(cat => ({
                        name: cat.category,
                        count: cat.totalProducts
                    }))
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Kategori analizi yapılırken hata oluştu',
            error: error.message
        });
    }
};

// Tedarikçi performans raporu
const getSupplierAnalysis = async (req, res) => {
    try {
        const analysis = await Product.aggregate([
            { $match: { status: 'active', supplier: { $ne: '' } } },
            {
                $group: {
                    _id: '$supplier',
                    totalProducts: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    totalQuantity: { $sum: '$quantity' },
                    avgPrice: { $avg: '$salePrice' },
                    avgCost: { $avg: '$costPrice' },
                    categories: { $addToSet: '$category' },
                    stockStatuses: {
                        $push: '$stockStatus'
                    }
                }
            },
            {
                $project: {
                    supplier: '$_id',
                    totalProducts: 1,
                    totalValue: 1,
                    totalQuantity: 1,
                    avgPrice: { $round: ['$avgPrice', 2] },
                    avgCost: { $round: ['$avgCost', 2] },
                    categoryCount: { $size: '$categories' },
                    categories: 1,
                    stockHealth: {
                        $round: [{
                            $multiply: [
                                { $divide: [
                                    { $size: {
                                        $filter: {
                                            input: '$stockStatuses',
                                            cond: { $eq: ['$$this', 'in-stock'] }
                                        }
                                    }},
                                    { $size: '$stockStatuses' }
                                ]},
                                100
                            ]
                        }, 2]
                    },
                    avgProfitMargin: {
                        $round: [{
                            $multiply: [
                                { $divide: [
                                    { $subtract: ['$avgPrice', '$avgCost'] },
                                    '$avgPrice'
                                ]},
                                100
                            ]
                        }, 2]
                    }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        // En iyi ve en kötü tedarikçiler
        const rankings = {
            byValue: [...analysis].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5),
            byProductCount: [...analysis].sort((a, b) => b.totalProducts - a.totalProducts).slice(0, 5),
            byProfitMargin: [...analysis].sort((a, b) => b.avgProfitMargin - a.avgProfitMargin).slice(0, 5),
            byStockHealth: [...analysis].sort((a, b) => b.stockHealth - a.stockHealth).slice(0, 5)
        };

        res.json({
            success: true,
            data: {
                suppliers: analysis,
                summary: {
                    totalSuppliers: analysis.length,
                    totalValue: analysis.reduce((sum, s) => sum + s.totalValue, 0),
                    avgProductsPerSupplier: Math.round(
                        analysis.reduce((sum, s) => sum + s.totalProducts, 0) / analysis.length
                    )
                },
                rankings
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Tedarikçi analizi yapılırken hata oluştu',
            error: error.message
        });
    }
};

// Excel export
const exportToExcel = async (req, res) => {
    try {
        const { type = 'inventory' } = req.query;
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Stok Takip Sistemi';
        workbook.created = new Date();

        switch(type) {
            case 'inventory':
                await addInventorySheet(workbook);
                break;
            case 'categories':
                await addCategorySheet(workbook);
                break;
            case 'suppliers':
                await addSupplierSheet(workbook);
                break;
            case 'low-stock':
                await addLowStockSheet(workbook);
                break;
            default:
                // Tüm raporları ekle
                await addInventorySheet(workbook);
                await addCategorySheet(workbook);
                await addSupplierSheet(workbook);
                await addLowStockSheet(workbook);
        }

        // Excel dosyasını gönder
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=stok-raporu-${Date.now()}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Excel raporu oluşturulurken hata oluştu',
            error: error.message
        });
    }
};

// Excel sheet helper fonksiyonları
async function addInventorySheet(workbook) {
    const sheet = workbook.addWorksheet('Envanter');
    
    // Başlıklar
    sheet.columns = [
        { header: 'Ürün Kodu', key: 'code', width: 15 },
        { header: 'Ürün Adı', key: 'name', width: 30 },
        { header: 'Kategori', key: 'category', width: 15 },
        { header: 'Miktar', key: 'quantity', width: 10 },
        { header: 'Birim', key: 'unit', width: 10 },
        { header: 'Alış Fiyatı', key: 'costPrice', width: 12 },
        { header: 'Satış Fiyatı', key: 'salePrice', width: 12 },
        { header: 'Toplam Değer', key: 'totalValue', width: 15 },
        { header: 'Stok Durumu', key: 'stockStatus', width: 15 },
        { header: 'Tedarikçi', key: 'supplier', width: 20 }
    ];

    // Başlık satırı stil
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Verileri ekle
    const products = await Product.find({ status: 'active' });
    products.forEach(product => {
        sheet.addRow({
            code: product.code,
            name: product.name,
            category: product.category,
            quantity: product.quantity,
            unit: product.unit,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            totalValue: product.totalValue,
            stockStatus: product.stockStatus,
            supplier: product.supplier || '-'
        });
    });

    // Para formatı
    ['costPrice', 'salePrice', 'totalValue'].forEach(col => {
        sheet.getColumn(col).numFmt = '₺#,##0.00';
    });
}

async function addCategorySheet(workbook) {
    const sheet = workbook.addWorksheet('Kategori Analizi');
    
    sheet.columns = [
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Ürün Sayısı', key: 'count', width: 12 },
        { header: 'Toplam Değer', key: 'value', width: 15 },
        { header: 'Ortalama Fiyat', key: 'avgPrice', width: 15 },
        { header: 'Stok Sağlığı %', key: 'health', width: 15 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    const categories = await Product.aggregate([
        { $match: { status: 'active' } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                value: { $sum: '$totalValue' },
                avgPrice: { $avg: '$salePrice' },
                inStock: {
                    $sum: { $cond: [{ $eq: ['$stockStatus', 'in-stock'] }, 1, 0] }
                }
            }
        }
    ]);

    categories.forEach(cat => {
        sheet.addRow({
            category: cat._id,
            count: cat.count,
            value: cat.value,
            avgPrice: cat.avgPrice,
            health: ((cat.inStock / cat.count) * 100).toFixed(2)
        });
    });

    sheet.getColumn('value').numFmt = '₺#,##0.00';
    sheet.getColumn('avgPrice').numFmt = '₺#,##0.00';
}

async function addSupplierSheet(workbook) {
    const sheet = workbook.addWorksheet('Tedarikçi Analizi');
    
    sheet.columns = [
        { header: 'Tedarikçi', key: 'supplier', width: 25 },
        { header: 'Ürün Sayısı', key: 'count', width: 12 },
        { header: 'Toplam Değer', key: 'value', width: 15 },
        { header: 'Kategoriler', key: 'categories', width: 30 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    const suppliers = await Product.aggregate([
        { $match: { status: 'active', supplier: { $ne: '' } } },
        {
            $group: {
                _id: '$supplier',
                count: { $sum: 1 },
                value: { $sum: '$totalValue' },
                categories: { $addToSet: '$category' }
            }
        }
    ]);

    suppliers.forEach(sup => {
        sheet.addRow({
            supplier: sup._id,
            count: sup.count,
            value: sup.value,
            categories: sup.categories.join(', ')
        });
    });

    sheet.getColumn('value').numFmt = '₺#,##0.00';
}

async function addLowStockSheet(workbook) {
    const sheet = workbook.addWorksheet('Düşük Stok Uyarıları');
    
    sheet.columns = [
        { header: 'Ürün Kodu', key: 'code', width: 15 },
        { header: 'Ürün Adı', key: 'name', width: 30 },
        { header: 'Mevcut Stok', key: 'quantity', width: 12 },
        { header: 'Min. Stok', key: 'minStock', width: 12 },
        { header: 'Durum', key: 'status', width: 15 },
        { header: 'Tedarikçi', key: 'supplier', width: 20 },
        { header: 'Tahmini Kayıp', key: 'loss', width: 15 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' },
        font: { color: { argb: 'FFFFFFFF' } }
    };

    const lowStockProducts = await Product.find({
        status: 'active',
        stockStatus: { $in: ['low-stock', 'out-of-stock'] }
    }).sort({ quantity: 1 });

    lowStockProducts.forEach(product => {
        const row = sheet.addRow({
            code: product.code,
            name: product.name,
            quantity: product.quantity,
            minStock: product.minStock,
            status: product.stockStatus === 'out-of-stock' ? 'STOK YOK' : 'DÜŞÜK STOK',
            supplier: product.supplier || '-',
            loss: product.stockStatus === 'out-of-stock' ? product.salePrice * product.minStock : 0
        });

        // Stok yoksa satırı kırmızı yap
        if (product.stockStatus === 'out-of-stock') {
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' }
            };
        }
    });

    sheet.getColumn('loss').numFmt = '₺#,##0.00';
}

// CSV Export
const exportToCSV = async (req, res) => {
    try {
        const products = await Product.find({ status: 'active' });
        
        // CSV başlıkları
        let csv = 'Ürün Kodu,Ürün Adı,Kategori,Miktar,Birim,Alış Fiyatı,Satış Fiyatı,Toplam Değer,Stok Durumu,Tedarikçi\n';
        
        // Verileri ekle
        products.forEach(product => {
            csv += `"${product.code}","${product.name}","${product.category}",${product.quantity},"${product.unit}",${product.costPrice},${product.salePrice},${product.totalValue},"${product.stockStatus}","${product.supplier || '-'}"\n`;
        });

        // CSV dosyasını gönder
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=stok-raporu-${Date.now()}.csv`);
        res.send('\ufeff' + csv); // UTF-8 BOM ekle
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'CSV raporu oluşturulurken hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getInventoryMovement,
    getABCAnalysis,
    getCategoryAnalysis,
    getSupplierAnalysis,
    exportToExcel,
    exportToCSV
};
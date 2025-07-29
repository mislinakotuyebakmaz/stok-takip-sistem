const Product = require('../models/Product');
const mongoose = require('mongoose');

// Tüm ürünleri getir (filtreleme ile)
const getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            category,
            stockStatus,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            minPrice,
            maxPrice,
            supplier,
            tags,
            barcode
        } = req.query;

        // Filter objesi oluştur
        const filter = { status: 'active' };

        // Kategori filtresi
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Stok durumu filtresi
        if (stockStatus && stockStatus != 'all') {
            if (stockStatus == 'available') {
                filter.stockStatus = { $in: ['in-stock', 'low-stock'] };
            } else {
                filter.stockStatus = stockStatus;
            }
        }

        // Fiyat aralığı filtresi
        if (minPrice || maxPrice) {
            filter.salePrice = {};
            if (minPrice) filter.salePrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.salePrice.$lte = parseFloat(maxPrice);
        }

        // Tedarikçi filtresi
        if (supplier) {
            filter.supplier = { $regex: supplier, $options: 'i' };
        }
         // Tag filtresi
         if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            filter.tags = { $in: tagArray };
        }

        // Barkod filtresi
        if (barcode) {
            filter.barcode = barcode;
        }

        // Arama filtresi (ürün adı, kodu, açıklama)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { supplier: { $regex: search, $options: 'i' } }
            ];
        }

        // Sıralama objesi
        const sort = {};
        if (sortBy === 'profitMargin') {
            // Kar marjına göre sıralama için özel durum
            sort['salePrice'] = sortOrder === 'desc' ? -1 : 1;
        } else {
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }
        // Pagination hesaplaması
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Ürünleri getir
        const products = await Product.find(filter)
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Toplam sayı
        const total = await Product.countDocuments(filter);

        const summary = {
            totalValue: products.reduce((sum, p) => sum + p.totalValue, 0),
            avgPrice: products.length > 0 ? products.reduce((sum, p) => sum + p.salePrice, 0) / products.length : 0,
            lowStockCount: products.filter(p => p.stockStatus === 'low-stock').length,
            outOfStockCount: products.filter(p => p.stockStatus === 'out-of-stock').length
        };

        res.json({
            success: true,
            data: products,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                hasNext: parseInt(page) * parseInt(limit) < total,
                hasPrev: parseInt(page) > 1,
                limit:parseInt(limit)
            },
            filters: {
                category,
                stockStatus,
                search,
                sortBy,
                sortOrder,
                minPrice,
                maxPrice,
                supplier,
                tags
            },
            summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ürünler getirilirken hata oluştu',
            error: error.message
        });
    }
};
// Gelişmiş arama
const searchProducts = async (req, res) => {
    try {
        const { q, fields = 'name,code,description', fuzzy = false } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Arama terimi en az 2 karakter olmalıdır'
            });
        }

        const searchFields = fields.split(',');
        const searchConditions = [];

        // Her alan için arama koşulu oluştur
        searchFields.forEach(field => {
            if (['name', 'code', 'description', 'supplier', 'tags'].includes(field)) {
                if (field === 'tags') {
                    searchConditions.push({ tags: { $in: [new RegExp(q, 'i')] } });
                } else {
                    // Fuzzy search için regex pattern
                    const pattern = fuzzy === 'true' 
                        ? q.split('').join('.*') // h.*e.*l.*l.*o gibi
                        : q;
                    searchConditions.push({ [field]: { $regex: pattern, $options: 'i' } });
                }
            }
        });

        const products = await Product.find({
            status: 'active',
            $or: searchConditions
        })
        .populate('createdBy', 'username')
        .limit(20);

        // Sonuçları skorla (basit scoring)
        const scoredProducts = products.map(product => {
            let score = 0;
            const searchTerm = q.toLowerCase();
            
            // Exact match bonus
            if (product.name.toLowerCase() === searchTerm) score += 10;
            if (product.code.toLowerCase() === searchTerm) score += 8;
            
            // Partial match
            if (product.name.toLowerCase().includes(searchTerm)) score += 5;
            if (product.code.toLowerCase().includes(searchTerm)) score += 4;
            if (product.description.toLowerCase().includes(searchTerm)) score += 2;
            
            return { ...product.toObject(), _score: score };
        });

        // Skora göre sırala
        scoredProducts.sort((a, b) => b._score - a._score);

        res.json({
            success: true,
            query: q,
            count: scoredProducts.length,
            data: scoredProducts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Arama yapılırken hata oluştu',
            error: error.message
        });
    }
};

// Düşük stoklu ürünleri getir
const getLowStockProducts = async (req, res) => {
    try {
        const { limit = 20, includeOutOfStock = false } = req.query;
        
        const stockStatuses = includeOutOfStock === 'true' 
            ? ['low-stock', 'out-of-stock'] 
            : ['low-stock'];

        const products = await Product.find({
            status: 'active',
            stockStatus: { $in: stockStatuses }
        })
        .populate('createdBy', 'username')
        .sort({ quantity: 1 })
        .limit(parseInt(limit));

        const categorySummary = {};
        products.forEach(product => {
            if (!categorySummary[product.category]) {
                categorySummary[product.category] = {
                    count: 0,
                    totalValue: 0,
                    products: []
                };
            }
            categorySummary[product.category].count++;
            categorySummary[product.category].totalValue += product.totalValue;
            categorySummary[product.category].products.push({
                name: product.name,
                code: product.code,
                quantity: product.quantity,
                minStock: product.minStock
            });
        });

        res.json({
            success: true,
            count: products.length,
            data: products,
            summary: {
                totalProducts: products.length,
                totalValue: products.reduce((sum, p) => sum + p.totalValue, 0),
                byCategory: categorySummary,
                criticalProducts: products.filter(p => p.quantity === 0).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Düşük stoklu ürünler getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Stokta olmayan ürünleri getir
const getOutOfStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            status: 'active',
            stockStatus: 'out-of-stock'
        })
        .populate('createdBy', 'username')
        .sort({ updatedAt: -1 });

        // Tedarikçi bazlı gruplama
        const bySupplier = {};
        products.forEach(product => {
            const supplierName = product.supplier || 'Belirtilmemiş';
            if (!bySupplier[supplierName]) {
                bySupplier[supplierName] = {
                    count: 0,
                    products: [],
                    totalLoss: 0 // Potansiyel kayıp
                };
            }
            bySupplier[supplierName].count++;
            bySupplier[supplierName].products.push({
                name: product.name,
                code: product.code,
                salePrice: product.salePrice
            });
            bySupplier[supplierName].totalLoss += product.salePrice * product.minStock;
        });

        res.json({
            success: true,
            count: products.length,
            data: products,
            analysis: {
                totalOutOfStock: products.length,
                bySupplier,
                estimatedLoss: products.reduce((sum, p) => sum + (p.salePrice * p.minStock), 0),
                categories: [...new Set(products.map(p => p.category))]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Stokta olmayan ürünler getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Kategorileri getir
const getCategories = async (req, res) => {
    try {
        const categories = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    avgPrice: { $avg: '$salePrice' },
                    lowStockCount: {
                        $sum: { $cond: [{ $eq: ['$stockStatus', 'low-stock'] }, 1, 0] }
                    },
                    outOfStockCount: {
                        $sum: { $cond: [{ $eq: ['$stockStatus', 'out-of-stock'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    category: '$_id',
                    count: 1,
                    totalValue: 1,
                    avgPrice: { $round: ['$avgPrice', 2] },
                    lowStockCount: 1,
                    outOfStockCount: 1,
                    stockHealth: {
                        $round: [{
                            $multiply: [
                                { $divide: [
                                    { $subtract: ['$count', { $add: ['$lowStockCount', '$outOfStockCount'] }] },
                                    '$count'
                                ]},
                                100
                            ]
                        }, 2]
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Kategoriler getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Markaları/Tedarikçileri getir
const getBrands = async (req, res) => {
    try {
        const brands = await Product.aggregate([
            { $match: { status: 'active', supplier: { $ne: '' } } },
            {
                $group: {
                    _id: '$supplier',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' },
                    categories: { $addToSet: '$category' }
                }
            },
            {
                $project: {
                    brand: '$_id',
                    count: 1,
                    totalValue: 1,
                    categories: 1,
                    avgProductValue: { $round: [{ $divide: ['$totalValue', '$count'] }, 2] }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            count: brands.length,
            data: brands
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Fiyat aralığına göre ürünleri getir
const getProductsByPriceRange = async (req, res) => {
    try {
        const priceRanges = [
            { label: '0-50 TL', min: 0, max: 50 },
            { label: '50-100 TL', min: 50, max: 100 },
            { label: '100-250 TL', min: 100, max: 250 },
            { label: '250-500 TL', min: 250, max: 500 },
            { label: '500-1000 TL', min: 500, max: 1000 },
            { label: '1000+ TL', min: 1000, max: Infinity }
        ];

        const distribution = await Promise.all(
            priceRanges.map(async (range) => {
                const filter = {
                    status: 'active',
                    salePrice: { $gte: range.min }
                };
                
                if (range.max !== Infinity) {
                    filter.salePrice.$lt = range.max;
                }

                const products = await Product.find(filter);
                
                return {
                    range: range.label,
                    count: products.length,
                    totalValue: products.reduce((sum, p) => sum + p.totalValue, 0),
                    avgStock: products.length > 0 
                        ? Math.round(products.reduce((sum, p) => sum + p.quantity, 0) / products.length)
                        : 0
                };
            })
        );

        res.json({
            success: true,
            data: distribution.filter(d => d.count > 0)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Fiyat dağılımı getirilirken hata oluştu',
            error: error.message
        });
    }
};


// Tek ürün getir
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün ID'
            });
        }

        const product = await Product.findById(id)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
         // İlgili ürünleri bul (aynı kategori)
         const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            status: 'active'
        })
        .limit(5)
        .select('name code salePrice stockStatus images');

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ürün getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Yeni ürün oluştur (Admin only)
const createProduct = async (req, res) => {
    try {
        const productData = {
            ...req.body,
            createdBy: req.user.userId
        };

        // Ürün kodu benzersizlik kontrolü
        const existingProduct = await Product.findOne({ 
            code: productData.code.toUpperCase() 
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Bu ürün kodu zaten kullanılıyor'
            });
        }

        const product = new Product(productData);
        await product.save();

        // Populate edilmiş halini döndür
        const populatedProduct = await Product.findById(product._id)
            .populate('createdBy', 'username');

        res.status(201).json({
            success: true,
            message: 'Ürün başarıyla oluşturuldu',
            data: populatedProduct
        });
    } catch (error) {
        // Validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Veri doğrulama hatası',
                errors: validationErrors
            });
        }

        // Duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `Bu ${field} zaten kullanılıyor`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ürün oluşturulurken hata oluştu',
            error: error.message
        });
    }
};

// Ürün güncelle (Admin only)
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün ID'
            });
        }

        const updateData = {
            ...req.body,
            updatedBy: req.user.userId
        };

        // Ürün kodu değiştiriliyorsa benzersizlik kontrolü
        if (updateData.code) {
            const existingProduct = await Product.findOne({ 
                code: updateData.code.toUpperCase(),
                _id: { $ne: id }
            });

            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu ürün kodu zaten kullanılıyor'
                });
            }
        }

        const product = await Product.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true 
            }
        ).populate('createdBy updatedBy', 'username');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Ürün başarıyla güncellendi',
            data: product
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Veri doğrulama hatası',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ürün güncellenirken hata oluştu',
            error: error.message
        });
    }
};

// Ürün sil (Admin only)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün ID'
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Soft delete (status'ü inactive yap)
        product.status = 'inactive';
        product.updatedBy = req.user.userId;
        await product.save();

        res.json({
            success: true,
            message: 'Ürün başarıyla silindi',
            data: { id: product._id }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ürün silinirken hata oluştu',
            error: error.message
        });
    }
};

// Dashboard istatistikleri
const getStatistics = async (req, res) => {
    try {
        const stats = await Product.getStatistics();
        
        // Kategori dağılımı
        const categoryStats = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Son eklenen ürünler
        const recentProducts = await Product.find({ status: 'active' })
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name code category quantity stockStatus createdAt');

               // Stok durumu özeti
        const stockSummary = await Product.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$stockStatus',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalValue' }
                }
            }
        ]);

        // En değerli ürünler
        const topValueProducts = await Product.find({ status: 'active' })
            .sort({ totalValue: -1 })
            .limit(5)
            .select('name code totalValue quantity salePrice');

        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalProducts: 0,
                    totalValue: 0,
                    avgPrice: 0,
                    lowStockCount: 0,
                    outOfStockCount: 0
                },
                categoryDistribution: categoryStats,
                stockSummary,
                recentProducts,
                topValueProducts,
                lastUpdate: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'İstatistikler getirilirken hata oluştu',
            error: error.message
        });
    }
};

// Stok güncelleme (Admin only)
const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body; // operation: 'set', 'add', 'subtract'

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ürün ID'
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        let newQuantity;

        switch (operation) {
            case 'set':
                newQuantity = parseInt(quantity);
                break;
            case 'add':
                newQuantity = product.quantity + parseInt(quantity);
                break;
            case 'subtract':
                newQuantity = product.quantity - parseInt(quantity);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz işlem türü'
                });
        }

        if (newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Stok miktarı negatif olamaz'
            });
        }

        product.quantity = newQuantity;
        product.updatedBy = req.user.userId;
        await product.save();

        res.json({
            success: true,
            message: 'Stok başarıyla güncellendi',
            data: {
                product,
                stockChange: {
                    oldQuantity,
                    newQuantity,
                    difference: newQuantity - oldQuantity,
                    operation,
                    note,
                    updatedBy: req.user.username,
                    updatedAt: new Date()
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Stok güncellenirken hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
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
};
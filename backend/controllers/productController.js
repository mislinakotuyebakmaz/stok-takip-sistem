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
            supplier
        } = req.query;

        // Filter objesi oluştur
        const filter = { status: 'active' };

        // Kategori filtresi
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Stok durumu filtresi
        if (stockStatus && stockStatus !== 'all') {
            filter.stockStatus = stockStatus;
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

        // Arama filtresi (ürün adı, kodu, açıklama)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sıralama objesi
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

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

        res.json({
            success: true,
            data: products,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                hasNext: parseInt(page) * parseInt(limit) < total,
                hasPrev: parseInt(page) > 1
            },
            filters: {
                category,
                stockStatus,
                search,
                sortBy,
                sortOrder
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ürünler getirilirken hata oluştu',
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
                recentProducts
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
            data: product
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
    updateStock
};
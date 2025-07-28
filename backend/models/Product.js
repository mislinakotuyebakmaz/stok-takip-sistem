const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Ürün kodu gerekli'],
        unique: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z0-9]{3,10}$/, 'Ürün kodu 3-10 karakter arası, sadece büyük harf ve rakam olmalı']
    },
    name: {
        type: String,
        required: [true, 'Ürün adı gerekli'],
        trim: true,
        minlength: [2, 'Ürün adı en az 2 karakter olmalı'],
        maxlength: [100, 'Ürün adı en fazla 100 karakter olabilir']
    },
    category: {
        type: String,
        required: [true, 'Kategori gerekli'],
        enum: {
            values: ['Elektronik', 'Giyim', 'Ev & Bahçe', 'Spor', 'Kitap', 'Kozmetik', 'Gıda', 'Oyuncak', 'Diğer'],
            message: 'Geçersiz kategori seçimi'
        }
    },
    description: {
        type: String,
        maxlength: [500, 'Açıklama en fazla 500 karakter olabilir'],
        default: ''
    },
    quantity: {
        type: Number,
        required: [true, 'Stok miktarı gerekli'],
        min: [0, 'Stok miktarı negatif olamaz'],
        validate: {
            validator: Number.isInteger,
            message: 'Stok miktarı tam sayı olmalı'
        }
    },
    unit: {
        type: String,
        required: [true, 'Birim gerekli'],
        enum: {
            values: ['adet', 'kg', 'gram', 'litre', 'ml', 'metre', 'cm', 'paket'],
            message: 'Geçersiz birim seçimi'
        },
        default: 'adet'
    },
    minStock: {
        type: Number,
        min: [0, 'Minimum stok negatif olamaz'],
        default: 10,
        validate: {
            validator: Number.isInteger,
            message: 'Minimum stok tam sayı olmalı'
        }
    },
    costPrice: {
        type: Number,
        required: [true, 'Alış fiyatı gerekli'],
        min: [0, 'Alış fiyatı negatif olamaz']
    },
    salePrice: {
        type: Number,
        required: [true, 'Satış fiyatı gerekli'],
        min: [0, 'Satış fiyatı negatif olamaz'],
        validate: {
            validator: function(value) {
                return value >= this.costPrice;
            },
            message: 'Satış fiyatı alış fiyatından küçük olamaz'
        }
    },
    supplier: {
        type: String,
        maxlength: [100, 'Tedarikçi adı en fazla 100 karakter olabilir'],
        default: ''
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true, // Null değerlere unique constraint uygulanmaz
        match: [/^\d{8,13}$/, 'Barkod 8-13 haneli rakam olmalı']
    },
    tags: [{
        type: String,
        maxlength: [30, 'Tag en fazla 30 karakter olabilir']
    }],
    images: [{
        url: String,
        alt: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued'],
        default: 'active'
    },
    // Otomatik hesaplanan alanlar
    totalValue: {
        type: Number,
        default: function() {
            return this.quantity * this.salePrice;
        }
    },
    stockStatus: {
        type: String,
        enum: ['in-stock', 'low-stock', 'out-of-stock'],
        default: function() {
            if (this.quantity === 0) return 'out-of-stock';
            if (this.quantity <= this.minStock) return 'low-stock';
            return 'in-stock';
        }
    },
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true, // createdAt, updatedAt otomatik
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields (hesaplanan alanlar)
productSchema.virtual('profitMargin').get(function() {
    if (this.costPrice === 0) return 0;
    return ((this.salePrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

productSchema.virtual('profitAmount').get(function() {
    return this.salePrice - this.costPrice;
});

productSchema.virtual('isLowStock').get(function() {
    return this.quantity <= this.minStock;
});

productSchema.virtual('daysInInventory').get(function() {
    const diffTime = new Date() - this.createdAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes for better performance
productSchema.index({ code: 1 });
productSchema.index({ category: 1 });
productSchema.index({ stockStatus: 1 });
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ createdAt: -1 });

// Pre-save middleware
productSchema.pre('save', function(next) {
    // totalValue hesapla
    this.totalValue = this.quantity * this.salePrice;
    
    // stockStatus hesapla
    if (this.quantity === 0) {
        this.stockStatus = 'out-of-stock';
    } else if (this.quantity <= this.minStock) {
        this.stockStatus = 'low-stock';
    } else {
        this.stockStatus = 'in-stock';
    }
    
    next();
});

// Static methods
productSchema.statics.findByCategory = function(category) {
    return this.find({ category, status: 'active' });
};

productSchema.statics.findLowStock = function() {
    return this.find({ stockStatus: 'low-stock', status: 'active' });
};

productSchema.statics.findOutOfStock = function() {
    return this.find({ stockStatus: 'out-of-stock', status: 'active' });
};

productSchema.statics.getStatistics = function() {
    return this.aggregate([
        { $match: { status: 'active' } },
        {
            $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalValue: { $sum: '$totalValue' },
                avgPrice: { $avg: '$salePrice' },
                lowStockCount: {
                    $sum: { $cond: [{ $eq: ['$stockStatus', 'low-stock'] }, 1, 0] }
                },
                outOfStockCount: {
                    $sum: { $cond: [{ $eq: ['$stockStatus', 'out-of-stock'] }, 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Product', productSchema);
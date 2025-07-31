const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/upload');

// Tek ürün resmi yükleme
const uploadProductImage = async (req, res) => {
    try {
        const { productId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir resim dosyası seçin'
            });
        }

        // Ürünü bul
        const product = await Product.findById(productId);
        if (!product) {
            // Yüklenen dosyayı sil
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Resmi optimize et (Sharp ile)
        const optimizedImagePath = path.join(
            path.dirname(req.file.path),
            'optimized-' + req.file.filename
        );

        await sharp(req.file.path)
            .resize(800, 800, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toFile(optimizedImagePath);

        // Orijinal dosyayı sil
        fs.unlinkSync(req.file.path);

        let imageData;

        // Production'da Cloudinary kullan
        if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
            imageData = await uploadToCloudinary(optimizedImagePath, 'products');
        } else {
            // Development'ta local kullan
            imageData = {
                url: `/uploads/products/${path.basename(optimizedImagePath)}`,
                path: optimizedImagePath,
                size: fs.statSync(optimizedImagePath).size
            };
        }

        // Eski resimleri kontrol et ve sil
        if (product.images && product.images.length > 0) {
            // Maksimum 5 resim tut
            if (product.images.length >= 5) {
                const oldImage = product.images.shift();
                
                // Cloudinary'den sil
                if (oldImage.publicId) {
                    await deleteFromCloudinary(oldImage.publicId);
                }
                // Local'den sil
                else if (oldImage.path && fs.existsSync(oldImage.path)) {
                    fs.unlinkSync(oldImage.path);
                }
            }
        }

        // Yeni resmi ekle
        if (!product.images) {
            product.images = [];
        }

        product.images.push({
            url: imageData.url,
            publicId: imageData.publicId || null,
            isPrimary: product.images.length === 0, // İlk resim primary
            uploadedAt: new Date()
        });

        await product.save();

        res.json({
            success: true,
            message: 'Resim başarıyla yüklendi',
            data: {
                image: imageData,
                product: {
                    id: product._id,
                    name: product.name,
                    images: product.images
                }
            }
        });

    } catch (error) {
        // Hata durumunda dosyaları temizle
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Resim yüklenirken hata oluştu',
            error: error.message
        });
    }
};

// Birden fazla resim yükleme
const uploadMultipleProductImages = async (req, res) => {
    try {
        const { productId } = req.params;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen en az bir resim dosyası seçin'
            });
        }

        // Ürünü bul
        const product = await Product.findById(productId);
        if (!product) {
            // Yüklenen dosyaları sil
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        const uploadedImages = [];

        // Her resmi işle
        for (const file of req.files) {
            try {
                // Optimize et
                const optimizedImagePath = path.join(
                    path.dirname(file.path),
                    'optimized-' + file.filename
                );

                await sharp(file.path)
                    .resize(800, 800, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 85 })
                    .toFile(optimizedImagePath);

                // Orijinali sil
                fs.unlinkSync(file.path);

                let imageData;

                // Upload to storage
                if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
                    imageData = await uploadToCloudinary(optimizedImagePath, 'products');
                } else {
                    imageData = {
                        url: `/uploads/products/${path.basename(optimizedImagePath)}`,
                        path: optimizedImagePath,
                        size: fs.statSync(optimizedImagePath).size
                    };
                }

                uploadedImages.push(imageData);

            } catch (err) {
                console.error('Resim işleme hatası:', err);
                // Hatalı dosyayı sil ve devam et
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        // Resimleri ürüne ekle
        if (!product.images) {
            product.images = [];
        }

        uploadedImages.forEach((image, index) => {
            product.images.push({
                url: image.url,
                publicId: image.publicId || null,
                isPrimary: product.images.length === 0 && index === 0,
                uploadedAt: new Date()
            });
        });

        // Maksimum 10 resim sınırı
        if (product.images.length > 10) {
            // Eski resimleri sil
            const imagesToDelete = product.images.splice(0, product.images.length - 10);
            
            for (const img of imagesToDelete) {
                if (img.publicId) {
                    await deleteFromCloudinary(img.publicId);
                } else if (img.path && fs.existsSync(img.path)) {
                    fs.unlinkSync(img.path);
                }
            }
        }

        await product.save();

        res.json({
            success: true,
            message: `${uploadedImages.length} resim başarıyla yüklendi`,
            data: {
                uploadedCount: uploadedImages.length,
                images: uploadedImages,
                product: {
                    id: product._id,
                    name: product.name,
                    totalImages: product.images.length
                }
            }
        });

    } catch (error) {
        // Cleanup on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Resimler yüklenirken hata oluştu',
            error: error.message
        });
    }
};

// Ürün resmini sil
const deleteProductImage = async (req, res) => {
    try {
        const { productId, imageId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Resmi bul
        const imageIndex = product.images.findIndex(img => img._id.toString() === imageId);
        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Resim bulunamadı'
            });
        }

        const image = product.images[imageIndex];

        // Storage'dan sil
        if (image.publicId) {
            await deleteFromCloudinary(image.publicId);
        } else if (image.path && fs.existsSync(image.path)) {
            fs.unlinkSync(image.path);
        }

        // Array'den kaldır
        product.images.splice(imageIndex, 1);

        // Eğer silinen primary ise, yeni primary belirle
        if (image.isPrimary && product.images.length > 0) {
            product.images[0].isPrimary = true;
        }

        await product.save();

        res.json({
            success: true,
            message: 'Resim başarıyla silindi',
            data: {
                deletedImageId: imageId,
                remainingImages: product.images.length
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Resim silinirken hata oluştu',
            error: error.message
        });
    }
};

// Primary resmi değiştir
const setPrimaryImage = async (req, res) => {
    try {
        const { productId, imageId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Tüm resimlerin primary özelliğini kaldır
        product.images.forEach(img => {
            img.isPrimary = false;
        });

        // Yeni primary'yi belirle
        const image = product.images.find(img => img._id.toString() === imageId);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Resim bulunamadı'
            });
        }

        image.isPrimary = true;
        await product.save();

        res.json({
            success: true,
            message: 'Ana resim başarıyla güncellendi',
            data: {
                productId,
                primaryImageId: imageId
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ana resim güncellenirken hata oluştu',
            error: error.message
        });
    }
};

// Tüm resimleri getir
const getProductImages = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId)
            .select('name code images');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            data: {
                product: {
                    id: product._id,
                    name: product.name,
                    code: product.code
                },
                images: product.images || [],
                totalImages: product.images ? product.images.length : 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Resimler getirilirken hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    uploadProductImage,
    uploadMultipleProductImages,
    deleteProductImage,
    setPrimaryImage,
    getProductImages
};
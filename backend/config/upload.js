const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload dizinini oluştur
const uploadDir = 'uploads/products';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Unique filename oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        
        // Türkçe karakterleri düzelt
        const cleanName = name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
        
        cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
    }
});

// File filter - sadece resim dosyaları
const imageFileFilter = (req, file, cb) => {
    // İzin verilen dosya tipleri
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir (jpeg, jpg, png, gif, webp)'));
    }
};

// Excel/CSV file filter
const excelFileFilter = (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv',
        'application/csv'
    ];
    
    if (extname && allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
    } else {
        cb(new Error('Sadece Excel (xlsx, xls) veya CSV dosyaları yüklenebilir'));
    }
};

// Multer instance'ları
const uploadProductImage = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const uploadExcelFile = multer({
    storage: storage,
    fileFilter: excelFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Cloudinary config (opsiyonel - production için)
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary'ye upload fonksiyonu
const uploadToCloudinary = async (filePath, folder = 'products') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `stok-takip/${folder}`,
            resource_type: 'auto',
            transformation: [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });
        
        // Local dosyayı sil
        fs.unlinkSync(filePath);
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
        };
    } catch (error) {
        // Hata durumunda local dosyayı sil
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

// Cloudinary'den silme fonksiyonu
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Cloudinary silme hatası:', error);
        throw error;
    }
};

module.exports = {
    uploadProductImage,
    uploadExcelFile,
    uploadToCloudinary,
    deleteFromCloudinary,
    uploadDir
};
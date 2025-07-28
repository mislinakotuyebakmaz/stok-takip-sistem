const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Kullanıcı adı gerekli'],
        unique: true,
        trim: true,
        minlength: [3, 'Kullanıcı adı en az 3 karakter olmalı'],
        maxlength: [30, 'Kullanıcı adı en fazla 30 karakter olabilir']
    },
    email: {
        type: String,
        required: [true, 'Email gerekli'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli email adresi girin']
    },
    password: {
        type: String,
        required: [true, 'Şifre gerekli'],
        minlength: [6, 'Şifre en az 6 karakter olmalı']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // createdAt, updatedAt otomatik eklenir
});

// Şifre hashleme middleware
userSchema.pre('save', async function(next) {
    // Şifre değişmemişse skip et
    if (!this.isModified('password')) return next();
    
    try {
        // Şifreyi hashle
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Şifre karşılaştırma metodu
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// JSON'da şifreyi gizle
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);
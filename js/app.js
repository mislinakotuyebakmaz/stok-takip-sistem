
// stok takip - JavaScript

// Tüm confirm'leri devre dışı bırak
window.confirm = function(message) {
    console.log('Confirm engellendi:', message);
    return false; // Hiçbir confirm çalışmasın
};

// Global filter state
const filterState = {
    categories: [],
    stockStatus: [],
    search: '',
    priceRange: { min: 0, max: 999999 },
    dateRange: { start: null, end: null }
};

// Multi-select component class
class MultiSelect {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.dropdown = this.container.querySelector('.multi-select-dropdown');
        this.input = this.container.querySelector('.multi-select-input');
        this.placeholder = this.input.querySelector('.placeholder');
        this.selectedValues = [];
        this.options = options;
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Input click event
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Checkbox change events
        this.dropdown.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleCheckboxChange(e.target);
            }
        });
        
        // Select all functionality
        const selectAllCheckbox = this.dropdown.querySelector('[id^="selectAll"]');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }
    
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.dropdown.classList.add('show');
        this.input.classList.add('active');
    }
    
    close() {
        this.isOpen = false;
        this.dropdown.classList.remove('show');
        this.input.classList.remove('active');
    }
    
    handleCheckboxChange(checkbox) {
        const value = checkbox.value;
        
        if (checkbox.checked) {
            if (!this.selectedValues.includes(value)) {
                this.selectedValues.push(value);
            }
        } else {
            this.selectedValues = this.selectedValues.filter(v => v !== value);
        }
        
        this.updateDisplay();
        this.triggerChange();
    }
    
    handleSelectAll(checked) {
        const checkboxes = this.dropdown.querySelectorAll('input[type="checkbox"]:not([id^="selectAll"])');
        
        if (checked) {
            this.selectedValues = [];
            checkboxes.forEach(cb => {
                cb.checked = true;
                this.selectedValues.push(cb.value);
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
            });
            this.selectedValues = [];
        }
        
        this.updateDisplay();
        this.triggerChange();
    }
    
    updateDisplay() {
        if (this.selectedValues.length === 0) {
            this.placeholder.textContent = this.options.placeholder || 'Seçim yapın...';
            this.placeholder.className = 'placeholder';
        } else if (this.selectedValues.length === 1) {
            this.placeholder.textContent = this.selectedValues[0];
            this.placeholder.className = 'selected-count';
        } else {
            this.placeholder.textContent = `${this.selectedValues.length} seçim yapıldı`;
            this.placeholder.className = 'selected-count';
        }
    }
    
    triggerChange() {
        // Trigger custom change event
        const event = new CustomEvent('multiSelectChange', {
            detail: {
                selectedValues: this.selectedValues,
                type: this.options.type
            }
        });
        document.dispatchEvent(event);
    }
    
    clear() {
        this.selectedValues = [];
        const checkboxes = this.dropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateDisplay();
        this.triggerChange();
    }
    
    getSelectedValues() {
        return this.selectedValues;
    }
}

// Initialize multi-select components
let categoryMultiSelect, stockStatusMultiSelect;

function initializeMultiSelect() {
    console.log('Initializing multi-select components...'); // Debug
    
    // Biraz gecikme ile elementleri bul
    setTimeout(() => {
        const categoryContainer = document.getElementById('categoryMultiSelect');
        const stockContainer = document.getElementById('stockStatusMultiSelect');
        
        console.log('Category container found:', !!categoryContainer); // Debug
        console.log('Stock container found:', !!stockContainer); // Debug
        
        if (categoryContainer) {
            categoryMultiSelect = new MultiSelect('categoryMultiSelect', {
                placeholder: 'Kategori seçin...',
                type: 'category'
            });
        }
        
        if (stockContainer) {
            stockStatusMultiSelect = new MultiSelect('stockStatusMultiSelect', {
                placeholder: 'Stok durumu seçin...',
                type: 'stockStatus'
            });
        }
        
        // Listen for multi-select changes
        document.addEventListener('multiSelectChange', handleMultiSelectChange);
        
        console.log('Multi-select components initialized'); // Debug
    }, 200);
}

function handleMultiSelectChange(event) {
    console.log('Multi-select changed:', event.detail); // Debug
    
    const { selectedValues, type } = event.detail;
    
    if (type === 'category') {
        filterState.categories = selectedValues;
    } else if (type === 'stockStatus') {
        filterState.stockStatus = selectedValues;
    }
    
    updateFilterChips();
    applyFilters();
}

// Filter chips management
function updateFilterChips() {
    const chipsContainer = document.getElementById('filterChips');
    if (!chipsContainer) return;
    
    chipsContainer.innerHTML = '';
    
    // Category chips
    filterState.categories.forEach(category => {
        const chip = createFilterChip(category, 'category');
        chipsContainer.appendChild(chip);
    });
    
    // Stock status chips
    filterState.stockStatus.forEach(status => {
        const statusText = getStockStatusText(status);
        const chip = createFilterChip(statusText, 'stockStatus', status);
        chipsContainer.appendChild(chip);
    });
    
    // Search chip
    if (filterState.search) {
        const chip = createFilterChip(`"${filterState.search}"`, 'search');
        chipsContainer.appendChild(chip);
    }
    
    // Show/hide selected filters section
    const selectedFiltersSection = document.getElementById('selectedFilters');
    const hasFilters = filterState.categories.length > 0 || 
                      filterState.stockStatus.length > 0 || 
                      filterState.search;
    
    if (selectedFiltersSection) {
        selectedFiltersSection.style.display = hasFilters ? 'block' : 'none';
    }
}
// Kritik stok için admin kontrolü
function requestAdminForCriticalStock(productCode, productName) {
    console.log(`🔒 Kritik stok düzenleme talebi: ${productCode} - ${productName}`);
    
    // Admin kontrolü
    if (!adminAuthenticated) {
        // Admin modal'ı aç
        openAdminModal('editCriticalStock', productCode, `${productName} Düzenle`);
        return;
    }
    
    // Admin doğrulandıysa direkt düzenleme yapabilir
    editCriticalStockProduct(productCode, productName);
}

// Kritik stok ürünü düzenleme
function editCriticalStockProduct(productCode, productName) {
    console.log(`✏️ Kritik stok ürünü düzenleniyor: ${productCode}`);
    
    if (!inventory) {
        alert('❌ Envanter sistemi bulunamadı!');
        return;
    }
    
    // Ürün koduna göre ürünü bul
    const product = inventory.products.find(p => p.code === productCode);
    
    if (!product) {
        alert(`❌ ${productCode} kodlu ürün bulunamadı!`);
        return;
    }
    
    // inventory.editProduct fonksiyonunu çağır
    inventory.editProduct(product.id);
}

function createFilterChip(text, type, value = null) {
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    chip.innerHTML = `
        <span>${text}</span>
        <button class="remove-chip" onclick="removeFilterChip('${type}', '${value || text}')">×</button>
    `;
    return chip;
}

function removeFilterChip(type, value) {
    switch(type) {
        case 'category':
            filterState.categories = filterState.categories.filter(c => c !== value);
            categoryMultiSelect.selectedValues = filterState.categories;
            categoryMultiSelect.updateDisplay();
            // Update checkboxes
            updateMultiSelectCheckboxes('categoryDropdown', filterState.categories);
            break;
        case 'stockStatus':
            filterState.stockStatus = filterState.stockStatus.filter(s => s !== value);
            stockStatusMultiSelect.selectedValues = filterState.stockStatus;
            stockStatusMultiSelect.updateDisplay();
            // Update checkboxes
            updateMultiSelectCheckboxes('stockStatusDropdown', filterState.stockStatus);
            break;
        case 'search':
            filterState.search = '';
            document.getElementById('searchProducts').value = '';
            break;
    }
    
    updateFilterChips();
    applyFilters();
}

function updateMultiSelectCheckboxes(dropdownId, selectedValues) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([id^="selectAll"])');
    checkboxes.forEach(cb => {
        cb.checked = selectedValues.includes(cb.value);
    });
}

function getStockStatusText(status) {
    switch(status) {
        case 'in-stock': return 'Stokta Var';
        case 'low-stock': return 'Düşük Stok';
        case 'out-of-stock': return 'Stokta Yok';
        default: return status;
    }
}

// Apply filters to products
function applyFilters() {
    if (!inventory) return;
    
    if (inventory.currentTab === 'products') {
        const filters = {
            categories: filterState.categories,
            stockStatus: filterState.stockStatus,
            search: filterState.search
        };
    
    inventory.renderProductsTableWithAdvancedFilters(filters);
    }
}

// Clear all filters
function clearAllFilters() {
    filterState.categories = [];
    filterState.stockStatus = [];
    filterState.search = '';
    
    // Clear multi-selects
    if (categoryMultiSelect) categoryMultiSelect.clear();
    if (stockStatusMultiSelect) stockStatusMultiSelect.clear();
    
    // Clear search input
    document.getElementById('searchProducts').value = '';
    
    updateFilterChips();
    applyFilters();
}

// Quick filters
function initializeQuickFilters() {
    console.log('Initializing quick filters...'); // Debug
    
    // Biraz gecikme ile butonları bul
    setTimeout(() => {
        const quickFilterButtons = document.querySelectorAll('.quick-filter-btn');
        console.log('Found quick filter buttons:', quickFilterButtons.length); // Debug
        
        quickFilterButtons.forEach(btn => {
            // Mevcut event listener'ları temizle
            btn.removeEventListener('click', handleQuickFilterClick);
            // Yeni event listener ekle
            btn.addEventListener('click', handleQuickFilterClick);
        });
    }, 100);
}

function handleQuickFilterClick() {
    const filterType = this.dataset.filter;
    console.log('Quick filter button clicked:', filterType); // Debug
    
    // Toggle active state
    this.classList.toggle('active');
    
    applyQuickFilter(filterType, this.classList.contains('active'));
}

function applyQuickFilter(filterType, isActive) {
    console.log('Quick filter clicked:', filterType, isActive); // Debug
    
    switch(filterType) {
        case 'low-stock':
            if (isActive) {
                if (!filterState.stockStatus.includes('low-stock')) {
                    filterState.stockStatus.push('low-stock');
                }
            } else {
                filterState.stockStatus = filterState.stockStatus.filter(s => s !== 'low-stock');
            }
            // Multi-select'i güncelle
            if (stockStatusMultiSelect) {
                stockStatusMultiSelect.selectedValues = filterState.stockStatus;
                stockStatusMultiSelect.updateDisplay();
                updateMultiSelectCheckboxes('stockStatusDropdown', filterState.stockStatus);
            }
            break;
            
        case 'out-of-stock':
            if (isActive) {
                if (!filterState.stockStatus.includes('out-of-stock')) {
                    filterState.stockStatus.push('out-of-stock');
                }
            } else {
                filterState.stockStatus = filterState.stockStatus.filter(s => s !== 'out-of-stock');
            }
            // Multi-select'i güncelle
            if (stockStatusMultiSelect) {
                stockStatusMultiSelect.selectedValues = filterState.stockStatus;
                stockStatusMultiSelect.updateDisplay();
                updateMultiSelectCheckboxes('stockStatusDropdown', filterState.stockStatus);
            }
            break;
            
        case 'high-value':
            // Yüksek değerli ürünler (>1000 TL)
            if (isActive) {
                filterState.priceRange = { min: 1000, max: 999999 };
            } else {
                filterState.priceRange = { min: 0, max: 999999 };
            }
            break;
            
        case 'recent':
            // Son 7 gün içinde eklenen ürünler
            if (isActive) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filterState.dateRange = { 
                    start: sevenDaysAgo.toISOString(), 
                    end: new Date().toISOString() 
                };
            } else {
                filterState.dateRange = { start: null, end: null };
            }
            break;
    }
    
    updateFilterChips();
    applyFilters();
}



// Initialize clear all filters button
function initializeClearAllFilters() {
    const clearAllBtn = document.getElementById('clearAllFilters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }
}

// Validation kuralları
const validationRules = {
    productCode: {
        required: true,
        pattern: /^[A-Z0-9]{3,10}$/,
        message: 'Ürün kodu 3-10 karakter arası, sadece büyük harf ve rakam olmalı (örn: EL001)',
        successMessage: 'Ürün kodu formatı uygun ✓'
    },
    productName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        message: 'Ürün adı 2-50 karakter arası olmalı',
        successMessage: 'Ürün adı uygun ✓'
    },
    category: {
        required: true,
        message: 'Kategori seçimi zorunlu',
        successMessage: 'Kategori seçildi ✓'
    },
    supplier: {
        required: false,
        maxLength: 50,
        message: 'Tedarikçi adı 50 karakterden fazla olamaz',
        successMessage: 'Tedarikçi adı uygun ✓'
    },
    quantity: {
        required: true,
        min: 0,
        isInteger: true,
        message: 'Stok miktarı 0 veya pozitif tam sayı olmalı',
        successMessage: 'Stok miktarı uygun ✓'
    },
    minStock: {
        required: false,
        min: 0,
        isInteger: true,
        message: 'Minimum stok 0 veya pozitif tam sayı olmalı',
        successMessage: 'Minimum stok uygun ✓'
    },
    buyPrice: {
        required: true,
        min: 0,
        message: 'Alış fiyatı 0 veya pozitif sayı olmalı',
        successMessage: 'Alış fiyatı uygun ✓'
    },
    sellPrice: {
        required: true,
        min: 0,
        message: 'Satış fiyatı 0 veya pozitif sayı olmalı',
        successMessage: 'Satış fiyatı uygun ✓'
    }
};

// Field validation fonksiyonu
function validateField(fieldId, value) {
    const rule = validationRules[fieldId];
    if (!rule) return { isValid: true };

    // Boş değer kontrolü
    if (!value || value.trim() == '') {
        if (rule.required) {
            return {
                isValid: false,
                message: rule.message
            };
        }
        return { isValid: true };
    }

    // Pattern kontrolü
    if (rule.pattern && !rule.pattern.test(value)) {
        return {
            isValid: false,
            message: rule.message
        };
    }

    // Uzunluk kontrolü
    if (rule.minLength && value.length < rule.minLength) {
        return {
            isValid: false,
            message: rule.message
        };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
        return {
            isValid: false,
            message: rule.message
        };
    }

    // Sayı kontrolü
    if (rule.min !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < rule.min) {
            return {
                isValid: false,
                message: rule.message
            };
        }
    }

    // Tam sayı kontrolü
    if (rule.isInteger && !Number.isInteger(parseFloat(value))) {
        return {
            isValid: false,
            message: rule.message
        };
    }

    return {
        isValid: true,
        message: rule.successMessage
    };
}

// Validation mesajını göster
function showValidationMessage(fieldId, message, isValid) {
    const validationEl = document.getElementById(`${fieldId}-validation`);
    const formGroup = document.getElementById(fieldId).closest('.form-group');
    
    if (validationEl) {
        validationEl.textContent = message;
        validationEl.className = `validation-message ${isValid ? 'success' : 'error'}`;
    }
    
    if (formGroup) {
        formGroup.className = `form-group ${isValid ? 'valid' : 'invalid'}`;
    }
}

// Validation mesajını temizle
function clearValidationMessage(fieldId) {
    const validationEl = document.getElementById(`${fieldId}-validation`);
    const formGroup = document.getElementById(fieldId).closest('.form-group');
    
    if (validationEl) {
        validationEl.textContent = '';
        validationEl.className = 'validation-message';
    }
    
    if (formGroup) {
        formGroup.className = 'form-group';
    }
}

// Özel validation: Satış fiyatı alış fiyatından büyük olmalı
function validatePriceRelation() {
    const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
    const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
    
    if (buyPrice > 0 && sellPrice > 0 && sellPrice < buyPrice) {
        showValidationMessage('sellPrice', 'Satış fiyatı alış fiyatından küçük olamaz', false);
        return false;
    }
    
    return true;
}

// Özel validation: Ürün kodu benzersiz olmalı
function validateUniqueCode(code) {
    if (!inventory) return true;
    
    const existingProduct = inventory.getProductByCode(code);
    if (existingProduct && existingProduct.id != inventory.editingProduct) {
        showValidationMessage('productCode', 'Bu ürün kodu zaten kullanılıyor', false);
        return false;
    }
    
    return true;
}

// Real-time validation event listeners
function initializeRealTimeValidation() {
    Object.keys(validationRules).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Input event (yazarken)
        field.addEventListener('input', function(e) {
            let value = e.target.value;
            // Ürün kodu için otomatik büyük harf dönüşümü
            if (fieldId == 'productCode') {
                value = value.toUpperCase();
                e.target.value = value;
            }
            
            const validation = validateField(fieldId, value);
            
            
            if (validation.isValid) {
                // Özel validationlar
                if (fieldId === 'productCode' && value) {
                    if (!validateUniqueCode(value)) return;
                }
                
                if (fieldId === 'sellPrice' || fieldId === 'buyPrice') {
                    setTimeout(() => validatePriceRelation(), 100);
                }
                
                showValidationMessage(fieldId, validation.message, true);
            } else {
                showValidationMessage(fieldId, validation.message, false);
            }
        });

        // Focus event (odaklanınca)
        field.addEventListener('focus', function(e) {
            const value = e.target.value;
            if (!value) {
                clearValidationMessage(fieldId);
            }
        });

        // Blur event (odaktan çıkınca)
        field.addEventListener('blur', function(e) {
            const value = e.target.value;
            const validation = validateField(fieldId, value);
            
            if (!validation.isValid) {
                showValidationMessage(fieldId, validation.message, false);
            }
        });
    });
}

// Dashboard arama işlemi
function performDashboardSearch() {
    console.log('🔍 Arama fonksiyonu çağrıldı');
    
    const searchInput = document.getElementById('dashboardSearchInput');
    
    if (!searchInput) {
        console.log('❌ Arama input bulunamadı');
        alert('❌ Arama kutusu bulunamadı!');
        return;
    }
    
    console.log('✅ Search input bulundu:', searchInput);
    console.log('Input value:', searchInput.value);
    
    const searchTerm = (searchInput.value || '').trim();
    console.log('🔍 Arama terimi:', searchTerm);
    
    if (!searchTerm) {
        alert('🔍 Lütfen aranacak ürün adını girin!');
        // Input'a focus ver
        searchInput.focus();
        return;
    }
    
    if (!inventory?.products) {
        alert('📦 Ürün listesi bulunamadı!');
        return;
    }
    
    console.log('📦 Toplam ürün:', inventory.products.length);
    
    // Arama yap
    const results = inventory.products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log(`🎯 Arama sonucu: ${results.length} ürün bulundu`);
    
    if (results.length === 0) {
        alert(`🔍 "${searchTerm}" için sonuç bulunamadı!`);
        return;
    }
    
    // Ürünler sekmesine git
    inventory.showTab('products');
    
    // Sonuçları göster
    alert(`🔍 "${searchTerm}" için ${results.length} sonuç bulundu!\n\nÜrünler: ${results.map(p => p.name).join(', ')}`);
    
    // Input'u temizle
    searchInput.value = '';
}

// Enter tuşu ile arama
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('dashboardSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performDashboardSearch();
            }
        });
        console.log('✅ Dashboard arama listener eklendi');
    }
});



// Product Class - Ürün nesnesini temsil eder
class Product {
    constructor(code, name, category, quantity, minStock, buyPrice, sellPrice, supplier = '', description = '') {
        this.id = this.generateId();
        this.code = code;
        this.name = name;
        this.category = category;
        this.quantity = parseInt(quantity);
        this.minStock = parseInt(minStock);
        this.buyPrice = parseFloat(buyPrice);
        this.sellPrice = parseFloat(sellPrice);
        this.supplier = supplier;
        this.description = description;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    // Unique ID generator
    generateId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Toplam stok değerini hesaplar
    getTotalValue() {
        return this.quantity * this.sellPrice;
    }

    // Stok durumunu kontrol eder
    getStockStatus() {
        if (this.quantity == 0) return 'out-of-stock';
        if (this.quantity <= this.minStock) return 'low-stock';
        return 'in-stock';
    }

    // Stok durumu metnini döndürür
    getStockStatusText() {
        const status = this.getStockStatus();
        switch (status) {
            case 'out-of-stock': return 'Stokta Yok';
            case 'low-stock': return 'Düşük Stok';
            case 'in-stock': return 'Stokta Var';
            default: return 'Bilinmiyor';
        }
    }

    // Kar marjını hesaplar
    getProfitMargin() {
        if (this.buyPrice === 0) return 0;
        return ((this.sellPrice - this.buyPrice) / this.buyPrice * 100).toFixed(2);
    }

    // Ürün güncelleme
    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
    }

    // JSON formatına dönüştürme
    toJSON() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            category: this.category,
            quantity: this.quantity,
            minStock: this.minStock,
            buyPrice: this.buyPrice,
            sellPrice: this.sellPrice,
            supplier: this.supplier,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    // Tarihi kullanıcı dostu formatta göster
getFormattedDate() {
    const date = new Date(this.createdAt);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
// Sadece saat bilgisi
getFormattedTime() {
    const date = new Date(this.createdAt);
    return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Kaç gün önce eklendiğini hesapla
getDaysAgo() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    return `${Math.floor(diffDays / 30)} ay önce`;
}
}


class InventoryManager {
    constructor() {
        this.products = [];
        this.sortState = {
            column: 'date',
            direction: 'desc'
        };
        this.loadFromStorage();
        this.initializeEventListeners();
        this.currentTab = 'dasboard';
        this.editingProduct = null;
    }

    // LocalStorage'dan veri yükler
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('inventory_products');
            if (stored) {
                const data = JSON.parse(stored);
                this.products = data.map(item => {
                    const product = new Product(
                        item.code, item.name, item.category,
                        item.quantity, item.minStock, item.buyPrice,
                        item.sellPrice, item.supplier, item.description
                    );
                    // Mevcut ID'yi koru
                    product.id = item.id;
                    product.createdAt = item.createdAt;
                    product.updatedAt = item.updatedAt;
                    return product;
                });
            }
        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
            this.products = [];
        }
    }

    // LocalStorage'a veri kaydeder
    saveToStorage() {
        try {
            const data = this.products.map(product => product.toJSON());
            localStorage.setItem('inventory_products', JSON.stringify(data));
        } catch (error) {
            console.error('Veri kaydedilirken hata:', error);
            this.showMessage('Veriler kaydedilemedi!', 'error');
        }
    }

    // Yeni ürün ekler
    addProduct(productData) {
        // Ürün kodu kontrolü
        if (this.isCodeExists(productData.code)) {
            this.showMessage('Bu ürün kodu zaten mevcut!', 'error');
            return false;
        }

        const product = new Product(
            productData.code,
            productData.name,
            productData.category,
            productData.quantity,
            productData.minStock,
            productData.buyPrice,
            productData.sellPrice,
            productData.supplier,
            productData.description
        );

        this.products.push(product);
        this.saveToStorage();
        this.showMessage('Ürün başarıyla eklendi!', 'success');
        this.refreshAllViews();
        return true;
    }

    // Ürün kodu kontrolü
    isCodeExists(code, excludeId = null) {
        return this.products.some(product => 
            product.code == code && product.id != excludeId
        );
    }

    // Ürün günceller
    updateProduct(id, productData) {
        const productIndex = this.products.findIndex(p => p.id == id);
        if (productIndex == -1) {
            this.showMessage('Ürün bulunamadı!', 'error');
            return false;
        }

        // Ürün kodu kontrolü (diğer ürünlerde aynı kod var mı)
        if (this.isCodeExists(productData.code, id)) {
            this.showMessage('Bu ürün kodu zaten mevcut!', 'error');
            return false;
        }

        this.products[productIndex].update(productData);
        this.saveToStorage();
        this.showMessage('Ürün başarıyla güncellendi!', 'success');
        this.refreshAllViews();
        return true;
    }
    

    
    // ID ile ürün bulma
    getProductById(id) {
        return this.products.find(p => p.id == id);
    }

    // Ürün kodu ile ürün bulma
    getProductByCode(code) {
        return this.products.find(p => p.code == code);
    }

    // Filtrelenmiş ürün listesi
    getFilteredProducts(filters = {}) {
        let filteredProducts = [...this.products];

        // Kategori filtresi
        if (filters.category && filters.category != '') {
            filteredProducts = filteredProducts.filter(p => p.category === filters.category);
        }

        // Stok durumu filtresi
        if (filters.stockStatus && filters.stockStatus !== '') {
            filteredProducts = filteredProducts.filter(p => {
                const status = p.getStockStatus();
                switch (filters.stockStatus) {
                    case 'inStock': return status === 'in-stock';
                    case 'lowStock': return status === 'low-stock';
                    case 'outOfStock': return status === 'out-of-stock';
                    case 'recent':
                        const sortedByDate = this.products.slice().sort((a, b) => 
                            new Date(b.createdAt) - new Date(a.createdAt)
                        );
                        const recentProducts = sortedByDate.slice(0, 1);
                        return recentProducts.includes(p);
                    default: return true;
                }
            });
        }

        // Arama filtresi
        if (filters.search && filters.search.trim() !== '') {
            const searchTerm = filters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.code.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm) ||
                p.supplier.toLowerCase().includes(searchTerm)
            );
        }

        return filteredProducts;
    }
    // Sıralama durumu
sortState = {
    column: null,
    direction: 'asc'
};

// Tablo sıralama fonksiyonu
sortProducts(column) {
    // Aynı sütuna tıklanırsa sıralama yönünü değiştir
    if (this.sortState.column === column) {
        this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        this.sortState.column = column;
        this.sortState.direction = 'asc';
    }
    
    // Header'ları güncelle
    this.updateSortHeaders();
    
    // Ürünleri yeniden render et
    this.renderProductsTable();
}

// Sort header'larını güncelle
updateSortHeaders() {
    // Tüm sort class'larını temizle
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Aktif sütunu işaretle
    if (this.sortState.column) {
        const activeHeader = document.querySelector(`[data-sort="${this.sortState.column}"]`);
        if (activeHeader) {
            activeHeader.classList.add(`sort-${this.sortState.direction}`);
        }
    }
}

// Ürünleri sırala
getSortedProducts(products) {
    if (!this.sortState.column) return products;
    
    return [...products].sort((a, b) => {
        let valueA, valueB;
        
        switch(this.sortState.column) {
            case 'code':
                valueA = a.code.toLowerCase();
                valueB = b.code.toLowerCase();
                break;
            case 'name':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case 'category':
                valueA = a.category.toLowerCase();
                valueB = b.category.toLowerCase();
                break;
            case 'quantity':
                valueA = a.quantity;
                valueB = b.quantity;
                break;
            case 'sellPrice':
                valueA = a.sellPrice;
                valueB = b.sellPrice;
                break;
            case 'totalValue':
                valueA = a.getTotalValue();
                valueB = b.getTotalValue();
                break;
            case 'status':
                // Stok durumu: out-of-stock < low-stock < in-stock
                const statusOrder = { 'out-of-stock': 0, 'low-stock': 1, 'in-stock': 2 };
                valueA = statusOrder[a.getStockStatus()];
                valueB = statusOrder[b.getStockStatus()];
                break;
            case 'date':
                valueA = new Date(a.createdAt);
                valueB = new Date(b.createdAt);
                break;
            default:
                return 0;
        }
        
        // Karşılaştırma
        if (valueA < valueB) {
            return this.sortState.direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return this.sortState.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

    // İstatistikler
    getStatistics() {
        const totalProducts = this.products.length;
        const lowStockProducts = this.products.filter(p => p.getStockStatus() === 'low-stock').length;
        const outOfStockProducts = this.products.filter(p => p.getStockStatus() === 'out-of-stock').length;
        const totalValue = this.products.reduce((sum, p) => sum + p.getTotalValue(), 0);

        return {
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            criticalStockProducts: lowStockProducts + outOfStockProducts,
            totalValue
        };
    }

    // Kritik stok uyarıları
    getCriticalStockAlerts() {
        return this.products.filter(p => 
            p.getStockStatus() === 'low-stock' || p.getStockStatus() === 'out-of-stock'
        ).map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            quantity: p.quantity,
            minStock: p.minStock,
            status: p.getStockStatus(),
            message: p.quantity === 0 
                ? `${p.name} stokta yok!` 
                : `${p.name} stoku azalıyor! (${p.quantity} adet kaldı)`
        }));
    }

    // Kategori bazlı istatistikler
    getCategoryStatistics() {
        const stats = {};
        this.products.forEach(product => {
            if (!stats[product.category]) {
                stats[product.category] = {
                    count: 0,
                    totalValue: 0,
                    totalQuantity: 0
                };
            }
            stats[product.category].count++;
            stats[product.category].totalValue += product.getTotalValue();
            stats[product.category].totalQuantity += product.quantity;
        });
        return stats;
    }

   
    initializeEventListeners() {
       

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showTab(e.target.dataset.tab);
            });
        });

        // Ürün ekleme formu
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProductSubmit();
            });
        }

        // Arama ve filtreleme (ESKİ SİSTEM)
const quickSearch = document.getElementById('dashboardSearchInput');
const searchProducts = document.getElementById('searchProducts');
const categoryFilter = document.getElementById('categoryFilter');
const stockFilter = document.getElementById('stockFilter');
// Dashboard'daki Hızlı Arama Butonunu Dinle
const dashboardSearchBtn = document.getElementById('dashboardSearchBtn');
if (dashboardSearchBtn) {
    dashboardSearchBtn.addEventListener('click', () => {
        // Butona basıldığında arama işlemini yapacak fonksiyonu çağır
        this.performQuickSearchAndShowMessage();
    });
}



if (searchProducts) {
    searchProducts.addEventListener('input', () => this.renderProductsTable());
}

if (categoryFilter) {
    categoryFilter.addEventListener('change', () => this.renderProductsTable());
}

if (stockFilter) {
    stockFilter.addEventListener('change', () => this.renderProductsTable());
}

        

    }

    // Demo data oluşturma (ilk kullanım için)
    initializeDemoData() {
        const hasStoredData = localStorage.getItem('inventory_products');
        if (this.products.length === 0) {
            const demoProducts = [
                {
                    code: 'EL001',
                    name: 'iPhone 15 Pro',
                    category: 'Elektronik',
                    quantity: 25,
                    minStock: 5,
                    buyPrice: 35000,
                    sellPrice: 42000,
                    supplier: 'Apple Türkiye',
                    description: '256GB Titanium Blue'
                },
                {
                    code: 'GY001',
                    name: 'Nike Air Max',
                    category: 'Giyim',
                    quantity: 8,
                    minStock: 10,
                    buyPrice: 800,
                    sellPrice: 1200,
                    supplier: 'Nike Store',
                    description: 'Spor ayakkabı - 42 numara'
                },
                {
                    code: 'GD001',
                    name: 'Organik Zeytinyağı',
                    category: 'Gıda',
                    quantity: 0,
                    minStock: 20,
                    buyPrice: 45,
                    sellPrice: 65,
                    supplier: 'Ege Zeytinyağı',
                    description: '1 litre cam şişe'
                },
                {
                    code: 'TM001',
                    name: 'Fairy Bulaşık Deterjanı',
                    category: 'Temizlik',
                    quantity: 150,
                    minStock: 30,
                    buyPrice: 15,
                    sellPrice: 22,
                    supplier: 'P&G Türkiye',
                    description: '750ml limon kokulu'
                }
            ];

            demoProducts.forEach(data => {
                const product = new Product(
                    data.code, data.name, data.category,
                    data.quantity, data.minStock, data.buyPrice,
                    data.sellPrice, data.supplier, data.description
                );
                this.products.push(product);
            });
            
            this.saveToStorage();
            this.showMessage('Demo veriler yüklendi!', 'success');
            
        }
    }
   


   

    // Tüm görünümleri yenilerDOMContentL
    refreshAllViews() {
        this.updateHeaderStats();
    
    // Sadece dashboard'daysa kritik uyarıları göster
    if (this.currentTab === 'dashboard') {
        this.renderCriticalAlerts();
    }
    
    // Sadece products tab'ındaysa ürün tablosunu güncelle
    if (this.currentTab === 'products') {
        this.renderProductsTable();
    }
    }

    // Header istatistikleri günceller
    updateHeaderStats() {
        const stats = this.getStatistics();
        
        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockEl = document.getElementById('lowStock');
        const totalValueEl = document.getElementById('totalValue');

        if (totalProductsEl) totalProductsEl.textContent = stats.totalProducts;
        if (lowStockEl) lowStockEl.textContent = stats.criticalStockProducts;
        if (totalValueEl) totalValueEl.textContent = `₺${stats.totalValue.toLocaleString('tr-TR')}`;
    }

    // Kritik stok uyarılarını render eder
    renderCriticalAlerts() {
        const alertsContainer = document.getElementById('criticalAlerts');
        if (!alertsContainer) return;

        const alerts = this.getCriticalStockAlerts();
        
        if (alerts.length == 0) {
            alertsContainer.innerHTML = '<p class="no-alerts">Kritik stok uyarısı bulunmuyor</p>';
            return;
        }

        const alertsHTML = alerts.map(alert => `
            <div class="alert-item ${alert.status === 'out-of-stock' ? 'critical' : ''}">
                <div>
                    <strong>${alert.name}</strong> (${alert.code})
                    <br><small>${alert.message}</small>
                </div>
                <button class="btn-edit" onclick="requestAdminForCriticalStock('${alert.code}', '${alert.name}')">
    Düzenle
</button>
            </div>
        `).join('');

        alertsContainer.innerHTML = alertsHTML;
    }
    



    showMessage(text, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = text;

        container.appendChild(messageEl);

        // 3 saniye sonra mesajı kaldır
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

  

    showTab(tabName) {
        // Tüm tab-content'leri gizle
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Tüm tab-btn'lerin active class'ını kaldır
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // İlgili tab'ı göster
        const targetTab = document.getElementById(tabName);
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);

        if (targetTab) targetTab.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');
        this.currentTab=tabName;

       
        if (this.currentTab === 'products') {
            // Products tab'ına geçince tabloyu temizle
            const tbody = document.getElementById('productsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                            <div style="font-size: 1.2rem; margin-bottom: 10px;">🔍</div>
                            <div>Ürünleri görmek için yukarıdaki filtrelerden birini seçin</div>
                        </td>
                    </tr>
                `;
            }
        } else if (tabName === 'dashboard') {
            this.updateHeaderStats();
            this.renderCriticalAlerts();
        }
    }
}


// Global inventory manager instance
let inventory;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sayfa yükleniyor...');
    
    // Inventory manager'ı oluştur
    inventory = new InventoryManager();
    
    // Real-time validation'ı başlat
    initializeRealTimeValidation();
    
    // Demo verileri kontrol et
    setTimeout(() => {
        if (inventory.products.length === 0) {
            console.log('⚠️ Demo veriler yüklenmedi, yeniden deneniyor...');
            inventory.initializeDemoData();
            inventory.refreshAllViews();
        }
        
        // İlk tab'ı ayarla (dashboard)
        inventory.showTab('dashboard');
        
        console.log('✅ Sistem hazır!');
    }, 500);
});
InventoryManager.prototype.performQuickSearchAndShowMessage = function() {
    // 1. Arama kutusundaki değeri al
    const searchInput = document.getElementById('dashboardSearchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Arama kutusu boşsa hiçbir şey yapma
    if (searchTerm === '') {
        this.showMessage('Lütfen bir arama terimi girin.', 'error'); // veya hiçbir şey yapma
        return;
    }

    // 2. Arama terimine uyan İLK ürünü bul
    // .find() metodu, koşula uyan ilk elemanı bulur ve aramayı durdurur. Daha verimlidir.
    const foundProduct = this.products.find(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.code.toLowerCase().includes(searchTerm)
    );

    // 3. Sonuca göre mesaj göster
    if (foundProduct) {
        // Ürün bulunduysa, başarı mesajı göster
        this.showMessage(`✅ Ürün bulundu: ${foundProduct.name} (Stok: ${foundProduct.quantity})`, 'success');
    } else {
        // Ürün bulunamadıysa, hata mesajı göster
        this.showMessage('❌ Bu kritere uygun ürün bulunamadı.', 'error');
    }

    // İsteğe bağlı: Aramadan sonra arama kutusunu temizle
    // searchInput.value = ''; 
};

// Global helper functions
function showTab(tabName) {
    if (inventory) {
        inventory.showTab(tabName);
    }
}

function clearForm() {
    const form = document.getElementById('productForm');
    if (form) {
        form.reset();
    }
}

function exportData() {
    if (inventory) {
        // Bu özellik yarın geliştirilecek
        inventory.showMessage('Export özelliği yakında eklenecek!', 'info');
    }
}

function importData() {
    if (inventory) {
        // Bu özellik yarın geliştirilecek
        inventory.showMessage('Import özelliği yakında eklenecek!', 'info');
    }
}



// Ürün ekleme/güncelleme form işleyicisi
InventoryManager.prototype.handleProductSubmit = function() {
  // Admin kontrolü gerekli
  if (!adminAuthenticated) {
    openAdminModal('add');
    return;
}

const form = document.getElementById('productForm');
    
    const productData = {
        code: document.getElementById('productCode').value.trim(),
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('category').value,
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        minStock: parseInt(document.getElementById('minStock').value) || 10,
        buyPrice: parseFloat(document.getElementById('buyPrice').value) || 0,
        sellPrice: parseFloat(document.getElementById('sellPrice').value) || 0,
        supplier: document.getElementById('supplier').value.trim(),
        description: document.getElementById('description').value.trim()
    };

    // Form validasyonu
    if (!this.validateProductForm(productData)) {
        return;
    }

    // Güncelleme veya ekleme
    if (this.editingProduct) {
        if (this.updateProduct(this.editingProduct, productData)) {
            form.reset();
            this.editingProduct = null;
            this.showTab('products');
        }
    } else {
        if (this.addProduct(productData)) {
            form.reset();
            this.showTab('products');
        }
    }
};
// Yeni validation sistemi ile form kontrolü
InventoryManager.prototype.validateProductFormWithRealTime = function(data) {
    let isValid = true;
    const errors = [];

    // Tüm alanları real-time validation ile kontrol et
    Object.keys(validationRules).forEach(fieldId => {
        const value = data[fieldId] || '';
        const validation = validateField(fieldId, value);
        
        if (!validation.isValid) {
            showValidationMessage(fieldId, validation.message, false);
            isValid = false;
            errors.push(validation.message);
        }
    });

    // Özel validationlar
    if (!validateUniqueCode(data.code)) {
        isValid = false;
        errors.push('Ürün kodu zaten kullanılıyor❌ ');
    }

    if (!validatePriceRelation()) {
        isValid = false;
        errors.push('Satış fiyatı alış fiyatından küçük olamaz❌ ');
    }

    // Eğer hata varsa ilk hatayı göster
    if (!isValid && errors.length > 0) {
        this.showMessage(errors[0], 'error');
    }

    return isValid;
};

// Tüm validation mesajlarını temizle
InventoryManager.prototype.clearAllValidations = function() {
    Object.keys(validationRules).forEach(fieldId => {
        clearValidationMessage(fieldId);
    });
};

// Form validasyonu
InventoryManager.prototype.validateProductForm = function(data) { 
    const errors = [];

    if (!data.code || data.code.length < 2) {
        errors.push('Ürün kodu en az 2 karakter olmalıdır❌ ');
    }

    if (!data.name || data.name.length < 2) {
        errors.push('Ürün adı en az 2 karakter olmalıdır❌ ');
    }

    if (!data.category) {
        errors.push('Kategori seçilmelidir❌ ');
    }

    if (data.quantity < 0) {
        errors.push('Stok miktarı negatif olamaz❌ ');
    }

    if (data.minStock < 0) {
        errors.push('Minimum stok negatif olamaz❌ ');
    }

    if (data.buyPrice < 0) {
        errors.push('Alış fiyatı negatif olamaz❌ ');
    }

    if (data.sellPrice < 0) {
        errors.push('Satış fiyatı negatif olamaz❌ ');
    }

    if (data.sellPrice < data.buyPrice) {
        errors.push('Satış fiyatı alış fiyatından küçük olamaz❌ ');
    }

    if (errors.length > 0) {
        this.showMessage(errors[0], 'error');
        return false;
    }

    return true;
};

// Ürünler tablosunu render eder
InventoryManager.prototype.renderProductsTable = function() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    // Filtreleri al
    const filters = {
        category: document.getElementById('categoryFilter')?.value || '',
        stockStatus: document.getElementById('stockFilter')?.value || '',
        search: document.getElementById('searchProducts')?.value || ''
    };

    const products = this.getFilteredProducts(filters);


    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                    ${Object.values(filters).some(f => f) ? 'Filtreye uygun ürün bulunamadı' : 'Henüz ürün eklenmemiş'}
                </td>
            </tr>
        `;
        return;
    }

    const productsHTML = products.map(product => `
         <tr>
        <td><strong>${product.code}</strong></td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>
            <span style="font-weight: 600; color: ${
                product.quantity === 0 ? '#dc3545' : 
                product.quantity <= product.minStock ? '#ffc107' : '#28a745'
            }">
                ${product.quantity}
            </span>
        </td>
        <td>₺${product.sellPrice.toLocaleString('tr-TR')}</td>
        <td>₺${product.getTotalValue().toLocaleString('tr-TR')}</td>
        <td>
            <span class="status-badge ${product.getStockStatus()}">
                ${product.getStockStatusText()}
            </span>
        </td>
        <td>
            <div class="date-info">
                   <span class="date-formatted">${product.getFormattedDate()}</span>
                   <span class="time-formatted">${product.getFormattedTime()}</span>
                   <small class="date-relative">${product.getDaysAgo()}</small>
            </div>
        </td>
        <td>
           <div class="action-buttons">
        <button class="btn-edit" onclick="openAdminModal('edit', '${product.id}', '${product.name}')">
            ✏️ Düzenle
        </button>
        <button class="btn-delete" onclick="openAdminModal('delete', '${product.id}', '${product.name}')">
            🗑️ Sil
        </button>
            </div>
        </td>
    </tr>
`).join('');

    tbody.innerHTML = productsHTML;
};

// Ürün düzenleme modalını açar
InventoryManager.prototype.editProduct = function(productId) {
    const product = this.getProductById(productId);
    if (!adminAuthenticated) {
        const product = this.getProductById(id);
        openAdminModal('delete', id, product ? product.name : 'Ürün');
        return;
    }

    // Form alanlarını doldur
    document.getElementById('productCode').value = product.code;
    document.getElementById('productName').value = product.name;
    document.getElementById('category').value = product.category;
    document.getElementById('quantity').value = product.quantity;
    document.getElementById('minStock').value = product.minStock;
    document.getElementById('buyPrice').value = product.buyPrice;
    document.getElementById('sellPrice').value = product.sellPrice;
    document.getElementById('supplier').value = product.supplier;
    document.getElementById('description').value = product.description;

    // Form başlığını güncelle
    const formTitle = document.querySelector('#add-product h2');
    if (formTitle) {
        formTitle.textContent = `${product.name} - Ürün Düzenle`;
    }

    // Submit button metnini değiştir
    const submitBtn = document.querySelector('#productForm .btn-primary');
    if (submitBtn) {
        submitBtn.innerHTML = '💾 Ürün Güncelle';
    }

    this.editingProduct = productId;
    this.showTab('add-product');
};







// Toplu stok güncelleme
InventoryManager.prototype.bulkUpdateStock = function(updates) {
    let updatedCount = 0;
    
    updates.forEach(update => {
        const product = this.getProductById(update.id);
        if (product) {
            product.quantity = update.quantity;
            product.updatedAt = new Date().toISOString();
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        this.saveToStorage();
        this.showMessage(`${updatedCount} ürünün stoku güncellendi!`, 'success');
        this.refreshAllViews();
    }
};

// Kategori bazlı filtreleme yardımcısı
InventoryManager.prototype.getProductsByCategory = function(category) {
    return this.products.filter(product => product.category === category);
};

// Stok durumuna göre ürünleri getir
InventoryManager.prototype.getProductsByStockStatus = function(status) {
    return this.products.filter(product => product.getStockStatus() === status);
};



// CSV formatında veri hazırlama
InventoryManager.prototype.prepareCSVData = function() {
    const headers = [
        'Ürün Kodu', 'Ürün Adı', 'Kategori', 'Stok Miktarı', 
        'Min Stok', 'Alış Fiyatı', 'Satış Fiyatı', 'Toplam Değer',
        'Tedarikçi', 'Durum', 'Oluşturma Tarihi'
    ];
    
    const rows = this.products.map(product => [
        product.code,
        product.name,
        product.category,
        product.quantity,
        product.minStock,
        product.buyPrice,
        product.sellPrice,
        product.getTotalValue(),
        product.supplier,
        product.getStockStatusText(),
        new Date(product.createdAt).toLocaleDateString('tr-TR')
    ]);
    
    return [headers, ...rows];
};

// JSON formatında veri hazırlama
InventoryManager.prototype.prepareJSONData = function() {
    return {
        exportDate: new Date().toISOString(),
        totalProducts: this.products.length,
        statistics: this.getStatistics(),
        products: this.products.map(product => product.toJSON())
    };
};


// Klavye kısayolları
document.addEventListener('keydown', function(e) {
    // Ctrl + N: Yeni ürün ekleme
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (inventory) {
            inventory.showTab('add-product');
            document.getElementById('productCode').focus();
        }
    }
    
    // Ctrl + F: Arama kutusuna odaklan
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchBox = document.getElementById('quickSearch') || document.getElementById('searchProducts');
        if (searchBox) {
            searchBox.focus();
        }
    }
    
    // ESC: Modal/form'u kapat
    if (e.key === 'Escape') {
        if (inventory && inventory.editingProduct) {
            inventory.closeEditModal();
        }
    }
});



// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}



// Local Storage boyut kontrolü
InventoryManager.prototype.checkStorageQuota = function() {
    try {
        const used = JSON.stringify(localStorage).length;
        const limit = 5 * 1024 * 1024; // 5MB
        
        if (used > limit * 0.8) {
            this.showMessage('LocalStorage dolmak üzere! Verileri yedeklemeyi düşünün.', 'warning');
        }
        
        return {
            used: used,
            percentage: (used / limit * 100).toFixed(2)
        };
    } catch (error) {
        console.error('Storage quota check failed:', error);
        return null;
    }
};



InventoryManager.prototype.clearAllData = function() {
    console.log('clearAllData çağrıldı ama devre dışı');
    return; // Fonksiyonu devre dışı bırak
    
    // Admin kontrolü
    if (!adminAuthenticated) {
        openAdminModal('clearAll', null, 'Tüm Verileri');
        return;
    }
    
    // Browser confirm kullan
    if (confirm('TÜM VERİLERİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!')) {
        localStorage.removeItem('inventory_products');
        this.products = [];
        this.refreshAllViews();
        this.showMessage('Tüm veriler temizlendi!', 'success');
    }
};

// Debug bilgileri
InventoryManager.prototype.getDebugInfo = function() {
    const stats = this.getStatistics();
    const storage = this.checkStorageQuota();
    
    return {
        version: '1.0.0',
        totalProducts: this.products.length,
        statistics: stats,
        storage: storage,
        lastUpdate: new Date().toISOString(),
        categories: [...new Set(this.products.map(p => p.category))],
        suppliers: [...new Set(this.products.map(p => p.supplier).filter(s => s))]
    };
};

// Console'da debug bilgilerini göster
InventoryManager.prototype.showDebugInfo = function() {
    console.group('🔍 Inventory System Debug Info');
    console.table(this.getDebugInfo());
    console.log('📦 Products:', this.products);
    console.log('📊 Category Stats:', this.getCategoryStatistics());
    console.log('⚠️ Critical Alerts:', this.getCriticalStockAlerts());
    console.groupEnd();
};

// Manuel test fonksiyonları
InventoryManager.prototype.runTests = function() {
    console.group('🧪 Running Manual Tests');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Ürün ekleme
    try {
        const initialCount = this.products.length;
        this.addProduct({
            code: 'TEST001',
            name: 'Test Ürünü',
            category: 'Test',
            quantity: 100,
            minStock: 10,
            buyPrice: 50,
            sellPrice: 75,
            supplier: 'Test Supplier'
        });
        
        if (this.products.length === initialCount + 1) {
            console.log('✅ Test 1 Passed: Ürün ekleme');
            passed++;
        } else {
            console.log('❌ Test 1 Failed: Ürün ekleme');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 1 Error:', error);
        failed++;
    }
    
    // Test 2: Ürün bulma
    try {
        const testProduct = this.getProductByCode('TEST001');
        if (testProduct && testProduct.name === 'Test Ürünü') {
            console.log('✅ Test 2 Passed: Ürün bulma');
            passed++;
        } else {
            console.log('❌ Test 2 Failed: Ürün bulma');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 2 Error:', error);
        failed++;
    }
    
    // Test 3: Stok durumu kontrolü
    try {
        const testProduct = this.getProductByCode('TEST001');
        if (testProduct && testProduct.getStockStatus() === 'in-stock') {
            console.log('✅ Test 3 Passed: Stok durumu');
            passed++;
        } else {
            console.log('❌ Test 3 Failed: Stok durumu');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 3 Error:', error);
        failed++;
    }
    
    // Test 4: Filtreleme
    try {
        const filtered = this.getFilteredProducts({ category: 'Test' });
        if (filtered.length > 0) {
            console.log('✅ Test 4 Passed: Filtreleme');
            passed++;
        } else {
            console.log('❌ Test 4 Failed: Filtreleme');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 4 Error:', error);
        failed++;
    }
    
    // Test 5: İstatistikler
    try {
        const stats = this.getStatistics();
        if (stats.totalProducts >= 0 && stats.totalValue >= 0) {
            console.log('✅ Test 5 Passed: İstatistikler');
            passed++;
        } else {
            console.log('❌ Test 5 Failed: İstatistikler');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 5 Error:', error);
        failed++;
    }
    
    // Test ürününü temizle
    const testProduct = this.getProductByCode('TEST001');
    if (testProduct) {
        this.deleteProduct(testProduct.id);
    }
    
    console.log(`\n📊 Test Sonuçları: ${passed} Başarılı, ${failed} Başarısız`);
    console.groupEnd();
    
    return { passed, failed, total: passed + failed };
};



// Console'dan erişilebilir global fonksiyonlar
window.inventoryDebug = {
    // Tüm ürünleri listele
    listProducts: () => inventory?.products || [],
    
    // İstatistikleri göster
    showStats: () => inventory?.getStatistics() || {},
    
    // Debug bilgilerini göster
    debug: () => inventory?.showDebugInfo(),
    
    // Testleri çalıştır
    test: () => inventory?.runTests(),
    
    // Tüm verileri temizle
    clearAll: () => inventory?.clearAllData(),
    
    // Demo verileri yeniden yükle
    loadDemo: () => {
        if (inventory) {
            inventory.clearAllData();
            inventory.initializeDemoData();
            inventory.refreshAllViews();
        }
    },
    
    // Storage bilgisi
    storage: () => inventory?.checkStorageQuota(),
    
    // Rastgele test verisi oluştur
    generateTestData: (count = 10) => {
        if (!inventory) return;
        
        const categories = ['Elektronik', 'Giyim', 'Gıda', 'Temizlik', 'Kozmetik'];
        const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D'];
        
        for (let i = 0; i < count; i++) {
            const code = `TEST${String(i + 1).padStart(3, '0')}`;
            const name = `Test Ürünü ${i + 1}`;
            const category = categories[Math.floor(Math.random() * categories.length)];
            const quantity = Math.floor(Math.random() * 200);
            const minStock = Math.floor(Math.random() * 20) + 5;
            const buyPrice = Math.floor(Math.random() * 1000) + 10;
            const sellPrice = buyPrice + Math.floor(Math.random() * 500) + 10;
            const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
            
            inventory.addProduct({
                code, name, category, quantity, minStock, 
                buyPrice, sellPrice, supplier, 
                description: `Otomatik oluşturulan test ürünü ${i + 1}`
            });
        }
        
        console.log(`${count} adet test ürünü oluşturuldu!`);
        inventory.refreshAllViews();
    }
};



// Form reset fonksiyonu (global)
function clearForm() {
    const form = document.getElementById('productForm');
    if (form) {
        form.reset();
    }
    
    if (inventory) {
        inventory.editingProduct = null;
        
        // Form başlığını ve button'ı eski haline getir
        const formTitle = document.querySelector('#add-product h2');
        if (formTitle) {
            formTitle.textContent = 'Yeni Ürün Ekle';
        }
        
        const submitBtn = document.querySelector('#productForm .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '💾 Ürün Ekle';
        }
    }
}

// Sayfa kapatılırken veri kaybı uyarısı (eğer değişiklik varsa)
window.addEventListener('beforeunload', function(e) {
    if (inventory && inventory.editingProduct) {
        e.preventDefault();
        e.returnValue = 'Düzenleme işleminiz tamamlanmamış. Sayfayı kapatmak istediğinize emin misiniz?';
        return e.returnValue;
    }
});

// ============================================
// CONSOLE WELCOME MESSAGE
// ============================================

console.log(`
🏪 Inventory Management System v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Developer Tools:
   • inventoryDebug.listProducts() - Tüm ürünleri listele
   • inventoryDebug.showStats() - İstatistikleri göster  
   • inventoryDebug.debug() - Debug bilgileri
   • inventoryDebug.test() - Testleri çalıştır
   • inventoryDebug.clearAll() - Tüm verileri temizle
   • inventoryDebug.loadDemo() - Demo verileri yükle
   • inventoryDebug.generateTestData(10) - Test verisi oluştur

⌨️  Klavye Kısayolları:
   • Ctrl + N - Yeni ürün ekle
   • Ctrl + F - Arama kutusuna odaklan
   • ESC - Modal/formu kapat

🎯 1. Gün Tamamlandı!
   ✅ HTML yapısı
   ✅ CSS styling
   ✅ JavaScript Product class
   ✅ LocalStorage CRUD
   ✅ Form işlemleri
   ✅ Test & debug araçları
`);

// Son kontrol: Sayfa yüklendikten sonra tüm sistemleri kontrol et
setTimeout(() => {
    if (inventory) {
        inventory.refreshAllViews();
        console.log('✅ Inventory System başarıyla yüklendi!');
    } else {
        console.error('❌ Inventory System yüklenemedi!');
    }
}, 1000);

let adminAuthenticated = false;
let pendingAdminAction = null;

// Admin modal açma
function openAdminModal(action, productId = null, productName = '') {
    pendingAdminAction = { action, productId, productName };
    document.getElementById('adminModal').style.display = 'block';
    
    // Login formunu göster, dashboard'ı gizle
    document.getElementById('adminLoginModal').style.display = 'block';
    document.getElementById('adminDashboardModal').style.display = 'none';
    
    // Şifre input'unu temizle ve odakla
    const passwordInput = document.getElementById('adminPasswordModal');
    passwordInput.value = '';
    setTimeout(() => passwordInput.focus(), 100);
}

// Admin modal kapatma
function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    pendingAdminAction = null;
    adminAuthenticated = false;
}

// Admin doğrulama
function authenticateAdmin(password) {
    if (password === 'admin123') {
        adminAuthenticated = true;
        return true;
    }
    return false;
}

// Admin login form işleme
document.addEventListener('DOMContentLoaded', function() {
    const adminAuthForm = document.getElementById('adminAuthForm');
    if (adminAuthForm) {
        adminAuthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('adminPasswordModal').value;
            
            if (authenticateAdmin(password)) {
                // Doğrulama başarılı, işlemi yap
                executePendingAction();
                closeAdminModal();
            } else {
                // Hatalı şifre
                alert('❌ Hatalı şifre! Varsayılan şifre: admin123');
                document.getElementById('adminPasswordModal').value = '';
                document.getElementById('adminPasswordModal').focus();
            }
        });
    }
    
    
    console.log('🔍 Dashboard arama sistemi hazır');
});

// Bekleyen işlemi gerçekleştir
function executePendingAction() {
    if (!pendingAdminAction) return;
    
    const { action, productId, productName } = pendingAdminAction;
    
    switch(action) {
        case 'edit':
            // Ürün düzenleme işlemi
            if (inventory) {
                inventory.editProduct(productId);
            }
            break;
            
        case 'delete':
            // Ürün silme işlemi
             // Ürün silme işlemi - browser confirm kullan
            if (confirm(`"${productName}" ürününü silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
            if (inventory) {
            inventory.deleteProduct(productId);
        }
    }
            break;
            
        case 'add':
            // Ürün ekleme işlemi (form submit)
            if (inventory) {
                inventory.handleProductSubmit();
            }
            break;

        case 'clearAll':
           // inventory yerine window kullan
           case 'editCriticalStock':
           // Kritik stok ürünü düzenleme
    const productCode = pendingAdminAction.productId;
    const productName = pendingAdminAction.productName;
    editCriticalStockProduct(productCode, productName);
    break;
    if (window.inventory) {
        window.inventory.clearAllData();
    }
    break;
    }
}

// Onay modalı göster
/*function showConfirmModal(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'block';
    
    // Evet butonuna tıklama
    document.getElementById('confirmYes').onclick = function() {
        callback();
        closeConfirmModal();
    };
}

// Onay modalı kapat
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}*/

// Modal dışına tıklayınca kapat
window.addEventListener('click', function(event) {
    const adminModal = document.getElementById('adminModal');
    
    
    if (event.target === adminModal) {
        closeAdminModal();
    }
    
});
// Ürün silme (yeni admin korumalı versiyon)
InventoryManager.prototype.deleteProduct = function(id) {
    if (!adminAuthenticated) {
        const product = this.getProductById(id);
        openAdminModal('delete', id, product ? product.name : 'Ürün');
        return;
    }
    
    const productIndex = this.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
        this.showMessage('Ürün bulunamadı!', 'error');
        return false;
    }

    const deletedProduct = this.products.splice(productIndex, 1)[0];
    this.saveToStorage();
    this.showMessage(deletedProduct.name + ' başarıyla silindi!', 'success');
    this.refreshAllViews();
    return true;
};


// ============================================
// CHART.JS REPORTS SYSTEM
// ============================================
// Chart.js yüklenene kadar bekle
function waitForChart() {
    if (typeof Chart === 'undefined') {
        setTimeout(waitForChart, 100);
        return;
    }
    console.log('✅ Chart.js hazır!');
}
if (typeof Chart === 'undefined') {
    console.log('⚠️ Chart.js yüklenmedi. Grafik özellikleri çalışmayacak.');
    
    // Boş fonksiyonlar oluştur (hata vermemesi için)
    window.initializeReports = function() {
        console.log('Chart.js yok, raporlar başlatılamadı');
    };
} else {
    console.log('✅ Chart.js yüklendi, raporlar hazırlanıyor...');
    
    // Chart.js hazır olduğunda başlat
    waitForChart();
    
    // Chart kodlarının geri kalanı buraya...
}
console.log('✅ Chart.js yüklendi, raporlar hazırlanıyor...');


// Chart.js hazır olduğunda başlat
waitForChart();
let chartInstances = {};


// Chart color palettes
const chartColors = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    success: ['#11998e', '#38ef7d', '#43e97b', '#38f9d7'],
    danger: ['#ee0979', '#ff6a00', '#ff9a9e', '#fecfef'],
    warning: ['#ffecd2', '#fcb69f', '#ff8a80', '#ffb74d']
};

// Initialize all charts when reports tab is shown
function initializeReports() {
    if (!inventory || !inventory.products) return;
    
    console.log('🎨 Initializing reports...');
    
    // Initialize all charts
    createStockChart();
    createCategoryChart();
    createValueChart();
    createTrendChart();
    
    // Setup event listeners
    setupReportEventListeners();
}

// 1. STOCK STATUS CHART
function createStockChart() {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (chartInstances.stockChart) {
        chartInstances.stockChart.destroy();
    }
    
    // Calculate stock status data
    const stockData = calculateStockStatus();
    
    chartInstances.stockChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Stokta Var', 'Düşük Stok', 'Stokta Yok'],
            datasets: [{
                data: [stockData.inStock, stockData.lowStock, stockData.outOfStock],
                backgroundColor: [
                    '#28a745',
                    '#ffc107', 
                    '#dc3545'
                ],
                borderWidth: 2,
                borderColor: '#fff'
                
               
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} ürün (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            },

   

         // İNTERAKTİF ÖZELLIK: Tıklama olayı
         onClick: (event, activeElements) => {
            if (activeElements.length > 0) {
                const elementIndex = activeElements[0].index;
                const statusTypes = ['in-stock', 'low-stock', 'out-of-stock'];
                const statusLabels = ['Stokta Var', 'Düşük Stok', 'Stokta Yok'];
                
                const selectedStatus = statusTypes[elementIndex];
                const selectedLabel = statusLabels[elementIndex];
                
                // Filtrelenmiş ürünleri göster
                showProductsByStatus(selectedStatus, selectedLabel);
            }
         }
    }
     });
}
// İnteraktif: Statüye göre ürünleri göster
function showProductsByStatus(status, statusLabel) {
    if (!inventory || !inventory.products) return;
    
    const filteredProducts = inventory.products.filter(product => {
        return product.getStockStatus() === status;
    });
    
    console.log(`📊 ${statusLabel} ürünleri:`, filteredProducts);
    
    // Modal veya alert ile ürünleri göster
    const productNames = filteredProducts.map(p => `• ${p.name} (${p.quantity} adet)`).join('\n');
    
    if (filteredProducts.length > 0) {
        alert(`${statusLabel} Ürünler (${filteredProducts.length} adet):\n\n${productNames}`);
    } else {
        alert(`${statusLabel} kategorisinde ürün bulunmuyor.`);
    }
}

// İnteraktif: Kategoriye göre ürünleri göster  
function showProductsByCategory(category) {
    if (!inventory || !inventory.products) return;
    
    const filteredProducts = inventory.products.filter(product => {
        return product.category === category;
    });
    
    const productNames = filteredProducts.map(p => `• ${p.name} (${p.quantity} adet)`).join('\n');
    
    if (filteredProducts.length > 0) {
        alert(`${category} Kategorisi (${filteredProducts.length} adet):\n\n${productNames}`);
    }
}
// 2. CATEGORY DISTRIBUTION CHART
function createCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (chartInstances.categoryChart) {
        chartInstances.categoryChart.destroy();
    }
    
    const categoryData = calculateCategoryDistribution();
    
    chartInstances.categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'Ürün Sayısı',
                data: categoryData.productCounts,
                backgroundColor: chartColors.primary.slice(0, categoryData.labels.length),
                borderColor: chartColors.primary.slice(0, categoryData.labels.length),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.y} ürün`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            animation: {
                delay: (context) => context.dataIndex * 100
            }
        }
    });
}

// 3. VALUE ANALYSIS CHART
function createValueChart() {
    const ctx = document.getElementById('valueChart');
    if (!ctx) return;
    
    if (chartInstances.valueChart) {
        chartInstances.valueChart.destroy();
    }
    
    const valueData = calculateValueAnalysis();
    
    chartInstances.valueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: valueData.labels,
            datasets: [{
                label: 'Toplam Değer (₺)',
                data: valueData.values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Değer: ₺${context.parsed.y.toLocaleString('tr-TR')}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₺' + value.toLocaleString('tr-TR');
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 4. TREND ANALYSIS CHART  
function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    if (chartInstances.trendChart) {
        chartInstances.trendChart.destroy();
    }
    
    const trendData = calculateTrendAnalysis();
    
    chartInstances.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
            datasets: [{
                label: 'Ürün Sayısı',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Toplam Değer (₺ x1000)',
                data: [65, 75, 80, 95, 85, 110],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Data calculation functions
function calculateStockStatus() {
    if (!inventory.products) return { inStock: 0, lowStock: 0, outOfStock: 0 };
    
    let inStock = 0, lowStock = 0, outOfStock = 0;
    
    inventory.products.forEach(product => {
        const status = product.getStockStatus();
        switch(status) {
            case 'in-stock': inStock++; break;
            case 'low-stock': lowStock++; break;
            case 'out-of-stock': outOfStock++; break;
        }
    });
    
    return { inStock, lowStock, outOfStock };
}
// YENİ FONKSİYON: Tarih aralığına göre ürünleri filtrele
function getProductsByDateRange(startDate, endDate) {
    if (!inventory || !inventory.products) return [];
    
    return inventory.products.filter(product => {
        const productDate = new Date(product.createdAt);
        return productDate >= startDate && productDate <= endDate;
    });
}

// YENİ FONKSİYON: Filtrelenmiş verilerle grafikleri güncelle
function updateChartsWithFilteredData(filteredProducts) {
    // Geçici olarak inventory.products'ı değiştir
    const originalProducts = inventory.products;
    inventory.products = filteredProducts;
    
    // Grafikleri yeniden oluştur
    createStockChart();
    createCategoryChart();
    createValueChart();
    
    // Orijinal veriyi geri yükle
    inventory.products = originalProducts;
    
    console.log(`📊 Grafikler güncellendi: ${filteredProducts.length} ürün`);
}

// YENİ FONKSİYON: Period bilgisini göster
function updatePeriodInfo(period, startDate, endDate) {

    const periodText = {
        'today': 'Bugün',
        'week': 'Bu Hafta', 
        'month': 'Bu Ay',
        'quarter': 'Bu Çeyrek',
        'year': 'Bu Yıl',
        'custom': `${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`
}
    };
function calculateCategoryDistribution() {
    if (!inventory.products) return { labels: [], productCounts: [] };
    
    const categoryCounts = {};
    
    inventory.products.forEach(product => {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    });
    
    return {
        labels: Object.keys(categoryCounts),
        productCounts: Object.values(categoryCounts)
    };
}

function calculateValueAnalysis() {
    if (!inventory.products) return { labels: [], values: [] };
    
    const sortedProducts = [...inventory.products]
        .sort((a, b) => b.getTotalValue() - a.getTotalValue())
        .slice(0, 10);
    
    return {
        labels: sortedProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
        values: sortedProducts.map(p => p.getTotalValue())
    };
}

function calculateTrendAnalysis() {
    // Demo trend data - bu kısım gerçek verilere göre güncellenebilir
    return {
        months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
        productCounts: [12, 19, 15, 25, 22, 30],
        values: [65000, 75000, 80000, 95000, 85000, 110000]
    };
}

// Event listeners for chart controls
function setupReportEventListeners() {
    // Chart type switchers
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartId = this.dataset.chart;
            const chartType = this.dataset.type;
            
            // Update active button
            this.parentElement.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Switch chart type
            switchChartType(chartId, chartType);
        });
    });
    
    // Export buttons
    document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
    document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
    document.getElementById('exportImage')?.addEventListener('click', exportToImage);
    document.getElementById('refreshReports')?.addEventListener('click', refreshReports);
    
    // Period selector
    document.getElementById('reportPeriod')?.addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('customDateRange').style.display = 'flex';
        } else {
            document.getElementById('customDateRange').style.display = 'none';
            applyDateFilter(this.value);
        }
    });
   
}
// YENİ FONKSİYON: Tarih filtresi uygula
function applyDateFilter(period) {
    console.log(`📅 Tarih filtresi uygulanıyor: ${period}`);
    
    const now = new Date();
    let startDate, endDate = now;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            return refreshReports();
    }
    
    // Filtrelenmiş verileri al
    const filteredProducts = getProductsByDateRange(startDate, endDate);
    
    // Grafikleri güncelle
    updateChartsWithFilteredData(filteredProducts);
    
    // Period bilgisini güncelle
    updatePeriodInfo(period, startDate, endDate);
}
// Filtrelenmiş verilerle grafikleri güncelle
function updateChartsWithFilteredData(filteredProducts) {
    // Geçici olarak inventory.products'ı değiştir
    const originalProducts = inventory.products;
    inventory.products = filteredProducts;
    
    // Grafikleri yeniden oluştur
    createStockChart();
    createCategoryChart();
    createValueChart();
    
    // Orijinal veriyi geri yükle
    inventory.products = originalProducts;
    
    console.log(`📊 Grafikler güncellendi: ${filteredProducts.length} ürün`);
}

// Period bilgisini göster
function updatePeriodInfo(period, startDate, endDate) {
    const periodText = {
        'today': 'Bugün',
        'week': 'Bu Hafta', 
        'month': 'Bu Ay',
        'year': 'Bu Yıl',
        
    };
    
    // Header'a period bilgisi ekle (istersen)
    console.log(`📅 Aktif period: ${periodText[period] || periodText.custom}`);
}

// Chart type switching
function switchChartType(chartId, newType) {
    const chart = chartInstances[chartId];
    if (!chart) return;
    
    chart.config.type = newType;
    chart.update();
}

// Export functions
function exportToPDF() {
      // Basit rapor metni oluştur
    let reportContent = `
    📊 ENVANTER RAPORU
    ===================
    
    Rapor Tarihi: ${new Date().toDateString()}
    
    📈 ÖZET BİLGİLER:
    `;
    
        if (inventory && inventory.products) {
            const stockStatus = calculateStockStatus();
            const totalProducts = inventory.products.length;
            
            reportContent += `
    - Toplam Ürün: ${totalProducts} adet
    - Stokta Var: ${stockStatus.inStock} ürün  
    - Düşük Stok: ${stockStatus.lowStock} ürün
    - Stokta Yok: ${stockStatus.outOfStock} ürün
    
    📋 ÜRÜN LİSTESİ:
    ===============
    `;
    
            inventory.products.forEach((product, index) => {
                reportContent += `
    ${index + 1}. ${product.name}
       Kod: ${product.code}
       Kategori: ${product.category}
       Miktar: ${product.quantity} ${product.unit}
       Fiyat: ${product.salePrice} TL
       Durum: ${getStockStatusText(product.getStockStatus())}
    `;
            });
        }
    
        // Yeni pencerede göster ve print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Envanter Raporu</title>
                <style>
                    body { font-family: monospace; margin: 20px; line-height: 1.6; }
                    pre { white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <pre>${reportContent}</pre>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        console.log('✅ PDF print penceresi açıldı');
}

function exportToExcel() {
    console.log('📊 Excel export başlatılıyor...');
    
    if (!inventory || !inventory.products || inventory.products.length === 0) {
        alert('📊 Export edilecek ürün bulunamadı!');
        return;
    }
    
    // Excel verisini hazırla
    const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Miktar', 'Birim', 'Alış Fiyatı', 'Satış Fiyatı', 'Toplam Değer', 'Stok Durumu', 'Ekleme Tarihi'];
    
    const rows = inventory.products.map(product => [
        product.code,
        product.name,
        product.category,
        product.quantity,
        product.unit,
        product.costPrice,
        product.salePrice,
        product.getTotalValue(),
        getStockStatusText(product.getStockStatus()),
        new Date(product.createdAt).toLocaleDateString('tr-TR')
    ]);
    
    // CSV formatında oluştur
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(',') + '\n';
    
    rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    // Dosyayı indir
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Envanter_Raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Excel/CSV raporu oluşturuldu');
}


function exportToImage() {
    if (!chartInstances || Object.keys(chartInstances).length === 0) {
        alert('🖼️ Export edilecek grafik bulunamadı!');
        return;
    }
    
    // Canvas'ları birleştirip tek resim yap
    createCombinedChartImage();
}

function createCombinedChartImage() {
    // Yeni canvas oluştur
    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');
    
    // Canvas boyutları
    combinedCanvas.width = 1200;
    combinedCanvas.height = 800;
    
    // Arka plan
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
    
    // Başlık
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Envanter Raporları', combinedCanvas.width / 2, 40);
    
    // Tarih
    ctx.font = '14px Arial';
    ctx.fillText(new Date().toLocaleDateString('tr-TR'), combinedCanvas.width / 2, 65);
    
    // Grafikleri yerleştir
    let yOffset = 100;
    let xOffset = 50;
    const chartWidth = 500;
    const chartHeight = 300;
    
    const chartKeys = Object.keys(chartInstances);
    
    chartKeys.forEach((chartKey, index) => {
        const chart = chartInstances[chartKey];
        if (chart && chart.canvas) {
            // Grafik konumu hesapla
            const x = (index % 2) * (chartWidth + 100) + xOffset;
            const y = Math.floor(index / 2) * (chartHeight + 50) + yOffset;
            
            // Grafik başlığı
            ctx.fillStyle = '#34495e';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            
            const titles = {
                'stockChart': '🎯 Stok Durumu',
                'categoryChart': '📂 Kategori Dağılımı',
                'valueChart': '💎 Değer Analizi',
                'trendChart': '📊 Trend Analizi'
            };
            
            ctx.fillText(titles[chartKey] || chartKey, x, y - 10);
            
            // Grafiği çiz
            ctx.drawImage(chart.canvas, x, y, chartWidth, chartHeight);
        }
    });
    
    // Resmi indir
    const link = document.createElement('a');
    link.download = `Envanter_Grafikleri_${new Date().toISOString().split('T')[0]}.png`;
    link.href = combinedCanvas.toDataURL();
    link.click();
    
    console.log('✅ Grafik resmi oluşturuldu');
}

function refreshReports() {
    console.log('🔄 Refreshing reports...');
    initializeReports();
}

// Initialize reports when reports tab is shown
document.addEventListener('DOMContentLoaded', function() {
    // Override showTab to initialize reports
    const originalShowTab = InventoryManager.prototype.showTab;
    InventoryManager.prototype.showTab = function(tabName) {
        originalShowTab.call(this, tabName);
        
        if (tabName === 'reports') {
            setTimeout(() => {
                initializeReports();
            }, 100);
        }
    };
});
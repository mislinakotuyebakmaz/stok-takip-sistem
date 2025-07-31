const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Stok Takip Sistemi API',
            version: '1.0.0',
            description: 'Stok takip sistemi için RESTful API dokümantasyonu',
            contact: {
                name: 'API Support',
                email: 'support@stoktakip.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Product: {
                    type: 'object',
                    required: ['code', 'name', 'category', 'quantity', 'costPrice', 'salePrice'],
                    properties: {
                        code: {
                            type: 'string',
                            description: 'Ürün kodu'
                        },
                        name: {
                            type: 'string',
                            description: 'Ürün adı'
                        },
                        category: {
                            type: 'string',
                            enum: ['Elektronik', 'Giyim', 'Ev & Bahçe', 'Spor', 'Kitap', 'Kozmetik', 'Gıda', 'Oyuncak', 'Diğer']
                        },
                        quantity: {
                            type: 'integer',
                            minimum: 0
                        },
                        minStock: {
                            type: 'integer',
                            minimum: 0,
                            default: 10
                        },
                        costPrice: {
                            type: 'number',
                            minimum: 0
                        },
                        salePrice: {
                            type: 'number',
                            minimum: 0
                        },
                        supplier: {
                            type: 'string'
                        },
                        description: {
                            type: 'string'
                        },
                        images: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    url: {
                                        type: 'string'
                                    },
                                    isPrimary: {
                                        type: 'boolean'
                                    },
                                    uploadedAt: {
                                        type: 'string',
                                        format: 'date-time'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./routes/*.js'] // routes klasöründeki tüm js dosyaları
};

// Swagger UI özel ayarları
const swaggerUiOptions = {
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin-bottom: 20px }
        .swagger-ui .scheme-container { margin: 20px 0 }
    `,
    customSiteTitle: "Stok Takip API Dokümantasyonu",
    swaggerOptions: {
        persistAuthorization: true, // Token'ı hatırla
        docExpansion: 'none', // Başlangıçta kapalı
        filter: true, // Arama kutusu
        tryItOutEnabled: true // Try it out aktif
    }
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs, swaggerUiOptions };
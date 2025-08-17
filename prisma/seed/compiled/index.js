"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require('bcryptjs');
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPassword, admin, userPassword, user, categories, _i, categories_1, category, createdCategory, electronica, moda, deportes, products, _a, products_1, product, categories_3, productData, createdProduct, _b, categories_2, category, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 19, 20, 22]);
                    return [4 /*yield*/, bcrypt.hash('admin123', 10)];
                case 1:
                    adminPassword = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@tiendaweb.com' },
                            update: {},
                            create: {
                                email: 'admin@tiendaweb.com',
                                name: 'Administrador',
                                password: adminPassword,
                                role: 'ADMIN',
                            },
                        })];
                case 2:
                    admin = _c.sent();
                    console.log('Usuario administrador creado:', admin.email);
                    return [4 /*yield*/, bcrypt.hash('user123', 10)];
                case 3:
                    userPassword = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'usuario@example.com' },
                            update: {},
                            create: {
                                email: 'usuario@example.com',
                                name: 'Usuario Ejemplo',
                                password: userPassword,
                                role: 'USER',
                            },
                        })];
                case 4:
                    user = _c.sent();
                    console.log('Usuario normal creado:', user.email);
                    categories = [
                        {
                            name: 'Electrónica',
                            description: 'Productos electrónicos y gadgets',
                            slug: 'electronica',
                            image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop',
                        },
                        {
                            name: 'Moda',
                            description: 'Ropa, calzado y accesorios',
                            slug: 'moda',
                            image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
                        },
                        {
                            name: 'Hogar',
                            description: 'Productos para el hogar y decoración',
                            slug: 'hogar',
                            image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=2074&auto=format&fit=crop',
                        },
                        {
                            name: 'Deportes',
                            description: 'Artículos deportivos y fitness',
                            slug: 'deportes',
                            image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
                        },
                    ];
                    _i = 0, categories_1 = categories;
                    _c.label = 5;
                case 5:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 8];
                    category = categories_1[_i];
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { slug: category.slug },
                            update: {},
                            create: category,
                        })];
                case 6:
                    createdCategory = _c.sent();
                    console.log("Categor\u00EDa creada: ".concat(createdCategory.name));
                    _c.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8: return [4 /*yield*/, prisma.category.findUnique({
                        where: { slug: 'electronica' },
                    })];
                case 9:
                    electronica = _c.sent();
                    return [4 /*yield*/, prisma.category.findUnique({
                            where: { slug: 'moda' },
                        })];
                case 10:
                    moda = _c.sent();
                    return [4 /*yield*/, prisma.category.findUnique({
                            where: { slug: 'deportes' },
                        })];
                case 11:
                    deportes = _c.sent();
                    if (!(electronica && moda && deportes)) return [3 /*break*/, 18];
                    products = [
                        {
                            name: 'Smartphone XYZ',
                            description: 'El último smartphone con características avanzadas y gran rendimiento.',
                            price: 299.99,
                            stock: 50,
                            slug: 'smartphone-xyz',
                            images: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=2127&auto=format&fit=crop',
                            featured: true,
                            categories: [electronica],
                        },
                        {
                            name: 'Auriculares Bluetooth',
                            description: 'Auriculares inalámbricos con cancelación de ruido y gran calidad de sonido.',
                            price: 89.99,
                            stock: 100,
                            slug: 'auriculares-bluetooth',
                            images: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop',
                            featured: true,
                            categories: [electronica],
                        },
                        {
                            name: 'Zapatillas Running',
                            description: 'Zapatillas deportivas ideales para correr largas distancias con gran comodidad.',
                            price: 79.99,
                            stock: 30,
                            slug: 'zapatillas-running',
                            images: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop',
                            featured: true,
                            categories: [deportes],
                        },
                        {
                            name: 'Smart TV 43"',
                            description: 'Televisor inteligente con resolución 4K y acceso a múltiples plataformas de streaming.',
                            price: 399.99,
                            stock: 25,
                            slug: 'smart-tv-43',
                            images: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=2070&auto=format&fit=crop',
                            featured: true,
                            categories: [electronica],
                        },
                        {
                            name: 'Camiseta Deportiva',
                            description: 'Camiseta transpirable ideal para actividades deportivas.',
                            price: 29.99,
                            stock: 100,
                            slug: 'camiseta-deportiva',
                            images: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1974&auto=format&fit=crop',
                            featured: false,
                            categories: [deportes],
                        },
                        {
                            name: 'Jeans Slim Fit',
                            description: 'Jeans de corte ajustado y gran calidad de tela.',
                            price: 49.99,
                            stock: 80,
                            slug: 'jeans-slim-fit',
                            images: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1926&auto=format&fit=crop',
                            featured: false,
                            categories: [moda],
                        },
                    ];
                    _a = 0, products_1 = products;
                    _c.label = 12;
                case 12:
                    if (!(_a < products_1.length)) return [3 /*break*/, 18];
                    product = products_1[_a];
                    categories_3 = product.categories, productData = __rest(product, ["categories"]);
                    return [4 /*yield*/, prisma.product.upsert({
                            where: { slug: productData.slug },
                            update: {},
                            create: productData,
                        })];
                case 13:
                    createdProduct = _c.sent();
                    console.log("Producto creado: ".concat(createdProduct.name));
                    _b = 0, categories_2 = categories_3;
                    _c.label = 14;
                case 14:
                    if (!(_b < categories_2.length)) return [3 /*break*/, 17];
                    category = categories_2[_b];
                    return [4 /*yield*/, prisma.productCategory.upsert({
                            where: {
                                productId_categoryId: {
                                    productId: createdProduct.id,
                                    categoryId: category.id,
                                },
                            },
                            update: {},
                            create: {
                                productId: createdProduct.id,
                                categoryId: category.id,
                            },
                        })];
                case 15:
                    _c.sent();
                    _c.label = 16;
                case 16:
                    _b++;
                    return [3 /*break*/, 14];
                case 17:
                    _a++;
                    return [3 /*break*/, 12];
                case 18:
                    console.log('Datos de prueba creados correctamente');
                    return [3 /*break*/, 22];
                case 19:
                    error_1 = _c.sent();
                    console.error('Error al crear datos de prueba:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 22];
                case 20: return [4 /*yield*/, prisma.$disconnect()];
                case 21:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 22: return [2 /*return*/];
            }
        });
    });
}
main();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: "Security",
    requires: ["Core"],
    
    register(container) {
        console.log("Регистрация модуля Security");
        
        const config = this.loadConfig();
        
        const errors = this.validateConfig(config);
        if (errors.length > 0) {
            console.error("Ошибки конфигурации Security:");
            errors.forEach(e => console.error(`  - ${e}`));
            process.exit(1);
        }
        
        console.log(`  Режим: ${config.mode}`);
        console.log(`  Доверенные источники: ${config.trustedOrigins.join(', ')}`);
        console.log(`  Лимиты: чтение ${config.rateLimits.readPerMinute}/мин, запись ${config.rateLimits.writePerMinute}/мин`);
        
        container.register("securityConfig", config);
        container.register("rateLimiter", this.createRateLimiter(config));
        container.register("originValidator", this.createOriginValidator(config));
        container.register("securityMiddleware", () => {
            return this.createSecurityMiddleware(container);
        });
    },
    
    loadConfig() {
        const fileConfig = this.readFileConfig();
        const envConfig = this.readEnvConfig();
        const argsConfig = this.readArgsConfig();
        
        return {
            mode: argsConfig.mode || envConfig.mode || fileConfig.mode || "учебный",
            trustedOrigins: argsConfig.trustedOrigins || envConfig.trustedOrigins || fileConfig.trustedOrigins || ["http://localhost:3000"],
            rateLimits: {
                readPerMinute: argsConfig.readPerMinute || envConfig.readPerMinute || fileConfig.rateLimits?.readPerMinute || 60,
                writePerMinute: argsConfig.writePerMinute || envConfig.writePerMinute || fileConfig.rateLimits?.writePerMinute || 20
            }
        };
    },
    
    readFileConfig() {
        const configPath = path.resolve(__dirname, '..', 'config', 'security.json');
        console.log(`  Загрузка конфигурации из файла: ${configPath}`);
        
        if (fs.existsSync(configPath)) {
            try {
                const data = fs.readFileSync(configPath, 'utf8');
                const parsed = JSON.parse(data);
                console.log(`  Конфигурация из файла загружена успешно`);
                return parsed;
            } catch (error) {
                console.error(`  Ошибка чтения файла конфигурации: ${error.message}`);
            }
        } else {
            console.log(`  Файл конфигурации не найден: ${configPath}`);
        }
        
        return null;
    },
    
    readEnvConfig() {
        const envConfig = {};
        
        if (process.env.SECURITY_MODE) {
            envConfig.mode = process.env.SECURITY_MODE;
            console.log(`  Переменная окружения SECURITY_MODE: ${envConfig.mode}`);
        }
        
        if (process.env.TRUSTED_ORIGINS) {
            envConfig.trustedOrigins = process.env.TRUSTED_ORIGINS.split(',').map(x => x.trim());
            console.log(`  Переменная окружения TRUSTED_ORIGINS: ${envConfig.trustedOrigins.join(', ')}`);
        }
        
        if (process.env.RATE_LIMIT_READ) {
            envConfig.readPerMinute = Number(process.env.RATE_LIMIT_READ);
            console.log(`  Переменная окружения RATE_LIMIT_READ: ${envConfig.readPerMinute}`);
        }
        
        if (process.env.RATE_LIMIT_WRITE) {
            envConfig.writePerMinute = Number(process.env.RATE_LIMIT_WRITE);
            console.log(`  Переменная окружения RATE_LIMIT_WRITE: ${envConfig.writePerMinute}`);
        }
        
        return envConfig;
    },
    
    readArgsConfig() {
        console.log("  Чтение аргументов командной строки:", process.argv.slice(2));
        
        const args = {};
        
        for (const arg of process.argv.slice(2)) {
            console.log(`  Обработка аргумента: ${arg}`);
            if (arg.startsWith('--')) {
                const [key, value] = arg.slice(2).split('=');
                console.log(`    Ключ: ${key}, Значение: ${value}`);
                
                if (key === 'security-mode') {
                    args.mode = value;
                    console.log(`    Установлен режим: ${args.mode}`);
                }
                if (key === 'trusted-origins') {
                    args.trustedOrigins = value.split(',').map(x => x.trim());
                    console.log(`    Установлены доверенные источники: ${args.trustedOrigins}`);
                }
                if (key === 'read-limit') {
                    args.readPerMinute = Number(value);
                    console.log(`    Установлено ограничение на чтение: ${args.readPerMinute}`);
                }
                if (key === 'write-limit') {
                    args.writePerMinute = Number(value);
                    console.log(`    Установлено ограничение на запись: ${args.writePerMinute}`);
                }
            }
        }
        
        console.log("  Итоговые аргументы:", args);
        return args;
    },
    
    validateConfig(config) {
        const errors = [];
        
        if (!config.mode || (config.mode !== 'учебный' && config.mode !== 'боевой')) {
            errors.push(`Режим "${config.mode}" недопустим. Используйте "учебный" или "боевой"`);
        }
        
        if (!config.trustedOrigins || config.trustedOrigins.length === 0) {
            errors.push("Список доверенных источников не может быть пустым");
        } else {
            for (const origin of config.trustedOrigins) {
                if (!origin.includes('://')) {
                    errors.push(`Некорректный URL (отсутствует ://): "${origin}". Правильный формат: http://localhost:3000`);
                    continue;
                }
                
                try {
                    const url = new URL(origin);
                    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                        errors.push(`Недопустимый протокол в "${origin}". Используйте http или https`);
                    }
                    if (!url.hostname || url.hostname === '') {
                        errors.push(`Отсутствует хост в URL: "${origin}"`);
                    }
                } catch {
                    errors.push(`Некорректный URL доверенного источника: "${origin}"`);
                }
            }
        }
        
        const read = config.rateLimits?.readPerMinute;
        const write = config.rateLimits?.writePerMinute;
        
        if (!Number.isInteger(read) || read <= 0) {
            errors.push(`readPerMinute должен быть положительным целым числом. Текущее значение: ${read}`);
        }
        
        if (!Number.isInteger(write) || write <= 0) {
            errors.push(`writePerMinute должен быть положительным целым числом. Текущее значение: ${write}`);
        }
        
        if (read && write && write > read) {
            errors.push(`Лимит записи (${write}) не может превышать лимит чтения (${read})`);
        }
        
        return errors;
    },
    
    createRateLimiter(config) {
        const store = new Map();
        const limits = config.rateLimits;
        
        return {
            allow(req) {
                const key = req.ip || req.socket.remoteAddress;
                const now = Date.now();
                const windowMs = 60000;
                
                let bucket = store.get(key);
                if (!bucket || now > bucket.resetAt) {
                    bucket = { resetAt: now + windowMs, reads: 0, writes: 0 };
                }
                
                const isWrite = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
                
                if (isWrite) {
                    if (bucket.writes >= limits.writePerMinute) {
                        return false;
                    }
                    bucket.writes++;
                    store.set(key, bucket);
                    return true;
                } else {
                    if (bucket.reads >= limits.readPerMinute) {
                        return false;
                    }
                    bucket.reads++;
                    store.set(key, bucket);
                    return true;
                }
            }
        };
    },
    
    createOriginValidator(config) {
        const trustedOrigins = config.trustedOrigins;
        
        return {
            isValid(origin) {
                if (!origin) return false;
                return trustedOrigins.includes(origin);
            },
            getTrustedOrigins() {
                return trustedOrigins;
            }
        };
    },
    
    createSecurityMiddleware(container) {
        const config = container.get("securityConfig");
        const rateLimiter = container.get("rateLimiter");
        const originValidator = container.get("originValidator");
        
        return (req, res, next) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            
            const origin = req.headers.origin;
            if (origin) {
                if (!originValidator.isValid(origin)) {
                    if (config.mode === "учебный") {
                        console.log(`Заблокирован запрос с недоверенного источника: ${origin}`);
                    }
                    return res.status(403).json({
                        code: "FORBIDDEN_ORIGIN",
                        message: config.mode === "учебный" 
                            ? `Источник ${origin} не в списке доверенных`
                            : "Доступ запрещен",
                        requestId: req.id
                    });
                }
                
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
                res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
            } else {
                res.setHeader("Access-Control-Allow-Origin", "*");
            }
            
            if (req.method === "OPTIONS") {
                return res.status(204).end();
            }
            
            if (!rateLimiter.allow(req)) {
                return res.status(429).json({
                    code: "RATE_LIMIT_EXCEEDED",
                    message: config.mode === "учебный"
                        ? "Слишком много запросов. Попробуйте позже."
                        : "Too many requests",
                    requestId: req.id
                });
            }
            
            next();
        };
    },
    
    setupRoutes(app, container) {
        console.log("Настройка маршрутов модуля Security");
        
        const config = container.get("securityConfig");
        
        app.get("/security/mode", (req, res) => {
            res.json({
                mode: config.mode,
                timestamp: new Date().toISOString()
            });
        });
        
        app.get("/security/limits", (req, res) => {
            res.json(config.rateLimits);
        });
    },
    
    async init(container) {
        const clock = container.get("clock");
        const config = container.get("securityConfig");
        console.log(`[${clock.now()}] Модуль Security инициализирован`);
        console.log(`  Режим: ${config.mode}`);
        console.log(`  Доверенные источники: ${config.trustedOrigins.join(', ')}`);
        console.log(`  Лимиты: чтение ${config.rateLimits.readPerMinute}/мин, запись ${config.rateLimits.writePerMinute}/мин`);
    }
};
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const JWT_EXPIRES_IN = '24h';

export default {
    name: "Auth",
    requires: ["Core"],
    
    register(container) {
        console.log("Регистрация модуля Auth");
        
        container.register("auth", {
            getCurrentUser(req) {
                try {
                    const authHeader = req.headers.authorization;
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        return null;
                    }
                    
                    const token = authHeader.substring(7);
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const storage = container.get("storage");
                    
                    return storage.findUserById(decoded.userId);
                } catch (error) {
                    return null;
                }
            },
            
            async login(email, password) {
                const storage = container.get("storage");
                const user = storage.findUserByEmail(email);
                
                if (!user) {
                    return null;
                }
                
                const isValidPassword = await bcrypt.compare(password, user.passwordHash);
                
                if (!isValidPassword) {
                    return null;
                }
                
                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email,
                        name: user.name
                    },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES_IN }
                );
                
                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    },
                    token,
                    expiresIn: JWT_EXPIRES_IN
                };
            },
            
            validateToken(token) {
                try {
                    return jwt.verify(token, JWT_SECRET);
                } catch (error) {
                    return null;
                }
            },
            
            generateTokenForUser(userId) {
                const storage = container.get("storage");
                const user = storage.findUserById(userId);
                
                if (!user) {
                    return null;
                }
                
                return jwt.sign(
                    {
                        userId: user.id,
                        email: user.email,
                        name: user.name
                    },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES_IN }
                );
            }
        });

        container.register("authMiddleware", () => {
            const auth = container.get("auth");
            return (req, res, next) => {
                const user = auth.getCurrentUser(req);
                
                if (!user) {
                    return res.status(401).json({
                        code: "UNAUTHORIZED",
                        message: "Не выполнена авторизация. Отсутствует или недействительный токен.",
                        requestId: req.id
                    });
                }
                
                req.user = user;
                next();
            };
        });
    },
    
    setupRoutes(app, container) {
        console.log("Настройка маршрутов модуля Auth");
        
        const storage = container.get("storage");
        const clock = container.get("clock");
        const auth = container.get("auth");
        
        app.post("/auth/register", async (req, res, next) => {
            try {
                const { email, name, password } = req.body;
                
                if (!email || !password) {
                    const error = new Error("Email и пароль обязательны");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                if (password.length < 6) {
                    const error = new Error("Пароль должен быть не менее 6 символов");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                if (storage.findUserByEmail(email)) {
                    const error = new Error("Пользователь с таким email уже существует");
                    error.statusCode = 409;
                    error.code = "USER_EXISTS";
                    throw error;
                }
                
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);
                
                const newUser = {
                    id: uuidv4(),
                    email,
                    name: name || email.split('@')[0],
                    passwordHash,
                    createdAt: clock.now()
                };
                
                const user = storage.addUser(newUser);
                const token = auth.generateTokenForUser(user.id);
                
                res.status(201).json({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        createdAt: user.createdAt
                    },
                    token,
                    expiresIn: "24h"
                });
                
            } catch (error) {
                next(error);
            }
        });
        
        app.post("/auth/login", async (req, res, next) => {
            try {
                const { email, password } = req.body;
                
                if (!email || !password) {
                    const error = new Error("Email и пароль обязательны");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                const result = await auth.login(email, password);
                
                if (!result) {
                    const error = new Error("Неверный email или пароль");
                    error.statusCode = 401;
                    error.code = "INVALID_CREDENTIALS";
                    throw error;
                }
                
                console.log(`[${clock.now()}] Пользователь ${result.user.email} вошел в систему`);
                
                res.json(result);
                
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/auth/me", (req, res, next) => {
            try {
                const user = auth.getCurrentUser(req);
                
                if (!user) {
                    const error = new Error("Не авторизован");
                    error.statusCode = 401;
                    error.code = "UNAUTHORIZED";
                    throw error;
                }
                
                res.json({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    createdAt: user.createdAt
                });
                
            } catch (error) {
                next(error);
            }
        });
        
        app.post("/auth/refresh", (req, res, next) => {
            try {
                const user = auth.getCurrentUser(req);
                
                if (!user) {
                    const error = new Error("Не авторизован");
                    error.statusCode = 401;
                    error.code = "UNAUTHORIZED";
                    throw error;
                }
                
                const newToken = auth.generateTokenForUser(user.id);
                
                res.json({
                    token: newToken,
                    expiresIn: "24h"
                });
                
            } catch (error) {
                next(error);
            }
        });
        
        app.post("/auth/logout", (req, res) => {
            res.json({
                message: "Успешный выход из системы"
            });
        });
    },
    
    async init(container) {
        const clock = container.get("clock");
        console.log(`[${clock.now()}] модуль Auth инициализирован`);
    }
};
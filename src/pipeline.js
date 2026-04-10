import express from 'express';
import { requestIdMiddleware, requestLoggerMiddleware } from '../middleware/index.js';

export function setupPipeline(app, container) {
    console.log("Настройка конвейера обработки запросов");
    
    app.use(express.json());
    app.use(requestIdMiddleware);
    app.use(requestLoggerMiddleware);

    console.log("Проверка securityMiddleware в container:", container.has("securityMiddleware"));
    
    if (container.has("securityMiddleware")) {
        const securityMiddlewareFactory = container.get("securityMiddleware");
        const securityMiddleware = securityMiddlewareFactory();
        
        app.use(securityMiddleware);
        console.log("Security middleware добавлен в конвейер");
    } else {
        console.log("Security middleware не найден в container!");
    }
    
    console.log("Конвейер настроен");
}

export function setupErrorHandler(app) {
    console.log("Настройка обработчика ошибок");
    
    import('../middleware/errorHandler.js').then(({ errorHandlerMiddleware }) => {
        app.use(errorHandlerMiddleware);
        console.log("Обработчик ошибок настроен");
    });
}
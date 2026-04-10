import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import 'dotenv/config';

import { Container } from './container.js';
import { loadModulesFromConfig, buildOrder } from './moduleLoader.js';
import { setupPipeline, setupErrorHandler } from './pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
    try {        
        const configPath = path.resolve(__dirname, '..', 'config', 'modules.json');
        const modulesDir = path.resolve(__dirname, '..', 'modules');
        
        console.log(`Путь к конфигурации: ${configPath}`);
        console.log(`Путь к модулям: ${modulesDir}`);
        
        try {
            await fs.access(configPath);
            console.log("Файл конфигурации найден");
        } catch {
            throw new Error(`Файл конфигурации не найден: ${configPath}`);
        }
        
        try {
            await fs.access(modulesDir);
            console.log("Директория модулей найдена");
        } catch {
            throw new Error(`Директория модулей не найдена: ${modulesDir}`);
        }
        
        const modules = await loadModulesFromConfig(configPath, modulesDir);
        const enabledNames = Array.from(modules.keys());
        
        const orderedModules = buildOrder(modules, enabledNames);
        
        const container = new Container();
        const app = express();

        const securityModule = modules.get("Security");
        if (securityModule && securityModule.register) {
            securityModule.register(container);
        }

        setupPipeline(app, container);
        
        for (const module of orderedModules) {
            if (module.name === "Security") continue;
            if (module.register) {
                try {
                    module.register(container);
                } catch (error) {
                    console.error(`  Ошибка в ${module.name}.register:`, error.message);
                    throw error;
                }
            }
        }
        
        console.log("Настройка маршрутов");
        for (const module of orderedModules) {
            if (module.setupRoutes) {
                try {
                    module.setupRoutes(app, container);
                } catch (error) {
                    console.error(`  Ошибка в ${module.name}.setupRoutes:`, error.message);
                    throw error;
                }
            }
        }
        
        console.log("Инициализация модулей");
        for (const module of orderedModules) {
            if (module.init) {
                try {
                    await module.init(container);
                } catch (error) {
                    console.error(`  Ошибка в ${module.name}.init:`, error.message);
                    throw error;
                }
            }
        }
        
        await setupErrorHandler(app);
        
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        const port = config.port || 3000;
        
        app.listen(port, () => {
            console.log(`Сервер запущен на http://localhost:${port}`);
        });
        
    } catch (error) {
        console.error("Ошибка");
        console.error(error.message);
        if (error.stack) {
            console.error("Детали:");
            console.error(error.stack.split('\n').slice(1, 5).join('\n'));
        }
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Необработанное исключение:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Необработанный reject:', reason);
    process.exit(1);
});

bootstrap();
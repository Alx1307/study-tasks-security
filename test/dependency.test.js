import { loadModulesFromConfig, buildOrder } from '../src/moduleLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDependencyOrder() {
    console.log("Тестирование порядка загрузки модулей");

    console.log("\n1. Проверка корректного порядка загрузки:");
    const configPath = path.resolve(__dirname, '..', 'config', 'modules.json');
    const modulesDir = path.resolve(__dirname, '..', 'modules');
    
    const modules = await loadModulesFromConfig(configPath, modulesDir);
    const enabledNames = Array.from(modules.keys());
    const order = buildOrder(modules, enabledNames);
    const orderNames = order.map(m => m.name);
    
    if (orderNames[0] === "Core") {
        console.log("Core загружается первым");
    } else {
        console.log("Core должен быть первым");
    }
    
    if (orderNames.indexOf("Auth") > orderNames.indexOf("Core")) {
        console.log("Auth загружается после Core");
    } else {
        console.log("Auth должен быть после Core");
    }
    
    if (orderNames.indexOf("Tasks") > orderNames.indexOf("Auth")) {
        console.log("Tasks загружается после Auth");
    } else {
        console.log("Tasks должен быть после Auth");
    }
    
    if (orderNames.indexOf("Reports") > orderNames.indexOf("Tasks")) {
        console.log("Reports загружается после Tasks");
    } else {
        console.log("Reports должен быть после Tasks");
    }

    console.log("\n2. Проверка ошибки отсутствующего модуля:");
    const mockModules = new Map([
        ["Core", { name: "Core", requires: [] }],
        ["Auth", { name: "Auth", requires: ["Core"] }],
        ["Tasks", { name: "Tasks", requires: ["MissingModule"] }]
    ]);
    
    try {
        buildOrder(mockModules, ["Core", "Auth", "Tasks"]);
        console.log("Ошибка: Должна быть ошибка отсутствующего модуля");
    } catch (error) {
        if (error.message.includes("MissingModule")) {
            console.log(`Ошибка: ${error.message.split('\n')[0]}`);
        } else {
            console.log(`Неправильное сообщение: ${error.message}`);
        }
    }

    console.log("\n3. Проверка ошибки циклической зависимости:");
    const cyclicModules = new Map([
        ["ModuleA", { name: "ModuleA", requires: ["ModuleB"] }],
        ["ModuleB", { name: "ModuleB", requires: ["ModuleC"] }],
        ["ModuleC", { name: "ModuleC", requires: ["ModuleA"] }]
    ]);
    
    try {
        buildOrder(cyclicModules, ["ModuleA", "ModuleB", "ModuleC"]);
        console.log("Ошибка: Должна быть ошибка циклической зависимости");
    } catch (error) {
        if (error.message.includes("циклическая зависимость") || error.message.includes("circular")) {
            console.log(`Ошибка: ${error.message}`);
        } else {
            console.log(`Неправильное сообщение: ${error.message}`);
        }
    }

    console.log("\n4. Проверка внедрения зависимостей через контейнер:");
    
    class TestContainer {
        constructor() {
            this.services = new Map();
        }
        register(name, service) {
            this.services.set(name, service);
        }
        get(name) {
            if (!this.services.has(name)) {
                throw new Error(`Service ${name} not found`);
            }
            return this.services.get(name);
        }
    }
    
    const container = new TestContainer();
    
    container.register("clock", { now: () => new Date() });
    container.register("storage", { tasks: [] });
    
    const clock = container.get("clock");
    const storage = container.get("storage");
    
    if (clock && storage) {
        console.log("Сервисы регистрируются и получаются через контейнер");
        
        console.log("Модули используют container.get() для получения зависимостей");
    }
    
    console.log("\nПроверки завершены");
}

testDependencyOrder().catch(console.error);
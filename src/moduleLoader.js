import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

export async function loadModulesFromConfig(configPath, modulesDir) {
    console.log("Загрузка модулей:");
    
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    const enabledModules = config.modules || [];
    
    if (enabledModules.length === 0) {
        throw new Error("В конфигурации не указаны модули для загрузки");
    }
    
    console.log(`Модули в конфигурации: ${enabledModules.join(", ")}`);
    
    const modules = new Map();
    
    for (const moduleName of enabledModules) {
        try {
            const modulePath = path.join(modulesDir, `${moduleName}.js`);
            console.log(`Загрузка модуля: ${moduleName}`);
            console.log(`  Путь: ${modulePath}`);
            
            try {
                await fs.access(modulePath);
            } catch {
                throw new Error(`Файл модуля не найден: ${modulePath}`);
            }
            
            const moduleUrl = pathToFileURL(modulePath).href;
            const moduleExports = await import(moduleUrl);
            const module = moduleExports.default;
            
            if (!module) {
                throw new Error("Модуль не имеет default export");
            }
            
            if (!module.name) {
                throw new Error("Модуль должен иметь поле 'name'");
            }
            
            modules.set(module.name, module);
            console.log(`  Модуль "${module.name}" загружен`);
            console.log(`  Зависимости: ${module.requires?.length ? module.requires.join(", ") : "нет"}`);
            
        } catch (error) {
            console.error(`  Ошибка загрузки ${moduleName}:`, error.message);
            throw error;
        }
    }
    
    console.log(`Загружено модулей: ${modules.size}`);
    return modules;
}

export function buildOrder(modules, enabledNames) {
    console.log("Построение порядка загрузки модулей");
    
    const result = [];
    const visited = new Set();
    const stack = new Set();
    
    for (const [name, module] of modules) {
        const requires = module.requires || [];
        for (const dep of requires) {
            if (!modules.has(dep)) {
                throw new Error(
                    `Модуль "${name}" требует модуль "${dep}", который не загружен.\n` +
                    `Доступные модули: ${Array.from(modules.keys()).join(", ")}`
                );
            }
        }
    }
    
    function visit(name) {
        if (stack.has(name)) {
            const cycle = Array.from(stack).join(" → ");
            throw new Error(
                `Обнаружена циклическая зависимость: ${cycle} → ${name}`
            );
        }
        
        if (visited.has(name)) return;
        
        stack.add(name);
        
        const module = modules.get(name);
        const requires = module.requires || [];
        
        for (const dep of requires) {
            if (!enabledNames.includes(dep)) {
                throw new Error(
                    `Модуль "${name}" требует модуль "${dep}", который не включен в конфигурацию`
                );
            }
            visit(dep);
        }
        
        stack.delete(name);
        visited.add(name);
        result.push(module);
    }
    
    for (const name of enabledNames) {
        if (!visited.has(name)) {
            visit(name);
        }
    }
    
    console.log(`Порядок загрузки: ${result.map(m => m.name).join(" → ")}`);
    
    return result;
}
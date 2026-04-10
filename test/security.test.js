import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSecurity() {
    try {
        console.log("Тестирование безопасности");

        console.log("\n1. Проверка получения лимитов:");
        try {
            const limitsResponse = await axios.get(`${BASE_URL}/security/limits`, { timeout: 5000 });
            console.log("Статус:", limitsResponse.status);
            console.log("Лимиты:", limitsResponse.data);
        } catch (error) {
            console.log("Ошибка:", error.message);
        }

        console.log("\n2. Проверка режима работы:");
        try {
            const modeResponse = await axios.get(`${BASE_URL}/security/mode`, { timeout: 5000 });
            console.log("Статус:", modeResponse.status);
            console.log("Режим:", modeResponse.data.mode);
            console.log("Timestamp:", modeResponse.data.timestamp);
        } catch (error) {
            console.log("Ошибка:", error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log("Сервер не запущен");
                return;
            }
        }

        console.log("\n3. Проверка защитных заголовков:");
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
            console.log("X-Content-Type-Options:", healthResponse.headers['x-content-type-options']);
            console.log("X-Frame-Options:", healthResponse.headers['x-frame-options']);
            console.log("Cache-Control:", healthResponse.headers['cache-control']);
        } catch (error) {
            console.log("Ошибка:", error.message);
        }

        console.log("\n4. Проверка CORS (доверенный источник):");
        try {
            const corsResponse = await axios.get(`${BASE_URL}/health`, {
                headers: { 'Origin': 'http://localhost:3000' },
                timeout: 5000
            });
            console.log("Статус:", corsResponse.status);
            console.log("Access-Control-Allow-Origin:", corsResponse.headers['access-control-allow-origin']);
        } catch (error) {
            console.log("Ошибка:", error.message);
        }

        console.log("\n5. Проверка CORS (недоверенный источник):");
        try {
            await axios.get(`${BASE_URL}/health`, {
                headers: { 'Origin': 'http://evil.com' },
                timeout: 5000
            });
        } catch (error) {
            if (error.response) {
                console.log("Статус (ожидаемо):", error.response.status);
                console.log("Код ошибки:", error.response.data?.code);
                console.log("Сообщение:", error.response.data?.message);
            } else {
                console.log("Ошибка:", error.message);
            }
        }

        console.log("\n6. Проверка rate limiting (чтение):");
        const readLimits = [];
        for (let i = 1; i <= 65; i++) {
            try {
                const response = await axios.get(`${BASE_URL}/health`, { timeout: 1000 });
                if (i % 10 === 0) {
                    console.log(`  Запрос ${i}: успешно (статус ${response.status})`);
                }
                readLimits.push(response.status);
            } catch (error) {
                if (error.response?.status === 429) {
                    console.log(`  Запрос ${i}: заблокирован (статус ${error.response.status})`);
                    readLimits.push(error.response.status);
                    break;
                } else if (error.code === 'ECONNREFUSED') {
                    console.log(`  Сервер недоступен на запросе ${i}`);
                    break;
                }
            }
        }
        
        const successRead = readLimits.filter(s => s === 200).length;
        const blockedRead = readLimits.filter(s => s === 429).length;
        console.log(`  Итог: успешно ${successRead}, заблокировано ${blockedRead}`);

        console.log("\n7. Проверка rate limiting (запись):");
        const writeLimits = [];
        for (let i = 1; i <= 25; i++) {
            try {
                const response = await axios.post(`${BASE_URL}/auth/login`, {
                    email: "test@example.com",
                    password: "wrongpassword"
                }, { timeout: 1000 });
                if (i % 5 === 0) {
                    console.log(`  Запрос ${i}: статус ${response.status}`);
                }
                writeLimits.push(response.status);
            } catch (error) {
                if (error.response?.status === 401) {
                    if (i % 5 === 0) {
                        console.log(`  Запрос ${i}: ошибка авторизации (статус ${error.response.status})`);
                    }
                    writeLimits.push(error.response.status);
                } else if (error.response?.status === 429) {
                    console.log(`  Запрос ${i}: заблокирован (статус ${error.response.status})`);
                    writeLimits.push(error.response.status);
                    break;
                } else if (error.code === 'ECONNREFUSED') {
                    console.log(`  Сервер недоступен на запросе ${i}`);
                    break;
                }
            }
        }
        
        const successWrite = writeLimits.filter(s => s === 401).length;
        const blockedWrite = writeLimits.filter(s => s === 429).length;
        console.log(`  Итог: попыток ${successWrite}, заблокировано ${blockedWrite}`);

        console.log("\n8. Проверка разных лимитов для разных маршрутов:");
        
        console.log("  Быстрые GET запросы к /health:");
        const fastReads = [];
        for (let i = 1; i <= 10; i++) {
            try {
                await axios.get(`${BASE_URL}/health`, { timeout: 500 });
                fastReads.push(200);
            } catch (error) {
                fastReads.push(error.response?.status || 0);
            }
        }
        console.log(`    Блокировок: ${fastReads.filter(s => s === 429).length}`);

        console.log("  Быстрые POST запросы к /auth/login:");
        const fastWrites = [];
        for (let i = 1; i <= 10; i++) {
            try {
                await axios.post(`${BASE_URL}/auth/login`, {
                    email: "test@example.com",
                    password: "wrongpassword"
                }, { timeout: 500 });
                fastWrites.push(401);
            } catch (error) {
                if (error.response?.status === 429) {
                    fastWrites.push(429);
                } else {
                    fastWrites.push(error.response?.status || 0);
                }
            }
        }
        console.log(`    Блокировок: ${fastWrites.filter(s => s === 429).length}`);

        console.log("\nТестирование завершено успешно");

    } catch (error) {
        console.error("Ошибка тестирования:", error.message);
    }
}

testSecurity();
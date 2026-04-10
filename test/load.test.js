import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function loadTest() {
    console.log("Нагрузочное тестирование");
    console.log("Лимиты: 60 чтений/мин, 20 записей/мин\n");
    
    const results = {
        beforeLimit: [],
        afterLimit: []
    };
    
    console.log("1. Запросы до превышения лимита (1-60):");
    for (let i = 1; i <= 60; i++) {
        const start = Date.now();
        try {
            await axios.get(`${BASE_URL}/health`);
            const duration = Date.now() - start;
            results.beforeLimit.push(duration);
            if (i % 10 === 0) {
                console.log(`   Запрос ${i}: ${duration}ms`);
            }
        } catch (error) {
            console.log(`   Запрос ${i}: ошибка ${error.response?.status}`);
        }
    }
    
    console.log("\n2. Запросы после превышения лимита (61-70):");
    for (let i = 61; i <= 70; i++) {
        const start = Date.now();
        try {
            await axios.get(`${BASE_URL}/health`);
            const duration = Date.now() - start;
            results.afterLimit.push(duration);
            console.log(`   Запрос ${i}: ${duration}ms (успешно)`);
        } catch (error) {
            const duration = Date.now() - start;
            if (error.response?.status === 429) {
                console.log(`   Запрос ${i}: ${duration}ms (заблокирован - 429)`);
                results.afterLimit.push(duration);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log("\nСтатистика");
    const avgBefore = results.beforeLimit.reduce((a,b) => a + b, 0) / results.beforeLimit.length;
    const avgAfter = results.afterLimit.filter(d => d).length > 0 
        ? results.afterLimit.reduce((a,b) => a + b, 0) / results.afterLimit.filter(d => d).length 
        : 0;
    
    console.log(`Среднее время ответа до блокировки: ${avgBefore.toFixed(2)}ms`);
    console.log(`Среднее время ответа после блокировки: ${avgAfter.toFixed(2)}ms`);
    console.log(`Разница: ${(avgAfter - avgBefore).toFixed(2)}ms`);

    console.log("\nТестирование завершено успешно");
}

loadTest();
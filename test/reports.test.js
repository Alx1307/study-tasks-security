import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let authToken = null;

async function testReports() {
    try {
        console.log("Тестирование статистики");

        console.log("\n1. Регистрация пользователя:");
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: "reportsuser@example.com",
            name: "Reports User",
            password: "password123"
        });
        
        console.log("Пользователь зарегистрирован:", registerResponse.data.user.email);
        authToken = registerResponse.data.token;

        console.log("\n2. Создание задач для тестирования отчетов:");
        
        const task1 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Задача 1 - Новая",
            description: "Тестовая задача 1",
            status: 0,
            priority: "high",
            deadline: "2026-04-10"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 1 создана");
        
        const task2 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Задача 2 - В работе",
            description: "Тестовая задача 2",
            status: 1,
            priority: "medium",
            deadline: "2026-04-15"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 2 создана");
        
        const task3 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Задача 3 - Завершена",
            description: "Тестовая задача 3",
            status: 0,
            priority: "low",
            deadline: "2026-04-20"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 3 создана");
        
        const task4 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Задача 4 - Просрочена",
            description: "Тестовая задача 4",
            status: 0,
            priority: "high",
            deadline: "2026-03-01"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 4 создана");

        console.log("\n3. Обновление статусов задач:");
        
        await axios.patch(`${BASE_URL}/tasks/${task2.data.id}/status`, {
            status: 2
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 2 завершена");
        
        await axios.patch(`${BASE_URL}/tasks/${task3.data.id}/status`, {
            status: 1
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 3 в работе");

        console.log("\n4. Получение просроченных задач:");
        const overdueResponse = await axios.get(`${BASE_URL}/reports/overdue`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`Просроченных задач: ${overdueResponse.data.count}`);
        if (overdueResponse.data.tasks.length > 0) {
            console.log(`  Просроченные задачи: ${overdueResponse.data.tasks.map(t => t.title).join(", ")}`);
        }

        console.log("\n5. Получение статистики:");
        const statsResponse = await axios.get(`${BASE_URL}/reports/stats`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Статистика:");
        console.log(`  Всего задач: ${statsResponse.data.stats.total}`);
        console.log(`  Новых: ${statsResponse.data.stats.byStatus.new}`);
        console.log(`  В работе: ${statsResponse.data.stats.byStatus.inProgress}`);
        console.log(`  Завершено: ${statsResponse.data.stats.byStatus.completed}`);
        console.log(`  Просрочено: ${statsResponse.data.stats.byStatus.overdue}`);
        console.log(`  Процент выполнения: ${statsResponse.data.stats.completionRate}%`);
        console.log(`  Приоритеты: низкий=${statsResponse.data.stats.byPriority.low}, средний=${statsResponse.data.stats.byPriority.medium}, высокий=${statsResponse.data.stats.byPriority.high}`);

        console.log("\n6. Получение времени выполнения задач:");
        const timelineResponse = await axios.get(`${BASE_URL}/reports/completion-timeline`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Таймлайн завершенных задач:");
        Object.entries(timelineResponse.data.timeline).forEach(([date, count]) => {
            console.log(`  ${date}: ${count} задач(и)`);
        });
        console.log(`Всего завершено: ${timelineResponse.data.totalCompleted}`);

        console.log("\n7. Оценка продуктивности:");
        const productivityResponse = await axios.get(`${BASE_URL}/reports/productivity`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Продуктивность:");
        console.log(`  Оценка продуктивности: ${productivityResponse.data.productivityScore}%`);
        console.log(`  Завершенные задачи: ${productivityResponse.data.completedTasks}`);
        console.log(`  Ожидающие задачи: ${productivityResponse.data.pendingTasks}`);
        console.log(`  Примерное время до завершения: ${productivityResponse.data.estimatedHoursToComplete} часов`);

        console.log("\n8. Выполненные за выбранный период задачи:");
        const periodResponse = await axios.get(`${BASE_URL}/reports/tasks-by-period`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { days: 7 }
        });
        console.log(`Период: ${periodResponse.data.period}`);
        console.log("Данные по дням:");
        Object.entries(periodResponse.data.data).forEach(([date, data]) => {
            if (data.created > 0 || data.completed > 0) {
                console.log(`  ${date}: создано ${data.created}, завершено ${data.completed}`);
            }
        });

        console.log("\n9. Проверка доступа без авторизации:");
        try {
            await axios.get(`${BASE_URL}/reports/stats`);
            console.log("ОШИБКА: Должна быть ошибка 401");
        } catch (error) {
            if (error.response?.status === 401) {
                console.log("Ошибка 401 (ожидаемо): требуется авторизация");
            }
        }

        console.log("\nТестирование завершено успешно");
        
    } catch (error) {
        console.error("Ошибка тестирования:", error.message);
        if (error.response) {
            console.error("Ответ сервера:", error.response.data);
        }
    }
}

testReports();
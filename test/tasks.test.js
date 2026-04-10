import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let userId = null;

async function testTasks() {
    try {
        console.log("Тестирование модуля задач");

        console.log("\n1. Регистрация пользователя:");
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: "tasksuser@example.com",
            name: "Tasks User",
            password: "password123"
        });
        
        console.log("Пользователь зарегистрирован:", registerResponse.data.user.email);
        console.log("Токен получен при регистрации:", registerResponse.data.token ? "Да" : "Нет");
        authToken = registerResponse.data.token;
        userId = registerResponse.data.user.id;
        
        console.log("\n1.1 Проверка токена после регистрации:");
        try {
            const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log("Токен валиден, пользователь:", meResponse.data.email);
        } catch (error) {
            console.log("ОШИБКА: Токен не работает!", error.response?.data);
            throw new Error("Токен регистрации не работает");
        }

        console.log("\n2. Создание задач:");
        
        const task1 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Изучить Node.js",
            description: "Прочитать документацию и сделать примеры",
            status: 0,
            deadline: "2026-04-15"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 1 создана:", task1.data.title);
        
        const task2 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Написать модуль Tasks",
            description: "Реализовать CRUD операции",
            status: 0,
            deadline: "2026-04-10"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 2 создана:", task2.data.title);
        
        const task3 = await axios.post(`${BASE_URL}/create-tasks`, {
            title: "Написать тесты",
            description: "Покрыть тестами все эндпоинты",
            status: 1,
            deadline: "2026-04-12"
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача 3 создана:", task3.data.title);

        console.log("\n3. Получение всех задач:");
        const allTasks = await axios.get(`${BASE_URL}/tasks`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`Получено задач: ${allTasks.data.count}`);
        console.log(`Задачи: ${allTasks.data.tasks.map(t => t.title).join(", ")}`);

        console.log("\n4. Получение конкретной задачи:");
        const task = await axios.get(`${BASE_URL}/tasks/${task1.data.id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача найдена:", task.data.title);
        console.log(`Статус: ${task.data.status}, Дедлайн: ${task.data.deadline}`);

        console.log("\n5. Обновление задачи:");
        const updatedTask = await axios.put(`${BASE_URL}/tasks/${task1.data.id}`, {
            title: "Изучить Node.js и Express",
            description: "Полное изучение фреймворка",
            status: 1
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача обновлена:", updatedTask.data.title);
        console.log(`Новый статус: ${updatedTask.data.status}`);

        console.log("\n6. Обновление статуса задачи:");
        const statusUpdate = await axios.patch(`${BASE_URL}/tasks/${task2.data.id}/status`, {
            status: 2
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Статус обновлен:", statusUpdate.data.status === 2 ? "Завершена" : "Ошибка");

        console.log("\n7. Попытка просмотра чужой задачи:");
        try {
            console.log("Создаем второго пользователя...");
            const secondUser = await axios.post(`${BASE_URL}/auth/register`, {
                email: "otheruser@example.com",
                name: "Other User",
                password: "password123"
            });
            
            const otherUserToken = secondUser.data.token;
            console.log("Второй пользователь создан");
            
            await axios.get(`${BASE_URL}/tasks/${task1.data.id}`, {
                headers: { Authorization: `Bearer ${otherUserToken}` }
            });
            console.log("ОШИБКА: Должна быть ошибка доступа");
        } catch (error) {
            if (error.response?.status === 403) {
                console.log("Ошибка доступа (ожидаемо):", error.response.status);
            } else {
                console.log("Неожиданная ошибка:", error.response?.status);
            }
        }
        
        console.log("\n8. Попытка создания задачи без названия:");
        try {
            await axios.post(`${BASE_URL}/tasks`, {
                description: "Нет названия"
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log("Ошибка: задача создалась без названия");
        } catch (error) {
            console.log(`Ошибка (ожидаемо): ${error.response.status} - ${error.response.data.code}`);
        }

        console.log("\n9. Удаление задачи:");
        await axios.delete(`${BASE_URL}/tasks/${task3.data.id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("Задача удалена");
        
        console.log("\n10. Проверка после удаления задачи:");
        const remainingTasks = await axios.get(`${BASE_URL}/tasks`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`Осталось задач: ${remainingTasks.data.count}`);
        
        console.log("\n11. Удаление несуществующей задачи:");
        try {
            await axios.delete(`${BASE_URL}/tasks/non-existent-id`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log("Ошибка: задача удалилась");
        } catch (error) {
            console.log(`Ошибка (ожидаемо): ${error.response.status} - ${error.response.data.code}`);
        }
        
        console.log("\nТестирование завершено успешно");
        
    } catch (error) {
        console.error("\nОшибка тестирования:", error.message);
        if (error.response) {
            console.error("Статус:", error.response.status);
            console.error("Ответ сервера:", error.response.data);
        }
        if (error.request) {
            console.error("Запрос был отправлен, но нет ответа");
        }
    }
}

testTasks();
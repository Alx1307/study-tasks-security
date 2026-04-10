import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
    try {
        console.log("Тестирование авторизации");

        console.log("\n1. Регистрация пользователя:");
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: "test@example.com",
            name: "Test User",
            password: "password123"
        });
        
        console.log("Статус:", registerResponse.status);
        console.log("Пользователь:", registerResponse.data.user.email);
        console.log("Токен получен:", !!registerResponse.data.token);
        
        const token = registerResponse.data.token;

        console.log("\n2. Вход пользователя:");
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: "test@example.com",
            password: "password123"
        });
        
        console.log("Статус:", loginResponse.status);
        console.log("Пользователь:", loginResponse.data.user.email);
        console.log("Токен получен:", !!loginResponse.data.token);
        
        console.log("\n3. Получение информации о пользователе:");
        const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${loginResponse.data.token}`
            }
        });
        
        console.log("Статус:", meResponse.status);
        console.log("Пользователь:", meResponse.data.email);
        
        console.log("\n4. Попытка доступа без токена:");
        try {
            await axios.get(`${BASE_URL}/auth/me`);
        } catch (error) {
            console.log("Ошибка (ожидаемо):", error.response.status);
            console.log("Код ошибки:", error.response.data.code);
        }
        
        console.log("\n5. Попытка входа с неверным паролем:");
        try {
            await axios.post(`${BASE_URL}/auth/login`, {
                email: "test@example.com",
                password: "wrongpassword"
            });
        } catch (error) {
            console.log("Ошибка (ожидаемо):", error.response.status);
            console.log("Код ошибки:", error.response.data.code);
        }
        
        console.log("\nТестирование завершено успешно");
        
    } catch (error) {
        console.error("Ошибка тестирования:", error.message);
        if (error.response) {
            console.error("Ответ сервера:", error.response.data);
        }
    }
}

testAuth();
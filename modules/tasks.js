export default {
    name: "Tasks",
    requires: ["Core", "Auth"],
    
    register(container) {
        console.log("Регистрация модуля Tasks");
        
        const storage = container.get("storage");
        
        if (!storage.findTasksByUserId) {
            storage.findTasksByUserId = function(userId) {
                return this.tasks.filter(t => t.userId === userId);
            };
        }
        
        if (!storage.updateTaskStatus) {
            storage.updateTaskStatus = function(id, status) {
                const task = this.findTaskById(id);
                if (task) {
                    task.status = status;
                    task.updatedAt = new Date().toISOString();
                }
                return task;
            };
        }
    },
    
    setupRoutes(app, container) {
        console.log("Настройка маршрутов модуля Tasks");
        
        const authMiddlewareFactory = container.get("authMiddleware");
        const authMiddleware = authMiddlewareFactory();
        
        const storage = container.get("storage");
        const clock = container.get("clock");
        
        app.post("/create-tasks", authMiddleware, async (req, res, next) => {
            try {
                const { title, description, status, deadline } = req.body;
                
                if (!title || title.trim() === "") {
                    const error = new Error("Название задачи обязательно");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                const validStatuses = [0, 1, 2, 3];
                const taskStatus = status !== undefined ? parseInt(status) : 0;
                
                if (!validStatuses.includes(taskStatus)) {
                    const error = new Error("Некорректный статус задачи. Допустимые значения: 0, 1, 2, 3");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                const newTask = {
                    userId: req.user.id,
                    title: title.trim(),
                    description: description ? description.trim() : "",
                    status: taskStatus,
                    deadline: deadline || null,
                    createdAt: clock.now()
                };
                
                const task = storage.addTask(newTask);
                
                console.log(`[${clock.now()}] Пользователь ${req.user.email} создал задачу: ${task.title}`);
                
                res.status(201).json(task);
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/tasks", authMiddleware, (req, res, next) => {
            try {
                const tasks = storage.findTasksByUserId(req.user.id);
                res.json({
                    tasks,
                    count: tasks.length
                });
            } catch (error) {
                next(error);
            }
        });

        app.get("/tasks/:id", authMiddleware, (req, res, next) => {
            try {
                const task = storage.findTaskById(req.params.id);
                
                if (!task) {
                    const error = new Error("Задача не найдена");
                    error.statusCode = 404;
                    error.code = "TASK_NOT_FOUND";
                    throw error;
                }
                
                if (task.userId !== req.user.id) {
                    const error = new Error("Доступ запрещен");
                    error.statusCode = 403;
                    error.code = "FORBIDDEN";
                    throw error;
                }
                
                res.json(task);
            } catch (error) {
                next(error);
            }
        });
        
        app.put("/tasks/:id", authMiddleware, (req, res, next) => {
            try {
                const { title, description, status, deadline } = req.body;
                const task = storage.findTaskById(req.params.id);
                
                if (!task) {
                    const error = new Error("Задача не найдена");
                    error.statusCode = 404;
                    error.code = "TASK_NOT_FOUND";
                    throw error;
                }
                
                if (task.userId !== req.user.id) {
                    const error = new Error("Доступ запрещен");
                    error.statusCode = 403;
                    error.code = "FORBIDDEN";
                    throw error;
                }
                
                if (status !== undefined) {
                    const validStatuses = [0, 1, 2, 3];
                    if (!validStatuses.includes(parseInt(status))) {
                        const error = new Error("Некорректный статус задачи");
                        error.statusCode = 400;
                        error.code = "VALIDATION_ERROR";
                        throw error;
                    }
                }
                
                const updates = {};
                if (title !== undefined) updates.title = title;
                if (description !== undefined) updates.description = description;
                if (status !== undefined) updates.status = parseInt(status);
                if (deadline !== undefined) updates.deadline = deadline;
                
                const updatedTask = storage.updateTask(req.params.id, updates);
                
                console.log(`[${clock.now()}] Пользователь ${req.user.email} обновил задачу: ${updatedTask.title}`);
                
                res.json(updatedTask);
            } catch (error) {
                next(error);
            }
        });

        app.patch("/tasks/:id/status", authMiddleware, (req, res, next) => {
            try {
                const { status } = req.body;
                const task = storage.findTaskById(req.params.id);
                
                if (!task) {
                    const error = new Error("Задача не найдена");
                    error.statusCode = 404;
                    error.code = "TASK_NOT_FOUND";
                    throw error;
                }
                
                if (task.userId !== req.user.id) {
                    const error = new Error("Доступ запрещен");
                    error.statusCode = 403;
                    error.code = "FORBIDDEN";
                    throw error;
                }
                
                if (status === undefined) {
                    const error = new Error("Поле status обязательно");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                const validStatuses = [0, 1, 2, 3];
                const newStatus = parseInt(status);
                
                if (!validStatuses.includes(newStatus)) {
                    const error = new Error("Некорректный статус задачи");
                    error.statusCode = 400;
                    error.code = "VALIDATION_ERROR";
                    throw error;
                }
                
                const updates = { status: newStatus };
                if (newStatus === 2 && task.status !== 2) {
                    updates.completedAt = clock.now();
                }
                
                const updatedTask = storage.updateTask(req.params.id, updates);
                
                console.log(`[${clock.now()}] Пользователь ${req.user.email} изменил статус задачи на ${newStatus}`);
                
                res.json(updatedTask);
            } catch (error) {
                next(error);
            }
        });
        
        app.delete("/tasks/:id", authMiddleware, (req, res, next) => {
            try {
                const task = storage.findTaskById(req.params.id);
                
                if (!task) {
                    const error = new Error("Задача не найдена");
                    error.statusCode = 404;
                    error.code = "TASK_NOT_FOUND";
                    throw error;
                }
                
                if (task.userId !== req.user.id) {
                    const error = new Error("Доступ запрещен");
                    error.statusCode = 403;
                    error.code = "FORBIDDEN";
                    throw error;
                }
                
                storage.deleteTask(req.params.id);
                
                console.log(`[${clock.now()}] Пользователь ${req.user.email} удалил задачу: ${task.title}`);
                
                res.status(204).send();
            } catch (error) {
                next(error);
            }
        });
    },
    
    async init(container) {
        const clock = container.get("clock");
        console.log(`[${clock.now()}] модуль Tasks инициализирован`);
    }
};
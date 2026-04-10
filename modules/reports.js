export default {
    name: "Reports",
    requires: ["Core", "Auth", "Tasks"],
    
    register(container) {
        console.log("Регистрация модуля Reports");
        
        const storage = container.get("storage");
        
        if (!storage.getTaskStats) {
            storage.getTaskStats = function(userId) {
                const tasks = this.findTasksByUserId(userId);
                
                const stats = {
                    total: tasks.length,
                    byStatus: {
                        new: tasks.filter(t => t.status === 0).length,
                        inProgress: tasks.filter(t => t.status === 1).length,
                        completed: tasks.filter(t => t.status === 2).length,
                        overdue: tasks.filter(t => t.status === 3).length
                    },
                    byPriority: {
                        low: tasks.filter(t => t.priority === "low").length,
                        medium: tasks.filter(t => t.priority === "medium").length,
                        high: tasks.filter(t => t.priority === "high").length
                    },
                    completionRate: tasks.length ? 
                        Math.round((tasks.filter(t => t.status === 2).length / tasks.length) * 100) : 0
                };
                
                return stats;
            };
        }
        
        if (!storage.getTasksByDateRange) {
            storage.getTasksByDateRange = function(userId, startDate, endDate) {
                const tasks = this.findTasksByUserId(userId);
                return tasks.filter(t => {
                    const createdAt = t.createdAt.split('T')[0];
                    return createdAt >= startDate && createdAt <= endDate;
                });
            };
        }
    },
    
    setupRoutes(app, container) {
        console.log("Настройка маршрутов модуля Reports");
        
        const authMiddlewareFactory = container.get("authMiddleware");
        const authMiddleware = authMiddlewareFactory();
        
        const storage = container.get("storage");
        const clock = container.get("clock");
        
        app.get("/reports/stats", authMiddleware, (req, res, next) => {
            try {
                const stats = storage.getTaskStats(req.user.id);
                res.json({
                    user: {
                        id: req.user.id,
                        email: req.user.email
                    },
                    stats,
                    generatedAt: clock.now()
                });
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/reports/overdue", authMiddleware, (req, res, next) => {
            try {
                const tasks = storage.findTasksByUserId(req.user.id);
                const today = clock.today();
                
                const overdue = tasks.filter(t => 
                    t.status !== 2 && 
                    t.deadline && 
                    t.deadline < today
                );
                
                overdue.forEach(t => {
                    if (t.status !== 3) {
                        storage.updateTaskStatus(t.id, 3);
                    }
                });
                
                const updatedOverdue = storage.findTasksByUserId(req.user.id)
                    .filter(t => t.status === 3);
                
                res.json({
                    count: updatedOverdue.length,
                    tasks: updatedOverdue.map(t => ({
                        id: t.id,
                        title: t.title,
                        deadline: t.deadline,
                        status: t.status
                    })),
                    generatedAt: clock.now()
                });
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/reports/completion-timeline", authMiddleware, (req, res, next) => {
            try {
                const tasks = storage.findTasksByUserId(req.user.id);
                const completedTasks = tasks.filter(t => t.status === 2 && t.completedAt);
                
                const timeline = {};
                completedTasks.forEach(task => {
                    const date = task.completedAt.split('T')[0];
                    if (!timeline[date]) {
                        timeline[date] = 0;
                    }
                    timeline[date]++;
                });
                
                res.json({
                    timeline,
                    totalCompleted: completedTasks.length,
                    generatedAt: clock.now()
                });
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/reports/productivity", authMiddleware, (req, res, next) => {
            try {
                const tasks = storage.findTasksByUserId(req.user.id);
                const completedCount = tasks.filter(t => t.status === 2).length;
                const totalTasks = tasks.length;
                
                const productivityScore = totalTasks === 0 ? 0 : 
                    Math.round((completedCount / totalTasks) * 100);
                
                const estimatedTimeToComplete = tasks.filter(t => t.status !== 2).length * 2;
                
                res.json({
                    productivityScore,
                    completedTasks: completedCount,
                    pendingTasks: totalTasks - completedCount,
                    estimatedHoursToComplete: estimatedTimeToComplete,
                    generatedAt: clock.now()
                });
            } catch (error) {
                next(error);
            }
        });
        
        app.get("/reports/tasks-by-period", authMiddleware, async (req, res, next) => {
            try {
                const { days = 7 } = req.query;
                const daysNum = parseInt(days);
                
                const tasks = storage.findTasksByUserId(req.user.id);
                const today = new Date();
                const result = {};
                
                for (let i = 0; i < daysNum; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    const tasksOnDate = tasks.filter(t => {
                        const createdAt = t.createdAt.split('T')[0];
                        return createdAt === dateStr;
                    });
                    
                    result[dateStr] = {
                        created: tasksOnDate.length,
                        completed: tasksOnDate.filter(t => t.status === 2).length
                    };
                }
                
                res.json({
                    period: `${daysNum} days`,
                    data: result,
                    generatedAt: clock.now()
                });
            } catch (error) {
                next(error);
            }
        });
    },
    
    async init(container) {
        const clock = container.get("clock");
        console.log(`[${clock.now()}] модуль Reports инициализирован`);
    }
};
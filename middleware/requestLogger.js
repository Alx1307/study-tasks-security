export function requestLoggerMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const isError = status >= 400;
        
        const logEntry = {
            requestStatus: isError ? 'error' : 'success',
            requestId: req.id,
            method: req.method,
            url: req.url,
            status: status,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        };
        
        if (isError) {
            console.error(logEntry);
        } else {
            console.log(logEntry);
        }
    });
    
    next();
}
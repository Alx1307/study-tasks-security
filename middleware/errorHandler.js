export class ErrorResponse {
    constructor(code, message, requestId) {
        this.code = code;
        this.message = message;
        this.requestId = requestId;
        this.timestamp = new Date().toISOString();
    }
}

export function errorHandlerMiddleware(err, req, res, next) {
    const status = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Internal server error';
    
    console.error({
        requestStatus: 'error',
        requestId: req.id,
        method: req.method,
        url: req.url,
        status: status,
        duration: '0ms',
        errorCode: code,
        message: message,
        timestamp: new Date().toISOString()
    });
    
    const errorResponse = new ErrorResponse(code, message, req.id);
    res.status(status).json(errorResponse);
}
import Logger from './logger.js';

export class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode; // Código HTTP (ej: 400, 404, 500)
        this.details = details;      // Detalles adicionales (útil ya que estamos en desarrollo)
        this.isOperational = true;   // Marca errores controlados vs. errores críticos
        Error.captureStackTrace(this, this.constructor); // Mejor depuración
    }
    
}

export const errorMiddleware = (err, req, res, next) => {
    // Manejo de error de clave duplicada de Mongoose
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        err.statusCode = 400;
        err.message = `El valor '${err.keyValue[field]}' ya existe para el campo '${field}'.`;
        err.details = null;
    }

    // Manejo de error de validación de Mongoose
    if (err.name === "ValidationError") {
        err.statusCode = 400;
        err.message = Object.values(err.errors).map(e => e.message).join(" ");
        err.details = null;
    }

    if (err.name === "CastError") {
        err.statusCode = 400;
        err.message = `El ID '${err.value}' no es válido. debe ser un ObjectId. de 24 caracteres`;
        err.details = null;
    }

    err.statusCode = err.statusCode || 500;

    const response = {
        success: false,
        message: err.message || 'Error interno del servidor',
        details: err.details || null,
    };

    Logger.error(`Error: ${err.stack}`);
    res.status(err.statusCode).json(response);
};

export const catchAsync = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next); // Atrapa errores y los pasa a errorMiddleware
};


export const sendResponse = (res, statusCode, message, data = null)=> {
    Logger.info(`Response: ${statusCode} - ${message}`); // Log de respuesta
    res.status(statusCode).json({
        success: String(statusCode).startsWith('2'),
        message,
        data,
    });
}

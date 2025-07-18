
import { AppError, catchAsync } from "./appError.js";

export default class BaseService {
    constructor(model, messages = {}) {
        this.model = model; // Modelo de Mongoose
        this.messages = messages; // Mensajes personalizados

        // Bind para evitar problemas con `this`
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getOne = this.getOne.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    // CREATE
    create = catchAsync(async (req, res, next) => {
        const doc = await this.model.create(req.body);
        this.sendResponse(
            res,
            201,
            this.messages.create?.success || `${this.model.modelName} creado`,
            doc
        );
    });

    // READ (Todos los registros)
    getAll = catchAsync(async (req, res, next) => {
        const docs = await this.model.find();
        this.sendResponse(
            res,
            200,
            this.messages.getAll?.success || `Lista de ${this.model.modelName}s`,
            docs
        );
    });

    // READ (Uno solo)
    getOne = catchAsync(async (req, res, next) => {
        const doc = await this.model.findById(req.params.id);
        if (!doc) {
            return next(
                new AppError(
                    this.messages.getOne?.failure || "No encontrado",
                    404
                )
            );
        }
        this.sendResponse(
            res,
            200,
            this.messages.getOne?.success || `${this.model.modelName} encontrado`,
            doc
        );
    });

    // UPDATE
    update = catchAsync(async (req, res, next) => {
        const doc = await this.model.findByIdAndUpdate(req.params.id, req.body, {
            new: true, // Devuelve el documento actualizado
            runValidators: true, // Ejecuta validaciones de Mongoose
        });
        if (!doc) {
            return next(
                new AppError(
                    this.messages.update?.failure || "No encontrado",
                    404
                )
            );
        }
        this.sendResponse(
            res,
            200,
            this.messages.update?.success || "Actualizado correctamente",
            doc
        );
    });

    // DELETE
    delete = catchAsync(async (req, res, next) => {
        const doc = await this.model.findByIdAndDelete(req.params.id);
        if (!doc) {
            return next(
                new AppError(
                    this.messages.delete?.failure || "No encontrado",
                    404
                )
            );
        }
        this.sendResponse(
            res,
            204,
            this.messages.delete?.success || "Eliminado correctamente"
        );
    });

    // Método para respuestas consistentes
    sendResponse(res, statusCode, message, data = null) {
        res.status(statusCode).json({
            success: String(statusCode).startsWith('2'),
            message,
            data,
        });
    }
}
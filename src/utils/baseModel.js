import mongoose from "mongoose";

export default class BaseModel {
    constructor(model) {
        this.model = model; // Modelo de Mongoose
    }

    async create(data) {
        return await this.model.create(data);
    }

    async update(id, data) {
        return await this.model.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id) },
            data,
            { new: true, runValidators: true } // el run validators es para que se ejecuten las validaciones de mongoose, por defecto, en el update no se ejecutan
        );
    }

    async delete(id) {
        return await this.model.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) });
    }

    async findById(id) {
        return await this.model.findById(id);
    }

    async findAll() {
        return await this.model.find();
    }

    async findByFilter(filter){
        return await this.model.find(filter);
    }

    async findOne(filter) {
        return await this.model.findOne(filter);
    }

    async paginate(filter = {}, options = { currentPage: 1, limit: 10 }) { // paginacion clara y sencilla
        const { currentPage, limit } = options;
        const skip = (currentPage - 1) * limit;

        const data = await this.model.find(filter).skip(skip).limit(limit);
        const totalItems = await this.model.countDocuments(filter);

        return {
            data,
            totalItems,
            currentPage,
            totalPages: Math.ceil(totalItems / limit),
        };
    }
}
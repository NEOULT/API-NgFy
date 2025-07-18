import Song from '../schemas/song.js'
import mongoose from 'mongoose';
import BaseModel from '../utils/baseModel.js';
import bcrypt from "bcrypt";

class SongModel extends BaseModel {

    constructor() {
        super(Song);
    }

    paginate = async (filter = {}, options = { currentPage: 1, limit: 10 }) => {
        const { currentPage, limit } = options;
        const skip = (currentPage - 1) * limit;
        const total = await this.model.countDocuments(filter);
        const data = await this.model.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        return {
            totalItems: total,
            currentPage,
            totalPages: Math.ceil(total / limit),
            data
        };
    }

}

export default new SongModel();
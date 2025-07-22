import categoryModel from "../models/category.js";

class CategoryService {

    async createCategory(data) {
        return await categoryModel.create(data);
    }

    async getAllCategories() {
        return await categoryModel.findAll();
    }

    async deleteCategory(id) {
        return await categoryModel.delete(id);
    }
}

export default new CategoryService();
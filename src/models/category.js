import category from "../schemas/category.js";
import BaseModel from "../utils/baseModel.js";

class categoryModel extends BaseModel {

    constructor(){
        super(category)
    }

}

export default new categoryModel();
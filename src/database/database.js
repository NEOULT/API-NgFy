import moongose from "mongoose";
import 'dotenv/config';

class database {
    constructor() {
        this.connect();
    }
    
    async connect() {
        try {
            moongose.set('strictQuery', true); // Configura strictQuery explícitamente
            await moongose.connect(process.env.API_REVIEWS_NATIVE_MONGODB_URI);
        } catch (error) {
            console.error("Error connecting to database:", error);
        }
    }
    
    async disconnect() {
        try {
            await moongose.disconnect();
        } catch (error) {
            console.error("Error disconnecting from database:", error);
        }
    }
}

export default new database();
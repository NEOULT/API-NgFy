import UserModel from "../models/user.js";
import { AppError } from "../utils/appError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import 'dotenv/config';

export function generateToken(payload){

    if (!payload) throw new AppError("Payload is required to generate token");

    const token = jwt.sign(payload, process.env.API_REVIEWS_NATIVE_JWT_SECRET, { expiresIn: process.env.API_REVIEWS_NATIVE_JWT_EXPIRES_IN });

    if(!token) throw new AppError("Token generation failed", 500);

    return token;

};

export function verifyToken(req, res, next){

    const token = req.header("authorization")?.replace("Bearer ", "");
    
    if (!token) throw new AppError("Token is required", 401);

    try {
        const decoded = jwt.verify(token, process.env.API_REVIEWS_NATIVE_JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            // 401 es el estándar, pero puedes agregar un campo extra si lo necesitas
            throw new AppError("Token expired", 401, { errorType: "TOKEN_EXPIRED" });
        }
        throw new AppError("Invalid token", 401);
    }
};

class authService {

    async signUp({ email, password, first_name, last_name, avatar, role, user_name, author }) {

        const existingUser = await UserModel.getOne({ email });

        if (existingUser) throw new AppError("User already exists", 400);
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const data = await UserModel.createUser({
            email,
            password: hashedPassword,
            first_name,
            last_name,
            user_name,
            role,
            avatar,
            author
        });
        
        if (!data) throw new AppError("User creation failed", 500);
        
        return data;
    }

    async signIn({email, password}) {

        if (!email || !password) throw new AppError("Email and password are required", 400);

        const user = await UserModel.getOne({ email });
        
        if (!user) throw new AppError("User not found", 404);
        
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) throw new AppError("Invalid password", 401);

        if(user.deletedAt) throw new AppError("This user is deleted has account, if you want to recover it, please contact us", 401);
        
        const token = generateToken({ email: user.email , user_id: user._id, role: user.author ? "author" : "user" });

        if (!token) throw new AppError("Token generation failed", 500);

        return {token};

    }

    async signOut(req, res) {
        res.status(200).json({ message: "User signed out" });
    }

}

export default new authService();
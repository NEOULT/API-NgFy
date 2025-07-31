import User from '../schemas/user.js';
import mongoose from 'mongoose';
import bcrypt from "bcrypt";

class userModel {
    
    constructor() {
    }
    
    async createUser(userData) {
        return await User.create(userData);
    }

    async updateUser(userId, userData) {
        return await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userId) }, userData, { new: true, runValidators: true });
    }

    async softDeleteUser(userId) {
        return await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userId) }, { deletedAt: new Date() }, { new: true });
    }

    async deleteUser(userId) {
        return await User.findOneAndDelete({_id: new mongoose.Types.ObjectId(userId)  });
    }

    async getUserById(userId) {
        return await User.findById(userId);
    }
    async getAllUsers() {
        return await User.find();
    }

    async getOne(filter){
        return await User.findOne(filter);
    }

    async updateUserProfile(userId, userData) {
        const user = await User.findById(userId);
        if (!user) return null;


        if (userData.current_password && userData.new_password) {

            const samePassword = await bcrypt.compare(userData.current_password, user.password);

            if (samePassword) {
                user.password = await bcrypt.hash(userData.new_password, 10);
            }
        }

        if (userData.first_name) user.first_name = userData.first_name;
        if (userData.last_name) user.last_name = userData.last_name;
        if (userData.email) user.email = userData.email;
        if (userData.avatar) user.avatar = userData.avatar;
        if (userData.user_name) user.user_name = userData.user_name;
    
        return await user.save();
    }

    async toggleFavoriteSong(userId, songId) {
        const user = await User.findById(userId);
        if (!user) return null;

        const isFavorite = user.favorite_songs.some(id => id.toString() === songId.toString());
        let action;
        if (isFavorite) {
            user.favorite_songs = user.favorite_songs.filter(id => id.toString() !== songId.toString());
            action = 'removed';
        } else {
            user.favorite_songs.push(songId);
            action = 'added';
        }

        await user.save();
        return { action, user };
    }

    async getProfile(userId) {
        return await User.findById(userId).populate('favorite_songs').populate('created_songs');
    }

}
export default new userModel();
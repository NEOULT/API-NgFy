import moongoose from 'mongoose';
import category from './category.js';

const songSchema = new moongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        minlength: [1, 'Title must be at least 1 character long'],
        maxlength: [100, 'Title must not exceed 100 characters'],
        trim: true, // Elimina espacios en blanco al inicio y al final
    },
    artist: {
        type: String,
        required: [true, 'Artist is required'],
        minlength: [1, 'Artist must be at least 1 character long'],
        maxlength: [100, 'Artist must not exceed 100 characters'],
    },
    url: {
        type: String,
        required: [true, 'URL is required'],
        validate: {
            validator: function (url) {
                // Permitir cualquier extensión de archivo de audio común
                return /^https?:\/\/.+\.(mp3|wav|ogg|m4a|aac|flac|alac|wma|aiff|ape|opus|amr|mp4|webm)$/i.test(url);
            },
            message: 'URL must be a valid audio file URL',
        },
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [0, 'Duration must be a positive number'], // Duración no puede ser negativa
    },
    poster_image: {
        type: String,
        default: 'https://i.postimg.cc/xTSJhVPn/Chat-GPT-Image-26-jun-2025-06-32-14-p-m.png', // URL por defecto
        validate: {
            validator: function (url) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/.test(url); // Validación de URL de imagen
            },
            message: 'Poster image must be a valid URL ending with .jpg, .jpeg, .png, .gif, or .webp',
        },
    },
    category: [{
        type: moongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    }],
})

export default moongoose.model('Song', songSchema);
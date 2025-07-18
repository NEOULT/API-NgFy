import moongoose from 'mongoose';

const playlistSchema = new moongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        minlength: [1, 'Name must be at least 1 character long'],
        maxlength: [100, 'Name must not exceed 100 characters'],
    },
    user_id: {
        type: moongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'], // ID de usuario es obligatorio
    },
    songs: [{
        type: moongoose.Schema.Types.ObjectId,
        ref: 'Song',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default moongoose.model('Playlist', playlistSchema);
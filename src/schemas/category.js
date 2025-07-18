import moongoose from 'mongoose';

const categorySchema = new moongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        minlength: [1, 'Name must be at least 1 character long'],
        maxlength: [100, 'Name must not exceed 100 characters'],
    },
});

export default moongoose.model('Category', categorySchema);
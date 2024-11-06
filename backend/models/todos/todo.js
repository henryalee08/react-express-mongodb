/**
 * Created by Syed Afzal
 */
const mongoose = require('mongoose');

const Todo = mongoose.model('Todo', {
    text: {
        type: String,
        trim: true,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 1
    }
});

// Set strict query mode to true (pre-7.x behavior)
Todo.schema.set('strictQuery', true);

module.exports = {Todo};

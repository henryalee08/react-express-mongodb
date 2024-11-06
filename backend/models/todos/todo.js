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
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Todo',
        required: false
    }
});

Todo.validateObjectId = function(id) {
    if (!id) return false;
    try {
        const objectId = new mongoose.Types.ObjectId(id);
        return objectId._bsontype === 'ObjectID';
    } catch (e) {
        return false;
    }
};

Todo.schema.set('strictQuery', true);

module.exports = { Todo };

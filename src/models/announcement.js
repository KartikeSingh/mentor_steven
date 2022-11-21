const { model, Schema } = require('mongoose');

module.exports = model('announcement_steven', new Schema({
    id: String,
    channel: String,
    emoji: String,
    count: Number,
    placeholder: String,
    text: String,
    image: String,
    visible: {
        type: Boolean,
        default: false
    }
}))
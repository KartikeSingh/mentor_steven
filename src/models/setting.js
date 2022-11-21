const { model, Schema } = require('mongoose');

module.exports = model('steven_announce_bot', new Schema({
    guild: String,
    channel: String
}))
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    // Sorunun hangi yayıncıya ait olduğunu belirtir. User modeline bir referanstır.
    streamer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // İzleyicinin gönderdiği orijinal mesaj içeriği.
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250
    },
    // Sorunun aldığı beğeni (upvote) sayısı.
    upvotes: {
        type: Number,
        default: 0
    },
    // Yayıncının bu soruyu okuyup okumadığını belirtir.
    isRead: {
        type: Boolean,
        default: false
    },
    // Sorunun anlık olarak OBS ekranında gösterilip gösterilmediğini belirtir.
    isDisplayed: {
        type: Boolean,
        default: false
    }
}, {
    // Sorunun ne zaman oluşturulduğunu otomatik olarak kaydeder.
    timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
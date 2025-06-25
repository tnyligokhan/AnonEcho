const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// @route   GET /api/messages/:username
// @desc    Belirli bir yayıncının tüm okunmamış mesajlarını getirir
// @access  Public
router.get('/:username', async (req, res) => {
    try {
        const streamer = await User.findOne({ username: req.params.username.toLowerCase() });
        if (!streamer) {
            return res.status(404).json({ msg: 'Yayıncı bulunamadı.' });
        }

        const messages = await Message.find({ streamer: streamer._id, isRead: false })
            .sort({ upvotes: -1, createdAt: -1 }); // Önce en çok oy alana, sonra en yeniye göre sırala

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// @route   PATCH /api/messages/upvote/:id
// @desc    Bir mesaja oy verir (upvote)
// @access  Public
router.patch('/upvote/:id', async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { $inc: { upvotes: 1 } }, // upvotes değerini 1 artır
            { new: true } // Güncellenmiş belgeyi geri döndür
        );

        if (!message) {
            return res.status(404).json({ msg: 'Mesaj bulunamadı.' });
        }

        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;
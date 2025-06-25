const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto'); // YENİ: Güvenli anahtar üretimi için

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ msg: 'Lütfen tüm alanları doldurun.' });
        }

        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ msg: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.' });
        }

        user = new User({
            username,
            email,
            password,
            // YENİ: Kullanıcı için 32 karakterlik rastgele ve güvenli bir hex anahtarı oluştur.
            obsKey: crypto.randomBytes(16).toString('hex')
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.status(201).json({ msg: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});


// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ msg: 'Lütfen tüm alanları doldurun.' });
        }

        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(400).json({ msg: 'Hatalı kullanıcı adı veya şifre.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Hatalı kullanıcı adı veya şifre.' });
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                // YENİ: Güvenli anahtarı JWT token'ın içine ekleyerek panele gönder.
                obsKey: user.obsKey 
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;
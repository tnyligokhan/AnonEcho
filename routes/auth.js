// Gerekli kütüphaneleri ve modülleri dahil ediyoruz.
const express = require('express');
const router = express.Router(); // Express'in yönlendirici (router) özelliğini kullanıyoruz.
const bcrypt = require('bcryptjs'); // Şifreleri hash'lemek (şifrelemek) için.
const jwt = require('jsonwebtoken'); // Güvenli oturum token'ları (JWT) oluşturmak için.
const User = require('../models/User'); // Bir önceki adımda oluşturduğumuz User modelini dahil ediyoruz.

// --- KULLANICI KAYIT ENDPOINT'İ ---
// @route   POST /api/auth/register
// @desc    Yeni bir kullanıcı kaydeder
// @access  Public (Herkes erişebilir)
router.post('/register', async (req, res) => {
    // try...catch bloğu, kod çalışırken bir hata oluşursa programın çökmesini engeller.
    try {
        // İstek (request) gövdesinden (body) gelen kullanıcı adı, e-posta ve şifreyi alıyoruz.
        const { username, email, password } = req.body;

        // GÜVENLİK NOTU: Sunucu tarafında daima doğrulama yapılmalıdır.
        if (!username || !email || !password) {
            return res.status(400).json({ msg: 'Lütfen tüm alanları doldurun.' });
        }

        // Veritabanında bu e-posta veya kullanıcı adının daha önce alınıp alınmadığını kontrol ediyoruz.
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            // Eğer kullanıcı zaten varsa, 400 (Bad Request) hatası döndürüyoruz.
            return res.status(400).json({ msg: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.' });
        }

        // Yeni bir kullanıcı nesnesi oluşturuyoruz (henüz veritabanına kaydetmedik).
        user = new User({
            username,
            email,
            password
        });

        // GÜVENLİK KRİTİK: ŞİFREYİ HASH'LEME
        // Şifreyi veritabanına kaydetmeden önce güvenli hale getiriyoruz.
        const salt = await bcrypt.genSalt(10); // 10, hash'leme gücünü belirten standart bir "salt" değeridir.
        user.password = await bcrypt.hash(password, salt); // Şifreyi oluşturulan salt ile hash'liyoruz.

        // Hazırlanan yeni kullanıcıyı veritabanına kaydediyoruz.
        await user.save();

        // Başarılı bir şekilde oluşturulduğunu belirten 201 (Created) durum kodu ile cevap dönüyoruz.
        res.status(201).json({ msg: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası'); // Beklenmedik bir hata olursa 500 (Server Error) döndürüyoruz.
    }
});


// --- KULLANICI GİRİŞ ENDPOINT'İ ---
// @route   POST /api/auth/login
// @desc    Kullanıcı girişi yapar ve token döndürür
// @access  Public (Herkes erişebilir)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Gerekli alanların doldurulduğunu kontrol et
        if (!username || !password) {
            return res.status(400).json({ msg: 'Lütfen tüm alanları doldurun.' });
        }

        // Kullanıcıyı veritabanında kullanıcı adına göre arıyoruz (küçük harfe çevirerek).
        const user = await User.findOne({ username: username.toLowerCase() });
        // GÜVENLİK NOTU: Kullanıcının var olup olmadığını belli eden bir mesaj döndürmüyoruz.
        // "Kullanıcı bulunamadı" yerine genel bir "Hatalı bilgiler" mesajı, kullanıcı adı enumerasyon saldırılarını engeller.
        if (!user) {
            return res.status(400).json({ msg: 'Hatalı kullanıcı adı veya şifre.' });
        }

        // GÜVENLİK KRİTİK: ŞİFRELERİ KARŞILAŞTIRMA
        // Kullanıcının girdiği şifre ile veritabanındaki hash'lenmiş şifreyi bcrypt karşılaştırır.
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Şifre eşleşmezse, yine aynı genel hata mesajını döndürüyoruz.
            return res.status(400).json({ msg: 'Hatalı kullanıcı adı veya şifre.' });
        }

        // Şifre doğruysa, bir JWT (JSON Web Token) oluşturacağız.
        const payload = {
            user: {
                id: user.id, // Kullanıcının veritabanındaki benzersiz ID'si
                username: user.username
            }
        };

        // GÜVENLİK KRİTİK: TOKEN'I GİZLİ ANAHTAR İLE İMZALAMA
        // .env dosyasındaki gizli anahtarı kullanarak token'ı imzalıyoruz.
        // Token'ın geçerlilik süresini '1d' (1 gün) olarak ayarlıyoruz.
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                // Oluşturulan token'ı kullanıcıya cevap olarak gönderiyoruz.
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// Oluşturduğumuz yönlendiriciyi dışa aktarıyoruz ki server.js'de kullanabilelim.
module.exports = router;
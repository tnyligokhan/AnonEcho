// Mongoose kütüphanesini projeye dahil ediyoruz. Veritabanı işlemleri için gereklidir.
const mongoose = require('mongoose');

// Bir kullanıcı için veritabanı şemasını (yapısını) tanımlıyoruz.
const UserSchema = new mongoose.Schema({
    // Kullanıcı adı alanı
    username: {
        type: String,         // Veri tipi metin (String) olacak.
        required: true,       // Bu alan zorunludur.
        unique: true,         // Her kullanıcı adı benzersiz olmalıdır, aynı adda ikinci bir kullanıcı olamaz.
        trim: true,           // Gönderilen verinin başındaki ve sonundaki boşlukları otomatik olarak temizler.
        lowercase: true       // Tüm kullanıcı adlarını küçük harfe çevirir. Bu, 'Yayinici' ve 'yayinici' adlarının aynı sayılmasını sağlar.
    },
    // E-posta alanı
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // Şifre alanı
    password: {
        type: String,
        required: true
        // Not: Şifreler veritabanına asla bu şekilde düz metin olarak kaydedilmeyecek.
        // Bir sonraki adımda bu şifreyi 'hash'leyerek (şifreleyerek) güvenli hale getireceğiz.
    }
}, {
    // Zaman damgaları seçeneği
    // Bu seçenek, her bir kullanıcı belgesine otomatik olarak 'createdAt' (oluşturulma tarihi)
    // ve 'updatedAt' (güncellenme tarihi) alanlarını ekler.
    timestamps: true
});

// Oluşturduğumuz şemayı bir model olarak derliyor ve dışa aktarıyoruz.
// Artık projemizin başka yerlerinde 'User' adıyla bu modeli kullanarak veritabanı işlemleri yapabiliriz.
module.exports = mongoose.model('User', UserSchema);
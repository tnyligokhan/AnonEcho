require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit'); // --- YENİ ---

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const filter = new Filter();

const PORT = process.env.PORT || 3000;

// --- YENİ: Spam/Flood Koruması İçin Rate Limiter Ayarları ---
const messageLimiter = rateLimit({
	windowMs: 15 * 1000, // 15 saniyelik bir zaman dilimi
	max: 5, // Bu süre içinde her bir IP adresinden en fazla 5 istek gönderilebilir
	message: { error: 'Çok fazla mesaj gönderme isteğinde bulundunuz. Lütfen 15 saniye bekleyin.' },
	standardHeaders: true, // `RateLimit-*` başlıklarını yanıta ekler
	legacyHeaders: false, // `X-RateLimit-*` başlıklarını devre dışı bırakır
});


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB veritabanı bağlantısı başarıyla sağlandı.');
    } catch (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
        process.exit(1);
    }
};
connectDB();


app.use(express.json());
app.use(express.static('public'));


app.use('/api/auth', require('./routes/auth'));

// Ana adrese (/) bir GET isteği geldiğinde, index.html dosyasını gönder.
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// --- GÜNCELLENDİ: Dinamik Mesaj Gönderme Rotası ---
// Rota tanımına 'messageLimiter' ara katmanını (middleware) ekliyoruz.
app.post('/api/message/:username', messageLimiter, (req, res) => { // --- YENİ --- (messageLimiter eklendi)
    const { username } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Mesaj boş olamaz.' });
    }

    const cleanMessage = filter.clean(message);
    io.to(username).emit('new-message', cleanMessage);
    res.status(200).json({ success: 'Mesaj başarıyla gönderildi.' });
});


io.on('connection', (socket) => {
    console.log(`Bir istemci bağlandı: ${socket.id}`);

    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        console.log(`İstemci ${socket.id}, "${roomName}" adlı odaya katıldı.`);
    });

    socket.on('disconnect', () => {
        console.log(`İstemci ayrıldı: ${socket.id}`);
    });
});


server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
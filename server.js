// server.js dosyasının tam ve doğru hali

require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');
const path = require('path'); // path modülünü ekliyoruz.

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const filter = new Filter();

const PORT = process.env.PORT || 3000;

const messageLimiter = rateLimit({
    windowMs: 15 * 1000,
    max: 5,
    message: { error: 'Çok fazla mesaj gönderme isteğinde bulundunuz. Lütfen 15 saniye bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
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
app.use(express.static(path.join(__dirname, 'public'))); // public klasörünü statik olarak sun.

app.use('/api/auth', require('./routes/auth'));

app.post('/api/message/:username', messageLimiter, (req, res) => {
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

// --- EKSİK OLAN KISIM BURASI ---
// HTML Sayfalarını Sunma Rotaları
// Bu bölüm, gelen tüm istekleri public klasöründeki ilgili HTML dosyasına yönlendirir.
app.get('*', (req, res) => {
    // İstenen yolun bir dosya uzantısı olup olmadığını kontrol et (örn: .css, .js)
    if (req.path.includes('.')) {
        res.status(404).send('Not found');
    } else {
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    }
});
// --- ROTA DÜZELTMESİ SONU ---

server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
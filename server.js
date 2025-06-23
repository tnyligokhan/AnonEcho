// server.js dosyasının tam ve doğru hali

require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');
const path = require('path'); // path modülünü ekliyoruz

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

// Middleware'ler
app.use(express.json());
// 'public' klasöründeki statik dosyaları (css, js, login.html vb.) sun
app.use(express.static(path.join(__dirname, 'public'))); 

// API Rotaları
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


// Socket.IO Bağlantı Mantığı
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


// --- SAYFA SUNMA ROTALARI (TÜM LİNKLERİ İÇEREN NİHAİ HALİ) ---

// Ana sayfa isteğini karşıla
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Giriş yapan kullanıcının paneline giden isteği karşıla
// URL'de /dashboard.html değil, sadece /dashboard yazsa bile çalışır.
app.get('/dashboard', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'dashboard.html'));
});

// İzleyicinin mesaj gönderme sayfasına giden isteği karşıla
app.get('/mesaj/:username', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'message.html'));
});

// OBS kaynak linkine giden isteği karşıla
app.get('/canli/:username', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'live.html'));
});


// Sunucuyu başlat
server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
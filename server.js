require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const rateLimit = require('express-rate-limit');
const path = require('path');
const User = require('./models/User'); // User modelini dahil ediyoruz
const Message = require('./models/Message'); // YENİ: Message modelini dahil ediyoruz

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const messageLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 saniye
    max: 5,
    message: { error: 'Çok fazla istekte bulundunuz. Lütfen biraz bekleyin.' },
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
app.use(express.static(path.join(__dirname, 'public')));

// API Rotaları
app.use('/api/auth', require('./routes/auth'));
// YENİ: Mesajlarla ilgili tüm API isteklerini yönetecek yeni rotayı ekliyoruz.
app.use('/api/messages', require('./routes/messages')); 

// ESKİ MESAJ GÖNDERME ROTASI GÜNCELLENDİ
// Artık mesajlar doğrudan ekrana değil, veritabanına kaydedilecek.
app.post('/api/message/:username', messageLimiter, async (req, res) => {
    const { username } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Mesaj boş olamaz.' });
    }

    try {
        const streamer = await User.findOne({ username: username.toLowerCase() });
        if (!streamer) {
            return res.status(404).json({ error: 'Yayıncı bulunamadı.' });
        }

        const newMessage = new Message({
            streamer: streamer._id,
            text: message
        });

        await newMessage.save();

        // YENİ: Mesaj kaydedildikten sonra yayıncının paneline (dashboard) anlık bildirim gönderiyoruz.
        // Bu olay, panelde yeni bir sorunun belirmesini tetikleyecek.
        io.to(streamer.username).emit('new-message-received', newMessage);

        res.status(201).json({ success: 'Mesaj başarıyla gönderildi.' });

    } catch (error) {
        console.error("Mesaj kaydetme hatası:", error);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});


// Socket.IO Bağlantı Mantığı
io.on('connection', (socket) => {
    // 'join-room' olayı artık hem yayıncı paneli hem de OBS ekranı için kullanılacak.
    // Panel bu odaya katılarak yeni mesaj bildirimlerini ve diğer güncellemeleri alacak.
    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        console.log(`İstemci ${socket.id}, "${roomName}" adlı odaya katıldı.`);
    });
    
    // YENİ: Yayıncının "Soruyu Ekrana Gönder" butonuna bastığında bu olay çalışacak.
    socket.on('display-message', (data) => {
        // İlgili yayıncının odasına 'show-on-stream' olayını iletiyoruz.
        // Sadece OBS ekranı (live.html) bu olayı dinleyip soruyu ekranda gösterecek.
        io.to(data.username).emit('show-on-stream', data.message);
    });
    
    socket.on('disconnect', () => {
        console.log(`İstemci ayrıldı: ${socket.id}`);
    });
});


// --- SAYFA SUNMA ROTALARI ---
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'dashboard.html'));
});

app.get('/mesaj/:username', (req, res) => {
    // YENİ: Mesaj gönderme sayfası artık oylama özelliğini içerecek.
    res.sendFile(path.resolve(__dirname, 'public', 'lobby.html'));
});

app.get('/canli/:username', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'live.html'));
});

server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
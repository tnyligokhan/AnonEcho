require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const rateLimit = require('express-rate-limit');
const path = require('path');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const messageLimiter = rateLimit({
    windowMs: 10 * 1000,
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

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
        io.to(streamer.username).emit('new-message-received', newMessage);
        res.status(201).json({ success: 'Mesaj başarıyla gönderildi.' });

    } catch (error) {
        console.error("Mesaj kaydetme hatası:", error);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        console.log(`Pano ${socket.id}, "${roomName}" adlı odaya katıldı.`);
    });
    
    socket.on('join-live-room', async (obsKey) => {
        try {
            const user = await User.findOne({ obsKey: obsKey });
            if (user) {
                socket.join(user.username);
                console.log(`OBS ${socket.id}, "${user.username}" adlı odaya anahtarla katıldı.`);
            }
        } catch (error) {
            console.error('OBS odaya katılma hatası:', error);
        }
    });
    
    socket.on('display-message', (data) => {
        io.to(data.username).emit('show-on-stream', data.message);
    });
    
    socket.on('disconnect', () => {
        console.log(`İstemci ayrıldı: ${socket.id}`);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.get('/mesaj/:username', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'lobby.html'));
});

app.get('/canli/:obsKey', async (req, res) => {
    try {
        const user = await User.findOne({ obsKey: req.params.obsKey });
        if (user) {
            res.sendFile(path.resolve(__dirname, 'public', 'live.html'));
        } else {
            res.status(404).send('Geçersiz OBS Anahtarı');
        }
    } catch (error) {
        res.status(500).send('Sunucu Hatası');
    }
});

app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.resolve(__dirname, 'public', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            next();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
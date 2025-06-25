document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GÜVENLİK KONTROLÜ VE KULLANICI BİLGİLERİNİ ALMA ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let username = 'Yayıncı';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        username = payload.user.username;
    } catch (e) {
        console.error('Geçersiz token:', e);
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
    }
    
    // --- 2. ARAYÜZÜ VE LİNKLERİ GÜNCELLEME ---
    document.getElementById('welcome-username').textContent = username;
    const origin = window.location.origin;
    const messageUrl = `${origin}/mesaj/${username}`;
    const liveUrl = `${origin}/canli/${username}`;
    document.getElementById('message-link').textContent = messageUrl;
    document.getElementById('live-link').textContent = liveUrl;

    // --- 3. YARDIMCI FONKSİYONLAR (ÇIKIŞ & KOPYALA) ---
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.copyTarget;
            const textToCopy = document.getElementById(targetId).textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                setTimeout(() => { button.innerHTML = originalIcon; }, 2000);
            });
        });
    });

    // --- 4. YENİ: SORU HAVUZU MANTIĞI ---
    const socket = io();
    const questionsContainer = document.getElementById('questions-container');
    const loadingQuestions = document.getElementById('loading-questions');

    // Sunucuya bu panelin hangi yayıncıya ait olduğunu bildiriyoruz.
    socket.emit('join-room', username);

    const renderQuestion = (question) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4';
        questionElement.id = `question-${question._id}`;
        
        questionElement.innerHTML = `
            <div class="flex-grow text-gray-200">
                <p>${question.text}</p>
                <div class="text-amber-400 text-sm font-bold mt-2">
                    <i class="fas fa-arrow-up"></i> ${question.upvotes}
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button data-id="${question._id}" data-text="${question.text}" class="display-btn flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm">
                    <i class="fas fa-eye mr-1"></i> Göster
                </button>
                <button data-id="${question._id}" class="read-btn flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm">
                    <i class="fas fa-check mr-1"></i> Oku
                </button>
                <button data-id="${question._id}" class="delete-btn flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm">
                    <i class="fas fa-trash mr-1"></i> Sil
                </button>
            </div>
        `;
        // Yeni soruları listenin başına ekle
        questionsContainer.prepend(questionElement);
    };

    const fetchAndRenderQuestions = async () => {
        try {
            const response = await fetch(`/api/messages/${username}`);
            const questions = await response.json();
            loadingQuestions.style.display = 'none';
            if (questions.length === 0) {
                 questionsContainer.innerHTML = '<p class="text-center text-gray-500">Henüz soru havuzunda bir şey yok.</p>';
            } else {
                 questions.forEach(renderQuestion);
            }
        } catch (error) {
            console.error('Sorular yüklenemedi:', error);
            loadingQuestions.textContent = 'Sorular yüklenirken bir hata oluştu.';
        }
    };
    
    // Sunucudan yeni bir soru geldiğinde bu olay tetiklenir.
    socket.on('new-message-received', (newMessage) => {
        if(document.querySelector('#questions-container p')) {
            questionsContainer.innerHTML = ''; // "Havuzda bir şey yok" yazısını temizle
        }
        renderQuestion(newMessage);
    });

    // Buton tıklamalarını yönetmek için event delegation kullanıyoruz.
    questionsContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const readBtn = target.closest('.read-btn');
        const deleteBtn = target.closest('.delete-btn');
        const displayBtn = target.closest('.display-btn');

        if (displayBtn) {
            const messageText = displayBtn.dataset.text;
            socket.emit('display-message', { username, message: messageText });
        }
        else if (readBtn) {
            const messageId = readBtn.dataset.id;
            const response = await fetch(`/api/messages/read/${messageId}`, { method: 'PATCH' });
            if(response.ok) document.getElementById(`question-${messageId}`).remove();
        } 
        else if (deleteBtn) {
            const messageId = deleteBtn.dataset.id;
            const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
            if(response.ok) document.getElementById(`question-${messageId}`).remove();
        }
    });

    fetchAndRenderQuestions();
});
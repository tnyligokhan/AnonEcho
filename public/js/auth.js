// DOM'un (yani sayfanın HTML yapısının) tamamen yüklendiğinden emin olduktan sonra kodu çalıştır.
document.addEventListener('DOMContentLoaded', () => {

    // Sayfadaki formları ve elementleri bulmaya çalış.
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    
    // --- KAYIT FORMU MANTIĞI ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            // Formun varsayılan olarak sayfayı yenileme davranışını engelle.
            e.preventDefault();

            // Elementleri seç
            const feedbackDiv = document.getElementById('feedback');
            const submitButton = document.getElementById('submitButton');
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Butonu devre dışı bırak ve metnini değiştirerek kullanıcıya işlem yapıldığını bildir.
            submitButton.disabled = true;
            submitButton.textContent = 'Hesap Oluşturuluyor...';
            feedbackDiv.textContent = ''; // Eski mesajları temizle

            try {
                // Backend'deki /api/auth/register endpoint'ine fetch ile POST isteği gönder.
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Form verilerini JSON formatında body'e ekle.
                    body: JSON.stringify({ username, email, password })
                });

                // Sunucudan gelen cevabı JSON olarak işle.
                const data = await response.json();

                if (response.ok) {
                    // İstek başarılıysa (HTTP 2xx durum kodları)
                    feedbackDiv.textContent = data.msg;
                    feedbackDiv.className = 'text-center mb-4 min-h-[1.5rem] text-green-400';
                    registerForm.reset(); // Formu temizle
                } else {
                    // İstek başarısızsa (HTTP 4xx veya 5xx durum kodları)
                    throw new Error(data.msg || 'Bir hata oluştu.');
                }
            } catch (error) {
                // Ağ hatası veya backend'den gelen hata mesajını göster.
                feedbackDiv.textContent = error.message;
                feedbackDiv.className = 'text-center mb-4 min-h-[1.5rem] text-red-400';
            } finally {
                // İşlem başarılı da olsa, başarısız da olsa butonu tekrar aktif et.
                submitButton.disabled = false;
                submitButton.textContent = 'Hesap Oluştur';
            }
        });
    }

    // --- GİRİŞ FORMU MANTIĞI ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const feedbackDiv = document.getElementById('feedback');
            const submitButton = document.getElementById('submitButton');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            submitButton.disabled = true;
            submitButton.textContent = 'Giriş Yapılıyor...';
            feedbackDiv.textContent = ''; // Eski mesajları temizle

            try {
                // Backend'deki /api/auth/login endpoint'ine POST isteği gönder.
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // KRİTİK ADIM: Giriş başarılıysa...
                    // 1. Sunucudan gelen token'ı al.
                    const { token } = data;
                    // 2. Token'ı tarayıcının yerel deposuna (localStorage) kaydet.
                    // Bu sayede kullanıcı sayfayı yenilese bile giriş yapmış olarak kalır.
                    localStorage.setItem('token', token);
                    // 3. Kullanıcıyı yayıncı paneline yönlendir.
                    window.location.href = '/dashboard.html';
                } else {
                    throw new Error(data.msg || 'Bir hata oluştu.');
                }
            } catch (error) {
                feedbackDiv.textContent = error.message;
                feedbackDiv.className = 'text-center mb-4 min-h-[1.5rem] text-red-400';
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Giriş Yap';
            }
        });
    }
});
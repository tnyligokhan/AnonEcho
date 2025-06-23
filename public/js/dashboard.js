document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GÜVENLİK KONTROLÜ VE TOKEN'I ALMA ---
    const token = localStorage.getItem('token');
    if (!token) {
        // Eğer tarayıcıda token yoksa, kullanıcı giriş yapmamış demektir.
        // Onu derhal login sayfasına yönlendir.
        window.location.href = '/login.html';
        return; // Kodun geri kalanının çalışmasını engelle.
    }

    // --- 2. TOKEN'I ÇÖZÜMLEME VE KULLANICI BİLGİSİNİ ALMA ---
    let username = 'Yayıncı'; // Varsayılan değer
    try {
        // JWT'nin payload kısmını (ortadaki bölüm) alıp Base64 formatından çözümlüyoruz.
        const payload = JSON.parse(atob(token.split('.')[1]));
        username = payload.user.username;
    } catch (e) {
        // Eğer token bozuksa veya çözümlenemezse, bu bir güvenlik sorunudur.
        console.error('Geçersiz token:', e);
        localStorage.removeItem('token'); // Bozuk token'ı temizle.
        window.location.href = '/login.html'; // Login'e yönlendir.
        return;
    }
    
    // --- 3. ARAYÜZÜ DİNAMİK OLARAK GÜNCELLEME ---
    // Hoş geldin mesajını güncelle
    document.getElementById('welcome-username').textContent = username;

    // Linkleri oluştur
    const origin = window.location.origin; // Sitenin ana adresi (örn: http://localhost:3000)
    const messageUrl = `${origin}/mesaj/${username}`;
    const liveUrl = `${origin}/canli/${username}`;

    // Linkleri ekrandaki ilgili yerlere yazdır
    document.getElementById('message-link').textContent = messageUrl;
    document.getElementById('live-link').textContent = liveUrl;

    // --- 4. YARDIMCI FONKSİYONLAR (ÇIKIŞ YAP VE KOPYALA) ---
    // Çıkış Yap Butonu
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token'); // Token'ı sil.
        window.location.href = '/login.html'; // Login'e yönlendir.
    });

    // Kopyalama Butonları
    const copyMessageBtn = document.getElementById('copy-message-link');
    const copyLiveBtn = document.getElementById('copy-live-link');

    const setupCopyButton = (button, textToCopy) => {
        button.addEventListener('click', () => {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check text-green-400"></i>'; // İkonu tik yap
                setTimeout(() => {
                    button.innerHTML = originalIcon; // 2 saniye sonra eski haline getir
                }, 2000);
            }).catch(err => {
                console.error('Kopyalama başarısız oldu: ', err);
            });
        });
    };
    
    setupCopyButton(copyMessageBtn, messageUrl);
    setupCopyButton(copyLiveBtn, liveUrl);
});
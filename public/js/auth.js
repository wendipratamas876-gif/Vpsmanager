// public/js/auth.js
async function requestLogin() {
    const userId = document.getElementById('userId').value;
    
    if (!userId) {
        alert('Please enter your username or email');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show QR code and Telegram link
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('qrSection').style.display = 'block';
            
            // Generate QR code (using a simple library or API)
            document.getElementById('qrcode').innerHTML = 
                `<img src="${data.qrCode}" alt="Telegram Login QR Code">`;
            
            document.getElementById('telegramLink').innerHTML = 
                `<a href="${data.loginLink}" target="_blank">${data.loginLink}</a>`;
            
            // Start polling for login verification
            checkLoginStatus(userId, data.loginLink.split('=')[1]);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function checkLoginStatus(userId, token) {
    const statusMessage = document.getElementById('statusMessage');
    
    const interval = setInterval(async () => {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                statusMessage.innerHTML = '<div class="success">✅ Login successful! Redirecting...</div>';
                clearInterval(interval);
                
                // Save token and redirect
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Verification error:', error);
        }
    }, 2000); // Check every 2 seconds
}

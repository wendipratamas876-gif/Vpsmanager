// server/services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
const jwt = require('jsonwebtoken');
const db = require('../utils/jsonDatabase');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

class TelegramService {
  constructor() {
    this.loginRequests = new Map(); // Temporary storage for login requests
  }

  // Generate login link for user
  generateLoginLink(userId) {
    const token = Math.random().toString(36).substr(2, 10);
    this.loginRequests.set(token, {
      userId,
      timestamp: Date.now(),
      verified: false
    });
    
    // Clean old requests (older than 10 minutes)
    setTimeout(() => {
      this.loginRequests.delete(token);
    }, 10 * 60 * 1000);
    
    return `https://t.me/${process.env.BOT_USERNAME}?start=${token}`;
  }

  // Verify Telegram login
  async verifyLogin(telegramId, token) {
    const request = this.loginRequests.get(token);
    
    if (!request || Date.now() - request.timestamp > 10 * 60 * 1000) {
      return { success: false, message: 'Login request expired' };
    }
    
    // Mark as verified
    request.verified = true;
    request.telegramId = telegramId;
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { telegramId, userId: request.userId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Save user to database
    await db.saveUser(telegramId, request.userId);
    
    return { success: true, token: jwtToken, userId: request.userId };
  }

  // Initialize bot commands
  initBot() {
    bot.onText(/\/start (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const token = match[1];
      
      const result = await this.verifyLogin(chatId, token);
      
      if (result.success) {
        bot.sendMessage(chatId, '✅ Login berhasil! Anda sekarang dapat mengakses dashboard.');
      } else {
        bot.sendMessage(chatId, '❌ Login gagal. Silakan coba lagi.');
      }
    });
    
    bot.on('message', (msg) => {
      bot.sendMessage(msg.chat.id, 'Gunakan website untuk login ke VPS Manager.');
    });
  }
}

module.exports = new TelegramService();

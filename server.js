const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(express.json());
app.use(cors());

const USERS_FILE = './users.json';
const pendingOTPs = {};

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Baga nagaan dhuftan! Maaloo email kee isa web irratti galmaa'uuf barbaachisu asitti ergi (Fkn: email@gmail.com).");
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text && text.includes('@') && !text.startsWith('/')) {
        const email = text.trim().toLowerCase();
        let users = loadUsers();
        let user = users.find(u => u.email === email);
        if (!user) {
            users.push({ email: email, chatId: chatId });
        } else {
            user.chatId = chatId;
        }
        saveUsers(users);
        bot.sendMessage(chatId, `Email kee (${email}) milkaa'inaan galmeeffameera! Amma website irraa galmaa'uu dandeessa.`);
    }
});

app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    let users = loadUsers();
    let user = users.find(u => u.email === cleanEmail);

    if (!user) {
        return res.status(400).json({ success: false, message: "Email kun Telegram Bot keenya irratti hin galmeeffamne! Dura Bot keenya start godhii email kee ergi." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    pendingOTPs[cleanEmail] = otp;

    bot.sendMessage(user.chatId, `🔑 Koodiin OTP Apex Forex Edge kee: *${otp}*`, { parse_mode: 'Markdown' })
        .then(() => res.json({ success: true, message: "OTP gara Telegram keetti ergameera!" }))
        .catch(() => res.status(500).json({ success: false, message: "Ergunni Telegram kufeera." }));
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    if (pendingOTPs[cleanEmail] && pendingOTPs[cleanEmail] === otp) {
        delete pendingOTPs[cleanEmail];
        res.json({ success: true, message: "Verification milkaa'eera!" });
    } else {
        res.status(400).json({ success: false, message: "Koodiin OTP sirrii miti." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

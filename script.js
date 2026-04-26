/* ─── Love VPN — Script ─────────────────────────────────────────────── */

const VALID_KEYS = new Set(['A-2875', 'A-1147']);

const VLESS_CONFIG = 'vless://c4f08d9d-23a5-45a2-94bf-afdc6977ac66@panel.mvpnz.com:2087/?type=tcp&encryption=none&security=reality&pbk=tC4Ndmrv2Y1VSCQtzYN7dTH-1UTX_v1-WQjlyZCdezQ&fp=chrome&sni=www.apple.com&sid=b4a7afe0&spx=%2Frandom#EST-4-monopriz.com%20-%20%D0%BB%D1%83%D1%87%D1%88%D0%B8%D0%B9%20%D0%BE%D0%B1%D0%BC%D0%B5%D0%BD';

// ── Хранилище использованных ключей с IP ───────────────────────────────

const STORAGE_KEY = 'love-vpn-key-ips';

// Получить объект с ключами и IP, которые их активировали
function getKeyIpMap() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Сохранить объект ключ -> IP
function saveKeyIpMap(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Получить IP пользователя через внешний API
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Не удалось получить IP, использую fallback');
        return 'unknown';
    }
}

// Проверить, использовал ли уже этот IP данный ключ
function isKeyUsedByThisIP(key, userIP) {
    const keyIpMap = getKeyIpMap();
    const storedIP = keyIpMap[key];
    return storedIP === userIP;
}

// Сохранить, что ключ использован с указанного IP
function markKeyUsedByIP(key, userIP) {
    const keyIpMap = getKeyIpMap();
    keyIpMap[key] = userIP;
    saveKeyIpMap(keyIpMap);
}

// ── Элементы ──────────────────────────────────────────────────────────

const themeToggle  = document.getElementById('themeToggle');
const buyBtn       = document.getElementById('buyBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const keyInput     = document.getElementById('keyInput');
const activateBtn  = document.getElementById('activateBtn');
const errorMsg     = document.getElementById('errorMsg');
const stepInfo     = document.getElementById('stepInfo');
const stepSuccess  = document.getElementById('stepSuccess');
const configText   = document.getElementById('configText');
const copyBtn      = document.getElementById('copyBtn');
const copyIcon     = document.getElementById('copyIcon');
const copyText     = document.getElementById('copyText');

// ── Тема ──────────────────────────────────────────────────────────────

function getTheme() {
    return document.documentElement.getAttribute('data-theme');
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('love-vpn-theme', theme);
}

themeToggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
});

// Восстановление сохранённой темы
const saved = localStorage.getItem('love-vpn-theme');
if (saved) setTheme(saved);

// ── Модальное окно ────────────────────────────────────────────────────

function openModal() {
    // Сброс к шагу 1
    stepInfo.classList.remove('hidden');
    stepSuccess.classList.add('hidden');
    keyInput.value = '';
    errorMsg.textContent = '';
    keyInput.style.borderColor = '';
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => keyInput.focus(), 400);
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

buyBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

// ── Активация ключа (с проверкой IP) ─────────────────────────────────

let currentUserIP = null;

// Получаем IP при загрузке страницы
getUserIP().then(ip => {
    currentUserIP = ip;
    console.log(`🌐 Ваш IP: ${ip}`);
});

activateBtn.addEventListener('click', tryActivate);
keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryActivate();
});

async function tryActivate() {
    const key = keyInput.value.trim().toUpperCase();

    if (!key) {
        showError('Введите ключ активации');
        return;
    }

    // Убеждаемся, что IP получен
    if (!currentUserIP) {
        showError('Определение IP адреса... Попробуйте еще раз');
        currentUserIP = await getUserIP();
        if (!currentUserIP) {
            showError('Не удалось определить IP адрес');
            return;
        }
    }

    // Проверка: не использовал ли уже этот IP данный ключ?
    if (isKeyUsedByThisIP(key, currentUserIP)) {
        showError('Ключ был использован вами');
        shakeInput();
        return;
    }

    // Проверка на валидность ключа
    if (VALID_KEYS.has(key)) {
        // Отмечаем, что этот ключ использован с данного IP
        markKeyUsedByIP(key, currentUserIP);
        
        // Успех
        keyInput.style.borderColor = 'var(--green)';
        errorMsg.textContent = '';

        configText.textContent = VLESS_CONFIG;

        setTimeout(() => {
            stepInfo.classList.add('hidden');
            stepSuccess.classList.remove('hidden');
        }, 300);
    } else {
        showError('Неверный ключ активации');
        shakeInput();
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    keyInput.style.borderColor = '#ff5252';
}

function shakeInput() {
    keyInput.style.animation = 'none';
    keyInput.offsetHeight; // reflow
    keyInput.style.animation = 'shake 0.4s ease';
}

// ── Административные функции (консоль) ────────────────────────────────

// Показать все использованные ключи с IP
window.showUsedKeys = function() {
    const keyIpMap = getKeyIpMap();
    const keys = Object.keys(keyIpMap);
    
    if (keys.length === 0) {
        console.log('❌ Нет использованных ключей');
    } else {
        console.log('📋 Использованные ключи и IP:');
        keys.forEach(key => {
            console.log(`   🔑 ${key} → 🌐 ${keyIpMap[key]}`);
        });
        console.log(`\n📊 Всего использовано: ${keys.length} ключей`);
    }
    return keyIpMap;
};

// Показать статус конкретного ключа
window.checkKey = function(key) {
    const formattedKey = key.toUpperCase().trim();
    const keyIpMap = getKeyIpMap();
    const ip = keyIpMap[formattedKey];
    
    if (ip) {
        console.log(`🔑 Ключ "${formattedKey}" использован с IP: ${ip}`);
        if (ip === currentUserIP) {
            console.log(`⚠️ Это ВАШ IP — ключ был использован вами`);
        }
    } else {
        console.log(`✅ Ключ "${formattedKey}" ещё не использован`);
    }
};

// Очистить всю историю (только для админа)
window.clearAllKeys = function() {
    if (confirm('⚠️ Очистить ВСЮ историю использованных ключей? (Это действие необратимо)')) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ История использованных ключей полностью очищена');
    }
};

// Удалить конкретный ключ из истории
window.removeKey = function(key) {
    const formattedKey = key.toUpperCase().trim();
    const keyIpMap = getKeyIpMap();
    
    if (keyIpMap[formattedKey]) {
        if (confirm(`Удалить ключ "${formattedKey}" из истории?`)) {
            delete keyIpMap[formattedKey];
            saveKeyIpMap(keyIpMap);
            console.log(`✅ Ключ "${formattedKey}" удалён из истории`);
        }
    } else {
        console.log(`❌ Ключ "${formattedKey}" не найден в истории`);
    }
};

// ── CSS-анимация shake ────────────────────────────────────────────────

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
}`;
document.head.appendChild(shakeStyle);

// ── Копирование ──────────────────────────────────────────────────────

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(VLESS_CONFIG);
        copyBtn.classList.add('copied');
        copyIcon.textContent = '✅';
        copyText.textContent = 'Скопировано!';
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyIcon.textContent = '📋';
            copyText.textContent = 'Скопировать';
        }, 2000);
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = VLESS_CONFIG;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);

        copyIcon.textContent = '✅';
        copyText.textContent = 'Скопировано!';
        setTimeout(() => {
            copyIcon.textContent = '📋';
            copyText.textContent = 'Скопировать';
        }, 2000);
    }
});

// ── Вывод информации в консоль (для администратора) ───────────────────

console.log('💻 Love VPN — Административные команды:');
console.log('   • showUsedKeys()  — показать все использованные ключи и IP');
console.log('   • checkKey("A-2875") — проверить статус конкретного ключа');
console.log('   • removeKey("A-2875") — удалить ключ из истории');
console.log('   • clearAllKeys() — полностью очистить историю');

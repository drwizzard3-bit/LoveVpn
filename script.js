/* ─── Love VPN — Script ─────────────────────────────────────────────── */

const VALID_KEYS = new Set(['A-2875', 'A-1147']);

const VLESS_CONFIG = 'vless://c4f08d9d-23a5-45a2-94bf-afdc6977ac66@panel.mvpnz.com:2087/?type=tcp&encryption=none&security=reality&pbk=tC4Ndmrv2Y1VSCQtzYN7dTH-1UTX_v1-WQjlyZCdezQ&fp=chrome&sni=www.apple.com&sid=b4a7afe0&spx=%2Frandom#EST-4-monopriz.com%20-%20%D0%BB%D1%83%D1%87%D1%88%D0%B8%D0%B9%20%D0%BE%D0%B1%D0%BC%D0%B5%D0%BD';

// ── Хранилище использованных ключей ────────────────────────────────────

const STORAGE_KEY = 'love-vpn-used-keys';

function getUsedKeys() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return new Set(JSON.parse(stored));
        } catch (e) {
            return new Set();
        }
    }
    return new Set();
}

function saveUsedKeys(usedKeysSet) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...usedKeysSet]));
}

function markKeyAsUsed(key) {
    const usedKeys = getUsedKeys();
    usedKeys.add(key);
    saveUsedKeys(usedKeys);
}

function isKeyUsed(key) {
    return getUsedKeys().has(key);
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

// ── Активация ключа ──────────────────────────────────────────────────

activateBtn.addEventListener('click', tryActivate);
keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryActivate();
});

function tryActivate() {
    const key = keyInput.value.trim().toUpperCase();

    if (!key) {
        showError('Введите ключ активации');
        return;
    }

    // Проверка на уже использованный ключ
    if (isKeyUsed(key)) {
        showError('Этот ключ уже был использован!');
        shakeInput();
        return;
    }

    // Проверка на валидность ключа
    if (VALID_KEYS.has(key)) {
        // Отмечаем ключ как использованный
        markKeyAsUsed(key);
        
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

// ── Отображение списка использованных ключей (для администратора) ─────

// Функция для просмотра использованных ключей (можно вызвать из консоли)
window.showUsedKeys = function() {
    const usedKeys = getUsedKeys();
    if (usedKeys.size === 0) {
        console.log('❌ Нет использованных ключей');
    } else {
        console.log('📋 Использованные ключи:');
        usedKeys.forEach(key => console.log(`   🔑 ${key}`));
        console.log(`\n📊 Всего использовано: ${usedKeys.size} ключей`);
    }
    return [...usedKeys];
};

// Функция для очистки списка использованных ключей (только для администратора)
window.clearUsedKeys = function() {
    if (confirm('⚠️ Очистить список использованных ключей? (Это действие необратимо)')) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ Список использованных ключей очищен');
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
console.log('   • showUsedKeys()  — показать использованные ключи');
console.log('   • clearUsedKeys() — очистить список использованных ключей');
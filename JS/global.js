// --- 1. ELEMENTOS DE INTERFACE E EFEITOS (DOM) ---
document.addEventListener("DOMContentLoaded", () => {
    // SISTEMA DE NAVEGAÇÃO
    const menuItems = document.querySelectorAll('.bottom-menu-global .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // RASTRO DE KI (CANVAS)
    const canvas = document.getElementById('touch-layer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                const baseSize = window.innerWidth * (3 / 100); 
                this.size = Math.random() * baseSize + (baseSize / 2);
                this.opacity = 1;
                this.color = '165, 224, 67'; 
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
                ctx.shadowBlur = window.innerWidth * (2 / 100); 
                ctx.shadowColor = `rgba(${this.color}, 0.8)`;
                ctx.fill();
            }
            update() {
                this.opacity -= 0.05;
                this.size += window.innerWidth * (0.1 / 100); 
            }
        }

        function handleTouch(e) {
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            particles.push(new Particle(x, y));
        }

        window.addEventListener('touchmove', handleTouch);
        window.addEventListener('mousemove', handleTouch);
        window.addEventListener('touchstart', handleTouch);

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].draw();
                particles[i].update();
                if (particles[i].opacity <= 0) {
                    particles.splice(i, 1);
                    i--;
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }
});

// --- 2. FUNÇÕES GLOBAIS DE DADOS E UTILITÁRIOS ---

window.levelUpQueue = [];

// Formatação inteligente para visores LCD (LCD Digital Style)
window.formatXP = (num) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'; // Bilhões
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';    // Milhões
    if (num >= 10000) return Math.floor(num / 1000) + 'k';         // Dezenas de k
    if (num >= 1000) {
        const k = Math.floor(num / 1000);
        const rest = Math.floor((num % 1000) / 100);
        return rest > 0 ? `${k}k${rest}` : `${k}k`;
    }
    return num.toString();
};

const getJSON = (key, fallback) => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
};

const setJSON = (key, val) => {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('storage'));
};

// --- 3. SISTEMA DE ECONOMIA ---

window.addCurrency = (type, amount) => {
    const itens = getJSON("user_itens", { coins: 0, senzus: 0 });
    const LIMITS = { 'coins': 9999999999, 'senzus': 999999 };
    const target = type.includes('coins') ? 'coins' : (type.includes('senzu') ? 'senzus' : type);
    itens[target] = (itens[target] || 0) + amount;
    if (itens[target] > LIMITS[target]) itens[target] = LIMITS[target];
    if (itens[target] < 0) itens[target] = 0;
    setJSON("user_itens", itens);
};

// --- 4. SISTEMA DE EXPERIÊNCIA E NÍVEL ---

window.addExperience = async (amount) => {
    let stats = getJSON("user_xp", { level: 1, xp: 0, xp_acumulated: 0, xp_necessary: 100 });
    if (stats.level >= 100) return; // Limite nível 100 definido

    try {
        let levelsTable;
        try {
            const response = await fetch('JSONs/levels.JSON');
            levelsTable = await response.json();
        } catch (e) {
            levelsTable = [{ "Nível": stats.level }, { "Nível": stats.level + 1, "XP Necessário": 100 }];
        }
        
        stats.xp += amount;
        stats.xp_acumulated += amount;

        let checkLevelUp = true;
        while (checkLevelUp) {
            const nextLevelData = levelsTable.find(l => l.Nível === stats.level + 1);
            if (nextLevelData && stats.xp >= nextLevelData["XP Necessário"]) {
                stats.xp -= nextLevelData["XP Necessário"];
                stats.level++;
                stats.xp_necessary = nextLevelData["XP Necessário"];
                window.levelUpQueue.push(stats.level);
            } else {
                checkLevelUp = false;
            }
        }
        
        setJSON("user_xp", stats);

        // Atualização imediata da interface global
        const expTextEl = document.querySelector('.exp-text');
        const expFillEl = document.querySelector('.exp-bar-fill');
        const levelNumEl = document.querySelector('.level-number');
        
        if (expTextEl) {
            expTextEl.innerText = `${window.formatXP(stats.xp)} / ${window.formatXP(stats.xp_necessary)}`;
        }
        if (expFillEl) {
            const perc = Math.min((stats.xp / stats.xp_necessary) * 100, 100);
            expFillEl.style.width = `${perc}%`;
        }
        if (levelNumEl) {
            levelNumEl.innerText = stats.level.toString().padStart(2, '0');
        }

        if (window.levelUpQueue.length > 0) processLevelUpQueue();
    } catch (e) { console.error("Erro no processamento de XP:", e); }
};

window.processLevelUpQueue = () => {
    const modal = document.getElementById("level-up-modal");
    if (modal && modal.style.display === "flex") return;
    if (window.levelUpQueue.length > 0) {
        const nextLvlToShow = window.levelUpQueue.shift();
        window.showLevelUp(nextLvlToShow);
    }
};

window.showLevelUp = (newLvl) => {
    const modal = document.getElementById("level-up-modal");
    if (!modal) return;

    const lvlAudio = new Audio('assets/sounds/levelup.m4a');
    lvlAudio.volume = 1.0; 
    lvlAudio.play().catch(e => console.warn("Áudio bloqueado pelo navegador."));

    const coinsReward = newLvl * 1000;
    const senzuReward = newLvl * 10;

    document.getElementById("new-level-display").innerText = newLvl.toString().padStart(2, '0');
    document.getElementById("reward-coins").innerText = `+ ${coinsReward.toLocaleString('pt-BR')}`;
    document.getElementById("reward-senzus").innerText = `+ ${senzuReward.toLocaleString('pt-BR')}`;
    
    window.addCurrency('coins', coinsReward);
    window.addCurrency('senzus', senzuReward);
    modal.style.display = "flex";
};

window.closeLevelUp = () => {
    const modal = document.getElementById("level-up-modal");
    if (modal) {
        modal.style.display = "none";
        setTimeout(() => { processLevelUpQueue(); }, 300);
    }
};

// --- 5. OUTROS SISTEMAS (ARENAS E PASSE) ---

window.addTrophies = async (amount) => {
    let trophyData = getJSON("user_trophies", { trophies: 0, arena: 1 });
    trophyData.trophies += amount;
    if (trophyData.trophies < 0) trophyData.trophies = 0;
    try {
        const response = await fetch('JSONs/arenas.JSON');
        const arenas = await response.json();
        const currentArena = arenas.find(a => 
            trophyData.trophies >= a["Trofeus minimos"] && 
            trophyData.trophies <= a["Trofeus maximos"]
        );
        if (currentArena) trophyData.arena = currentArena.Arena;
        else if (trophyData.trophies > 3499) trophyData.arena = 7;
        setJSON("user_trophies", trophyData);
    } catch (e) { console.error("Erro arenas:", e); }
};

window.addPassExperience = async (amount) => {
    let passData = getJSON("user_pass", { level: 1, xp: 0 });
    const MAX_PASS_LEVEL = 50; 
    const XP_PER_LEVEL = 10;
    if (passData.level >= MAX_PASS_LEVEL) return;

    passData.xp += amount;
    let leveledUp = false;
    
    while (passData.xp >= XP_PER_LEVEL && passData.level < MAX_PASS_LEVEL) {
        passData.xp -= XP_PER_LEVEL;
        passData.level++;
        leveledUp = true;
    }
    if (passData.level >= MAX_PASS_LEVEL) passData.xp = 0;
    setJSON("user_pass", passData);
};
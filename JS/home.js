/* --- JS/home.js COMPLETO --- */
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. UTILITÁRIOS
    const formatNumber = (num) => (num ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // 2. ECONOMIA (MOEDAS E SENZUS)
    window.updatePlayerStats = () => {
        const itens = JSON.parse(localStorage.getItem("user_itens")) || { coins: 0, senzus: 0 };
        const coinsEl = document.getElementById("user-coins");
        const senzusEl = document.getElementById("user-senzus");

        if (coinsEl) coinsEl.innerText = formatNumber(itens.coins);
        if (senzusEl) senzusEl.innerText = formatNumber(itens.senzus);
    };

    // 3. SISTEMA DE XP E NÍVEL
    const updateEXP = () => {
        const stats = JSON.parse(localStorage.getItem("user_xp")) || { level: 1, xp: 0, xp_necessary: 100 };
        const levelEl = document.getElementById("user-level");
        const expTextEl = document.getElementById("exp-text");
        const expFillEl = document.getElementById("exp-fill");

        if (levelEl) {
            levelEl.innerText = stats.level >= 99 ? "MAX" : stats.level.toString().padStart(2, '0');
        }

        if (stats.level >= 99) {
            if (expTextEl) expTextEl.innerText = "MAX";
            if (expFillEl) expFillEl.style.width = "100%";
            return;
        }

        if (expTextEl) expTextEl.innerText = `${stats.xp}/${stats.xp_necessary}`;
        
        const percentage = Math.min((stats.xp / stats.xp_necessary) * 100, 100);
        if (expFillEl) expFillEl.style.width = `${percentage}%`;
    };

    // 4. ATUALIZAÇÃO DE TROFÉUS E RADAR VIA JSON
    const updateTrophyUI = async () => {
        try {
            const response = await fetch('JSONs/arenas.json');
            const arenasData = await response.json();
            
            const trophyData = JSON.parse(localStorage.getItem("user_trophies")) || { trophies: 0, arena: 1 };
            const currentTrophies = trophyData.trophies || 0;

            const correctArena = arenasData.find(a => 
                currentTrophies >= a["Trofeus minimos"] && 
                currentTrophies <= a["Trofeus maximos"]
            ) || arenasData[0];

            const newArenaId = correctArena.Arena;

            if (newArenaId !== trophyData.arena) {
                trophyData.arena = newArenaId;
                localStorage.setItem("user_trophies", JSON.stringify(trophyData));
            }

            const trophyEl = document.getElementById("user-trophies");
            if (trophyEl) trophyEl.innerText = formatNumber(currentTrophies);

            const arenaImg = document.getElementById("arena-display");
            if (arenaImg) {
                arenaImg.src = `pictures/arenas/${newArenaId}.webp`;
            }

        } catch (error) {
            console.error("Erro ao carregar arenas.json:", error);
        }
    };

    // 5. PASSE DE BATALHA
    const updatePassUI = () => {
        const passData = JSON.parse(localStorage.getItem("user_pass")) || { level: 1, xp: 0 };
        const XP_PER_LEVEL = 10;
        const passLevelEl = document.querySelector('.pass-level');
        const passFillEl = document.querySelector('.pass-progress-fill');
        const passTextEl = document.querySelector('.pass-text');

        if (passLevelEl) passLevelEl.innerText = passData.level.toString().padStart(2, '0');
        if (passFillEl && passTextEl) {
            const percentage = Math.min((passData.xp / XP_PER_LEVEL) * 100, 100);
            passFillEl.style.width = `${percentage}%`;
            passTextEl.innerText = `${passData.xp}/${XP_PER_LEVEL}`;
        }
    };

    window.updatePlayerStats();
    updateEXP();
    await updateTrophyUI();
    updatePassUI();

    document.querySelectorAll('.btn, .radar-container, .capsule-slot').forEach(el => {
        el.addEventListener('click', () => {
            el.style.transform = "scale(0.95)";
            setTimeout(() => { el.style.transform = "scale(1)"; }, 100);
        });
    });

    const radarContainer = document.querySelector('.radar-container');
    if (radarContainer) {
        radarContainer.addEventListener('click', () => {
            setTimeout(() => { location.href = 'arenas.html'; }, 150);
        });
    }

    const btnFree = document.getElementById('btn-free-capsule');
    if (btnFree) {
        btnFree.addEventListener('click', () => {
            if (typeof processResgate === 'function') processResgate(1);
        });
    }

    window.addEventListener('storage', async () => {
        window.updatePlayerStats();
        updateEXP();
        await updateTrophyUI();
        updatePassUI();
    });
});
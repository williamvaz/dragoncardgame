/* --- JS/rewards.js --- */

async function processResgate(capsuleId) {
    try {
        const response = await fetch('JSONs/capsules_data.json');
        const data = await response.json();
        const info = data.find(c => c.id === parseInt(capsuleId));

        if (!info) return;

        const ganhouCoins = Math.floor(Math.random() * (info.coins[1] - info.coins[0] + 1)) + info.coins[0];
        const ganhouSenzus = Math.floor(Math.random() * (info.senzu[1] - info.senzu[0] + 1)) + info.senzu[0];

        let queue = [
            { type: 'coins', val: ganhouCoins, img: 'assets/elements/coins.webp' },
            { type: 'senzus', val: ganhouSenzus, img: 'assets/elements/senzu.webp' }
        ];

        if (info.qtd) {
            queue.push({ type: 'cartas', val: 'PACOTE', img: 'assets/menu_icons/colecao.webp' });
        }

        startOpeningSequence(info.nome, info.id, queue, { ganhouCoins, ganhouSenzus });
    } catch (e) { console.error("Erro no resgate:", e); }
}

function startOpeningSequence(nome, imgId, queue, totais) {
    const overlay = document.getElementById("reward-display-overlay");
    if (!overlay) return;

    overlay.innerHTML = `
        <h1 id="reward-title" class="reward-title">${nome}</h1>
        <div id="anim-stage">
            <div id="main-capsule" class="capsule-anim-container">
                <img src="pictures/capsules/${imgId}.webp" style="width:45dvw">
            </div>
        </div>
        <div id="tap-msg" class="tap-instruction">TOQUE PARA ABRIR</div>
    `;
    overlay.style.display = "flex";

    const capsule = document.getElementById("main-capsule");
    let step = 0;

    overlay.onclick = (e) => {
        if (e.target.classList.contains('btn-reward-close')) return;

        if (step === 0) {
            capsule.classList.add('shake');
            setTimeout(() => {
                capsule.classList.replace('shake', 'explode');
                createCartoonSmokeEffect();
                document.getElementById("tap-msg").innerText = "PRÓXIMO ITEM";
                document.getElementById("reward-title").innerText = "RECOMPENSA";
                step++;
                revealNextItem();
            }, 600);
        } else if (step <= queue.length) {
            revealNextItem();
        } else {
            showFinalSummary(totais);
        }
    };

    function revealNextItem() {
        const stage = document.getElementById("anim-stage");
        const existing = stage.querySelector('.reward-card-pop');
        if (existing) existing.remove();

        const item = queue[step - 1];
        let displayName = "";
        
        if (item.type === 'coins') displayName = "ZENIS";
        else if (item.type === 'senzus') displayName = "SENZUS";
        else if (item.type === 'cartas') displayName = "CARTAS";

        const card = document.createElement('div');
        card.className = 'reward-card-pop';
        card.innerHTML = `
            <div class="card-art-container">
                <img src="${item.img}" class="card-item-art">
            </div>
            <div class="reward-val-text">+${item.val}</div>
            <div class="reward-item-name">${displayName}</div>
            <div class="step-counter">${step} / ${queue.length}</div>
        `;
        stage.appendChild(card);
        step++;
    }
}

function showFinalSummary(totais) {
    const overlay = document.getElementById("reward-display-overlay");
    overlay.onclick = null;

    if (window.addCurrency) {
        window.addCurrency('coins', totais.ganhouCoins);
        window.addCurrency('senzus', totais.ganhouSenzus);
    }

    overlay.innerHTML = `
        <h1 class="reward-title">CAPSULA COLETADA!</h1>
        <div class="final-grid">
            <div class="mini-card">
                <img src="assets/elements/coins.webp">
                <span>${totais.ganhouCoins}</span>
            </div>
            <div class="mini-card">
                <img src="assets/elements/senzu.webp">
                <span>${totais.ganhouSenzus}</span>
            </div>
        </div>
        <button class="btn-reward-close" onclick="closeRewardScreen()">FECHAR</button>
    `;
}

function closeRewardScreen() {
    const overlay = document.getElementById("reward-display-overlay");
    if (overlay) overlay.style.display = "none";
}

function createCartoonSmokeEffect() {
    const stage = document.getElementById("anim-stage");
    if (!stage) return;

    const smokeContainer = document.createElement('div');
    smokeContainer.id = 'smoke-container';
    stage.appendChild(smokeContainer);

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'smoke-particle';
        const dx = (Math.random() - 0.5) * 200;
        const dy = (Math.random() - 0.5) * 200;
        const finalScale = Math.random() * 2.5 + 1.5;
        const size = Math.random() * 7 + 5;

        particle.style.width = `${size}dvw`;
        particle.style.height = `${size}dvw`;
        particle.style.setProperty('--dx', `${dx}dvw`);
        particle.style.setProperty('--dy', `${dy}dvw`);
        particle.style.setProperty('--final-scale', finalScale);
        particle.style.animationDelay = `${Math.random() * 0.2}s`;

        smokeContainer.appendChild(particle);
    }

    setTimeout(() => { smokeContainer.remove(); }, 1000);
}
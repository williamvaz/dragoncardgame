/* --- JS/rewards.js --- */

async function processResgate(capsuleId) {
    try {
        const response = await fetch('JSONs/capsules_data.json');
        const data = await response.json();
        const info = data.find(c => c.id === parseInt(capsuleId));

        if (!info) return;

        // Sorteio de valores numéricos baseados no JSON
        const ganhouCoins = Math.floor(Math.random() * (info.coins[1] - info.coins[0] + 1)) + info.coins[0];
        const ganhouSenzus = Math.floor(Math.random() * (info.senzu[1] - info.senzu[0] + 1)) + info.senzu[0];
        
        // Fila de exibição um a um
        let queue = [
            { type: 'coins', val: ganhouCoins, img: 'assets/elements/coins.webp' },
            { type: 'senzus', val: ganhouSenzus, img: 'assets/elements/senzu.webp' }
        ];

        // Se houver cartas no JSON, adiciona um card informativo na fila
        if (info.qtd) {
            queue.push({ type: 'cartas', val: 'CARTAS', img: 'assets/menu_icons/colecao.webp' });
        }

        startOpeningSequence(info.nome, info.id, queue, {ganhouCoins, ganhouSenzus});
    } catch (e) { console.error("Erro no resgate:", e); }
}

function startOpeningSequence(nome, imgId, queue, totais) {
    const overlay = document.getElementById("reward-display-overlay");
    if (!overlay) return;

    // Título dinâmico puxado do JSON
    overlay.innerHTML = `
        <h1 id="reward-title" class="reward-title">${nome}</h1>
        <div id="anim-stage">
            <div id="main-capsule" class="capsule-anim-container">
                <img src="pictures/capsules/${imgId}.webp" style="width:40dvw">
            </div>
        </div>
        <div id="tap-msg" class="tap-instruction">TOQUE PARA ABRIR</div>
    `;
    overlay.style.display = "flex";

    const capsule = document.getElementById("main-capsule");
    let step = 0;

    overlay.onclick = (e) => {
        // Ignora cliques no botão de fechar para não reiniciar o loop
        if (e.target.classList.contains('btn-reward-close')) return;

        if (step === 0) {
            // Inicia Trepidação e Explosão
            capsule.classList.add('shake');
            setTimeout(() => {
                capsule.classList.replace('shake', 'explode');
                document.getElementById("tap-msg").innerText = "PRÓXIMO ITEM";
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
        const card = document.createElement('div');
        card.className = 'reward-card-pop';
        card.innerHTML = `
            <img src="${item.img}" style="height:15dvh">
            <span class="reward-val-text">+${item.val}</span>
            <div class="step-counter">${step} / ${queue.length}</div>
        `;
        stage.appendChild(card);
        step++;
    }
}

function showFinalSummary(totais) {
    const overlay = document.getElementById("reward-display-overlay");
    overlay.onclick = null; // Trava cliques soltos para obrigar o uso do botão OK

    // Adiciona moedas e senzus na economia (SEM ADICIONAR XP)
    if (window.addCurrency) {
        window.addCurrency('coins', totais.ganhouCoins);
        window.addCurrency('senzus', totais.ganhouSenzus);
    }

    overlay.innerHTML = `
        <h1 class="reward-title">COLETADO!</h1>
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
        <button class="btn-reward-close" onclick="closeRewardScreen()">OK</button>
    `;
}

// FUNÇÃO DE FECHAMENTO QUE RESOLVE O ERRO DE CONSOLE
function closeRewardScreen() {
    const overlay = document.getElementById("reward-display-overlay");
    if (overlay) overlay.style.display = "none";
}
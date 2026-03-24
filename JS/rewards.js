/* --- JS/rewards.js --- */

// Carrega as esferas já possuídas do localStorage ao iniciar
let jogadorEsferas = JSON.parse(localStorage.getItem('user_esferas')) || [];

/**
 * Lógica de Sorteio de Esferas baseada em Probabilidade e Não-Repetição
 */
async function sortearEsfera(chanceCapsula) {
    if (Math.random() * 100 > chanceCapsula) return null;

    try {
        const response = await fetch('JSONs/esferas.json');
        const listaDragoes = await response.json();

        const totalPesos = listaDragoes.reduce((sum, d) => sum + d.Probabilidade, 0);
        let randomDrago = Math.random() * totalPesos;
        let dragaoSorteado = null;

        for (const d of listaDragoes) {
            if (randomDrago < d.Probabilidade) {
                dragaoSorteado = d;
                break;
            }
            randomDrago -= d.Probabilidade;
        }

        if (!dragaoSorteado) return null;

        const estrela = Math.floor(Math.random() * dragaoSorteado["Qtde Esferas"]) + 1;
        const esferaID = `${dragaoSorteado.ID}_${estrela}`;

        // Verifica se o jogador já tem essa esfera específica
        if (jogadorEsferas.includes(esferaID)) {
            console.log(`Esfera ${esferaID} já possuída. Ignorando.`);
            return null;
        }

        return {
            id: esferaID,
            estrelasDesc: `${estrela} Estrelas`, // Texto para o topo
            dragonName: dragaoSorteado.Dragon,   // Texto para baixo
            img: `pictures/esferas/${esferaID}.webp`
        };
    } catch (e) {
        console.error("Erro ao sortear esfera:", e);
        return null;
    }
}

async function processResgate(capsuleId) {
    try {
        const response = await fetch('JSONs/capsules_data.json');
        const data = await response.json();
        const info = data.find(c => c.id === parseInt(capsuleId));

        if (!info) return;

        const ganhouCoins = Math.floor(Math.random() * (info.coins[1] - info.coins[0] + 1)) + info.coins[0];
        const ganhouSenzus = Math.floor(Math.random() * (info.senzu[1] - info.senzu[0] + 1)) + info.senzu[0];

        const esferaGanha = await sortearEsfera(info.chance_esfera);

        let rawQueue = [
            { type: 'coins', val: ganhouCoins, img: 'assets/elements/coins.webp' },
            { type: 'senzus', val: ganhouSenzus, img: 'assets/elements/senzu.webp' }
        ];

        let queue = rawQueue.filter(item => item.val > 0);

        if (esferaGanha) {
            queue.push({
                type: 'esfera',
                img: esferaGanha.img,
                estrelasDesc: esferaGanha.estrelasDesc,
                dragonName: esferaGanha.dragonName,
                esferaId: esferaGanha.id
            });
        }

        if (info.qtd) {
            queue.push({ type: 'cartas', val: 'PACOTE', img: 'assets/menu_icons/colecao.webp' });
        }

        if (queue.length === 0) {
            queue.push({ type: 'coins', val: 1, img: 'assets/elements/coins.webp' });
        }

        startOpeningSequence(info.nome, info.id, queue, { ganhouCoins, ganhouSenzus, esferaGanha });
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
        const faltam = queue.length - step;

        let displayValue = ""; 
        let displayName = "";  

        if (item.type === 'coins') {
            displayValue = `+${item.val}`;
            displayName = "ZENIS";
        }
        else if (item.type === 'senzus') {
            displayValue = `+${item.val}`;
            displayName = "SENZUS";
        }
        else if (item.type === 'esfera') {
            displayValue = item.estrelasDesc; 
            displayName = item.dragonName;   
        }
        else if (item.type === 'cartas') {
            displayValue = "PACOTE";
            displayName = "CARTAS";
        }

        const card = document.createElement('div');
        card.className = 'reward-card-pop';

        card.innerHTML = `
            <div class="items-remaining-badge">
                <div class="badge-icon-minimal"></div> 
                <span class="badge-count">${faltam}</span>
            </div>
            <div class="card-art-container">
                <img src="${item.img}" class="card-item-art ${item.type === 'esfera' ? 'esfera-glow' : ''}">
            </div>
            <div class="reward-val-text">${displayValue}</div>
            <div class="reward-item-name">${displayName}</div>
        `;

        stage.appendChild(card);
        step++;
    }
}

function showFinalSummary(totais) {
    const overlay = document.getElementById("reward-display-overlay");
    overlay.onclick = null;

    // --- ATUALIZAÇÃO DO LOCALSTORAGE ---
    let userItens = JSON.parse(localStorage.getItem('user_itens')) || { coins: 0, senzus: 0, zeni: 0 };
    
    // Soma os novos valores aos já existentes
    userItens.coins += totais.ganhouCoins;
    userItens.senzus += totais.ganhouSenzus;
    
    // Salva de volta no localStorage
    localStorage.setItem('user_itens', JSON.stringify(userItens));

    if (totais.esferaGanha) {
        jogadorEsferas.push(totais.esferaGanha.id);
        localStorage.setItem('user_esferas', JSON.stringify(jogadorEsferas));
    }
    // -----------------------------------

    let cardsHTML = '';
    if (totais.ganhouCoins > 0) cardsHTML += createMiniCardHTML('assets/elements/coins.webp', totais.ganhouCoins, 'ZENIS');
    if (totais.ganhouSenzus > 0) cardsHTML += createMiniCardHTML('assets/elements/senzu.webp', totais.ganhouSenzus, 'SENZUS');
    if (totais.esferaGanha) cardsHTML += createMiniCardHTML(totais.esferaGanha.img, '!', 'ESFERA');

    overlay.innerHTML = `
        <h1 class="reward-title">CÁPSULA COLETADA!</h1>
        <div class="final-grid">
            ${cardsHTML}
        </div>
        <button class="btn-reward-close" onclick="closeRewardScreen()">FECHAR</button>
    `;
}

function createMiniCardHTML(img, val, name) {
    return `
        <div class="mini-reward-card">
            <img src="${img}" class="mini-card-art">
            <span class="mini-card-val">${val === '!' ? 'NOVA' : '+' + val}</span>
            <span class="mini-card-name">${name}</span>
        </div>
    `;
}

function closeRewardScreen() {
    const overlay = document.getElementById("reward-display-overlay");
    if (overlay) overlay.style.display = "none";
    // Opcional: recarregar a UI do jogo para mostrar os novos valores
    if(window.updateUI) window.updateUI(); 
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
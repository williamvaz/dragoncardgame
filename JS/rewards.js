/* --- JS/rewards.js --- */

let db_characters = [];
let db_levels_cards = [];
let db_esferas = [];

let jogadorEsferas = JSON.parse(localStorage.getItem('user_esferas')) || [];
let jogadorCartas = JSON.parse(localStorage.getItem('user_cards')) || [];

async function loadGameDatabase() {
    try {
        const [resp_c, resp_l, resp_e] = await Promise.all([
            fetch('JSONs/characters.json'),
            fetch('JSONs/levels_cards.json'),
            fetch('JSONs/esferas.json')
        ]);
        db_characters = await resp_c.json();
        db_levels_cards = await resp_l.json();
        db_esferas = await resp_e.json();
    } catch (e) { console.error("Erro ao carregar JSONs:", e); }
}
loadGameDatabase();

function getSaldoNumerico(id) {
    const registro = jogadorCartas.find(c => parseInt(c.id) === parseInt(id));
    return registro ? (parseInt(registro.cards) || 0) : 0;
}

function getLimitePorRaridade(rank) {
    const config = db_levels_cards.find(l => l.raridade === rank);
    return config ? config.cartas_upgrade.reduce((a, b) => a + b, 0) : 99999;
}

function getPassosUpgrade(rank) {
    const config = db_levels_cards.find(l => l.raridade === rank);
    return config ? config.cartas_upgrade : [];
}

function sortearSlotsDeCartas(info) {
    const qtdSlots = Math.floor(Math.random() * (info.slots[1] - info.slots[0] + 1)) + info.slots[0];
    let slots = [];
    for (const rank in info.garantias) {
        for (let i = 0; i < info.garantias[rank]; i++) {
            const c = gerarConteudoDoSlot(rank, info.qtd[rank]);
            if (c) slots.push(c);
        }
    }
    const pesos = { "F": 50, "E": 25, "D": 12, "C": 7, "B": 3, "A": 2, "Z": 1 };
    while (slots.length < qtdSlots) {
        const r = sortearChavePorPeso(pesos);
        const c = gerarConteudoDoSlot(r, info.qtd[r]);
        if (c) slots.push(c); else break;
    }
    const ord = ["F", "E", "D", "C", "B", "A", "Z"];
    return slots.sort((a, b) => ord.indexOf(a.rank) - ord.indexOf(b.rank));
}

function gerarConteudoDoSlot(rank, minMax) {
    const limite = getLimitePorRaridade(rank);
    const disp = db_characters.filter(c => c.raridade === rank && getSaldoNumerico(c.ID) < limite);
    if (disp.length === 0) return null;
    const totalP = disp.reduce((s, c) => s + (c.drop_weight || 1), 0);
    let rand = Math.random() * totalP;
    let escolhido = disp[0];
    for (const c of disp) {
        if (rand < (c.drop_weight || 1)) { escolhido = c; break; }
        rand -= (c.drop_weight || 1);
    }
    const qtd = Math.floor(Math.random() * (minMax[1] - minMax[0] + 1)) + minMax[0];
    return { type: 'carta_personagem', id: escolhido.ID, nome: escolhido.nome, img: `pictures/cards/${escolhido.ID}.webp`, rank, val: qtd };
}

function sortearChavePorPeso(obj) {
    const total = Object.values(obj).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [k, v] of Object.entries(obj)) { if (r < v) return k; r -= v; }
    return "F";
}

async function sortearEsfera(chance) {
    if (Math.random() * 100 > chance || !db_esferas.length) return null;
    const total = db_esferas.reduce((s, d) => s + d.Probabilidade, 0);
    let r = Math.random() * total;
    const sel = db_esferas.find(d => (r -= d.Probabilidade) < 0) || db_esferas[0];
    const est = Math.floor(Math.random() * sel["Qtde Esferas"]) + 1;
    const id = `${sel.ID}_${est}`;
    if (jogadorEsferas.includes(id)) return null;
    return { type: 'esfera', id, estrelasDesc: `${est} Estrelas`, dragonName: sel.Dragon, img: `pictures/esferas/${id}.webp` };
}

async function processResgate(capsuleId) {
    if (!db_characters.length) await loadGameDatabase();
    const resp = await fetch('JSONs/capsules_data.json');
    const capsules = await resp.json();
    const info = capsules.find(c => c.id === parseInt(capsuleId));
    
    let queue = [];
    const coins = Math.floor(Math.random() * (info.coins[1] - info.coins[0] + 1)) + info.coins[0];
    if (coins > 0) queue.push({ type: 'coins', val: coins, img: 'assets/elements/coins.webp' });
    const senzus = Math.floor(Math.random() * (info.senzu[1] - info.senzu[0] + 1)) + info.senzu[0];
    if (senzus > 0) queue.push({ type: 'senzus', val: senzus, img: 'assets/elements/senzu.webp' });
    const esfera = await sortearEsfera(info.chance_esfera);
    if (esfera) queue.push(esfera);
    const slots = info.qtd ? sortearSlotsDeCartas(info) : [];
    queue.push(...slots);

    if (queue.length > 0) startOpeningSequence(info.nome, info.id, queue, { coins, senzus, esfera, slotsDeCartas: slots });
}

function startOpeningSequence(nome, imgId, queue, totais) {
    const overlay = document.getElementById("reward-display-overlay");
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
    let step = 0;
    overlay.onclick = () => {
        if (step === 0) {
            const cap = document.getElementById("main-capsule");
            cap.classList.add("shake");
            setTimeout(() => {
                cap.classList.replace("shake", "explode");
                createCartoonSmokeEffect();
                document.getElementById("reward-title").innerText = "RECOMPENSA";
                document.getElementById("tap-msg").innerText = "PRÓXIMO ITEM";
                step++; revealNextItem(queue, step);
            }, 600);
        } else if (step < queue.length) { step++; revealNextItem(queue, step); }
        else { showFinalSummary(totais); }
    };
}

function revealNextItem(queue, step) {
    const stage = document.getElementById("anim-stage");
    if (stage.querySelector('.reward-card-pop')) stage.querySelector('.reward-card-pop').remove();
    const item = queue[step - 1];
    let vT = "", nB = "", isC = false;
    if (item.type === 'coins') { vT = `+${item.val}`; nB = "ZENIS"; }
    else if (item.type === 'senzus') { vT = `+${item.val}`; nB = "SENZUS"; }
    else if (item.type === 'esfera') { vT = item.estrelasDesc; nB = item.dragonName; }
    else if (item.type === 'carta_personagem') { vT = item.rank; nB = `${item.nome} +${item.val}`; isC = true; }
    
    const card = document.createElement('div');
    card.className = `reward-card-pop ${isC ? 'card-frente-template' : ''}`;
    card.innerHTML = `
        <div class="items-remaining-badge">
            <div class="badge-icon-minimal"></div>
            <span class="badge-count">${queue.length - step}</span>
        </div>
        <div class="card-art-container">
            <img src="${item.img}" class="card-item-art ${ (item.type === 'esfera' || item.rank === 'Z') ? 'esfera-glow' : '' }">
        </div>
        <div class="reward-val-text">${vT}</div>
        <div class="reward-item-name">${nB}</div>
    `;
    stage.appendChild(card);
}

function showFinalSummary(totais) {
    const snapshotSaldos = {};
    jogadorCartas.forEach(c => { snapshotSaldos[c.id] = parseInt(c.cards) || 0; });
    
    let itens = JSON.parse(localStorage.getItem('user_itens')) || { coins: 0, senzus: 0 };
    itens.coins += totais.coins;
    itens.senzus += totais.senzus;
    localStorage.setItem('user_itens', JSON.stringify(itens));

    if (totais.esfera) { 
        jogadorEsferas.push(totais.esfera.id); 
        localStorage.setItem('user_esferas', JSON.stringify(jogadorEsferas)); 
    }

    totais.slotsDeCartas.forEach(ganha => {
        let existente = jogadorCartas.find(c => parseInt(c.id) === parseInt(ganha.id));
        if (!existente) {
            jogadorCartas.push({ id: parseInt(ganha.id), level: 1, cards: ganha.val });
        } else {
            existente.cards = (parseInt(existente.cards) || 0) + ganha.val;
        }
    });
    localStorage.setItem('user_cards', JSON.stringify(jogadorCartas));

    if (window.updatePlayerStats) window.updatePlayerStats();

    let gridHTML = '';
    if (totais.coins > 0) gridHTML += createMiniCardHTML('assets/elements/coins.webp', null, 'ZENIS', false, false, totais.coins);
    if (totais.senzus > 0) gridHTML += createMiniCardHTML('assets/elements/senzu.webp', null, 'SENZUS', false, false, totais.senzus);
    if (totais.esfera) gridHTML += createMiniCardHTML(totais.esfera.img, null, 'ESFERA', false, false, 'NOVA');
    
    totais.slotsDeCartas.forEach(c => {
        const sAnt = snapshotSaldos[c.id] || 0;
        const sNov = getSaldoNumerico(c.id);
        const passos = getPassosUpgrade(c.rank);
        let up = false; let ac = 0;
        for (const m of passos) { ac += m; if (sAnt < ac && sNov >= ac) { up = true; break; } }
        gridHTML += createMiniCardHTML(c.img, c.rank, c.nome, true, up, c.val);
    });

    const overlay = document.getElementById("reward-display-overlay");
    overlay.onclick = null;
    overlay.innerHTML = `
        <div class="summary-container">
            <h1 class="reward-title">RECOMPENSAS</h1>
            <div class="final-grid-compact">${gridHTML}</div>
            <button class="btn-reward-close" onclick="closeRewardScreen()">COLETAR</button>
        </div>
    `;
}

function createMiniCardHTML(img, rank, name, isC = false, up = false, qtdRecebida = 0) {
    const clH = up ? 'ready-upgrade' : '';
    const bdH = up ? '<div class="upgrade-badge">UP!</div>' : '';
    
    if (!isC) {
        return `
            <div class="mini-reward-item resource-item">
                <div class="reward-art-wrapper">
                    <img src="${img}" class="resource-img-fix">
                </div>
                <div class="card-info-compact">
                    <span class="item-val">${typeof qtdRecebida === 'number' ? '+' + qtdRecebida : qtdRecebida}</span>
                    <span class="item-name">${name}</span>
                </div>
            </div>`;
    }

    const charData = db_characters.find(c => c.nome === name);
    const idStr = charData ? charData.ID.toString().padStart(5, '0') : "00001";

    return `
        <div class="mini-reward-item reward-card-unit ${clH}">
            ${bdH}
            <div class="reward-art-wrapper tcg-card-style">
                <img src="pictures/background/${charData ? charData.raridade_completa : 'F'}.webp" class="layer-background">
                <img src="pictures/characters/${idStr}.webp" class="char-img">
                <img src="pictures/rarity/${rank}.webp" class="layer-rarity">
                <img src="pictures/template/template_front.webp" class="layer-template-front">
                
                <div class="card-text-element layer-atk">${charData ? charData.atk : 0}</div>
                <div class="card-text-element layer-hp">${charData ? charData.hp : 0}</div>
                <div class="card-text-element layer-name">${name}</div>
                <div class="card-text-element layer-cost">${charData ? charData.custo : 0}</div>
            </div>
            <div class="card-info-compact">
                <div class="received-count">
                    <img src="assets/elements/card_icon_small.webp" class="small-card-icon">
                    <span class="received-val">+${qtdRecebida}</span>
                </div>
            </div>
        </div>
    `;
}

function closeRewardScreen() { document.getElementById("reward-display-overlay").style.display = "none"; }

function createCartoonSmokeEffect() {
    const stage = document.getElementById("anim-stage");
    const container = document.createElement('div');
    container.id = 'smoke-container';
    stage.appendChild(container);
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'smoke-particle';
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}dvw`);
        p.style.setProperty('--dy', `${(Math.random() - 0.5) * 200}dvw`);
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), 1000);
}
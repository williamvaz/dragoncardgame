/* --- JS/colecao.js --- */

// --- VARIÁVEIS DE CONTROLE GLOBAL ---
let multipliers = {};      // Armazena os multiplicadores de nível vindos do JSON
let allCharacters = [];    // Lista bruta de todos os personagens carregados
let sagasData = [];        // Dados das Sagas (nomes e IDs de imagem)
let allSkills = [];        // Todas as habilidades disponíveis no jogo
let currentFilters = {     // Estado atual dos filtros selecionados pelo usuário
    rarity: 'TODAS',
    saga: 'TODAS',
    status: 'TODAS',
    order: 'ID (asc)',
    classe: 'TODAS',
    skill: 'TODAS'
};

// --- CONFIGURAÇÕES DO MOTOR FÍSICO DE GIRO 3D ---
// Controla a rotação das cartas quando o usuário clica e arrasta no popup
let isDragging = false;
let startX = 0;
let currentRotationY = 0;
let velocityX = 0;
let lastX = 0;
let lastTime = 0;
let animationFrameId = null;
const DRAG_SENSITIVITY = 0.5;    // Quão rápido a carta gira com o mouse
const INERTIA_FRICTION = 0.95;   // O quão suave a carta para de girar
const MIN_VELOCITY = 1.0;        // Velocidade mínima para manter a inércia

// --- INICIALIZAÇÃO (Roda ao carregar a página) ---
document.addEventListener("DOMContentLoaded", async () => {
    updateCollectionTopBar(); // Atualiza a barra de XP e itens no topo da tela
    try {
        // Busca os multiplicadores de status por nível
        const multRes = await fetch('JSONs/multiplicador.json');
        const multData = await multRes.json();
        multData[0].level.forEach((lvl, idx) => {
            multipliers[lvl] = multData[0].multiplicador[idx];
        });

        // Busca a lista de personagens
        const charRes = await fetch('JSONs/characters.json');
        allCharacters = await charRes.json();

        // Busca a lista de sagas
        const sagasRes = await fetch('JSONs/sagas.json');
        sagasData = await sagasRes.json();

        // Busca a lista de habilidades
        const skillsRes = await fetch('JSONs/skills.json');
        allSkills = await skillsRes.json();

        renderCollection();  // Desenha as cartas na tela
        setupFilterEvents(); // Ativa os botões de filtro (Scouter)
    } catch (e) {
        console.error("Erro fatal ao carregar arquivos JSON:", e);
    }
});

// Calcula o valor real de um atributo (Base * Multiplicador do Nível)
function getCalculatedStat(base, lvl) {
    const mult = multipliers[lvl] || multipliers[1] || 1.0;
    return Math.round(parseInt(base) * mult);
}

// --- RENDERIZAÇÃO PRINCIPAL DA COLEÇÃO ---
function renderCollection() {
    const grid = document.getElementById("main-collection-grid");
    if (!grid) return;

    // Pega as cartas que o usuário realmente possui no LocalStorage
    const userCards = JSON.parse(localStorage.getItem("user_cards")) || [];
    grid.innerHTML = "";

    // 1. Lógica de Filtragem: Decide quais cartas mostrar
    let filtered = allCharacters.filter(char => {
        const cardData = userCards.find(c => c.id === parseInt(char.ID));

        // Filtros básicos: Raridade, Saga e Classe
        const matchRarity = currentFilters.rarity === 'TODAS' || char.raridade === currentFilters.rarity;
        const matchSaga = currentFilters.saga === 'TODAS' || char.saga === currentFilters.saga;
        const matchClasse = currentFilters.classe === 'TODAS' || char.classe === currentFilters.classe;

        // Filtro de Habilidade: Verifica se alguma das 4 skills do char bate com o filtro
        const cardSkillDetails = allSkills.filter(s =>
            [String(char.habilidade_1), String(char.habilidade_2), String(char.habilidade_3), String(char.habilidade_4)].includes(String(s.ID))
        );
        const matchSkill = currentFilters.skill === 'TODAS' || cardSkillDetails.some(s => s.skill === currentFilters.skill);

        // Filtro de Status: Se o usuário já possui a carta (OBTIDO) ou não
        let matchStatus = true;
        if (currentFilters.status === 'OBTIDO') matchStatus = !!cardData;
        if (currentFilters.status === 'NAO_OBTIDO') matchStatus = !cardData;

        return matchRarity && matchSaga && matchStatus && matchClasse && matchSkill;
    });

    // 2. Lógica de Ordenação: Decide em que ordem as cartas aparecem
    const rarityOrder = ["F-", "F", "F+", "E-", "E", "E+", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "Z-", "Z", "Z+"];

    filtered.sort((a, b) => {
        const [crit, dir] = currentFilters.order.split(' ');
        const isAsc = dir === '(asc)' || dir === 'A-Z' || dir === '-';

        // Pega o nível atual para ordenar por status real (ATK/HP calculado)
        const dataA = userCards.find(c => c.id === parseInt(a.ID)) || { level: 1 };
        const dataB = userCards.find(c => c.id === parseInt(b.ID)) || { level: 1 };

        let vA, vB;
        switch (crit) {
            case 'Nome':
                vA = a.nome.toLowerCase();
                vB = b.nome.toLowerCase();
                break;
            case 'Raridade':
                vA = rarityOrder.indexOf(a.raridade_completa);
                vB = rarityOrder.indexOf(b.raridade_completa);
                break;
            case 'Custo':
                vA = parseInt(a.custo || 0);
                vB = parseInt(b.custo || 0);
                break;
            case 'HP':
                vA = getCalculatedStat(a.hp, dataA.level);
                vB = getCalculatedStat(b.hp, dataB.level);
                break;
            case 'ATK':
                vA = getCalculatedStat(a.atk, dataA.level);
                vB = getCalculatedStat(b.atk, dataB.level);
                break;
            case 'ID':
            default:
                vA = parseInt(a.ID);
                vB = parseInt(b.ID);
                break;
        }

        if (vA < vB) return isAsc ? -1 : 1;
        if (vA > vB) return isAsc ? 1 : -1;
        return 0;
    });

    // 3. Renderização Visual: Cria os elementos HTML de cada card
    filtered.forEach(char => {
        const cardData = userCards.find(c => c.id === parseInt(char.ID));
        const lvl = cardData ? cardData.level : 1;
        const idStr = char.ID.toString().padStart(5, '0');
        const slot = document.createElement("div");
        slot.className = `card-container-wrapper`;

        // Se a carta é do usuário, mostra a barra de progresso para o próximo nível
        let upHTML = '';
        if (cardData) {
            const need = Math.pow(2, lvl); // Requisito de cartas repetidas: 2 ^ nível atual
            const prg = Math.min((cardData.cards / need) * 100, 100);
            upHTML = `<div class="upgrade-bar-external">
                        <div class="upgrade-fill ${cardData.cards >= need ? 'ready' : ''}" style="width: ${prg}%"></div>
                        <span class="upgrade-text">${cardData.cards}/${need}</span>
                      </div>`;
        }

        // Monta o visual do card usando as camadas (layers) de imagens
        slot.innerHTML = `
            <div class="card-image-area" style="${cardData ? '' : 'filter: grayscale(1) brightness(0.2); opacity: 0.6;'}">
                <img src="pictures/characters/${idStr}.webp" class="char-img">
                <img src="pictures/rarity/${char.raridade_completa}.webp" class="layer-rarity">
                <img src="pictures/position/${char.position === 'Recuado' ? '1.webp' : '2.webp'}" class="layer-position">
                <img src="pictures/classes/${char.classe}.webp" class="layer-class">
                <img src="pictures/template/Frente.webp" class="layer-template-front">
                <div class="card-text-element layer-atk">${getCalculatedStat(char.atk, lvl)}</div>
                <div class="card-text-element layer-hp">${getCalculatedStat(char.hp, lvl)}</div>
                <div class="card-text-element layer-name">${char.nome}</div>
                <div class="card-text-element layer-cost">${char.custo}</div>
            </div>${upHTML}`;

        // Clique na carta abre o menu de ações (Informações / Adicionar ao Deck)
        slot.onclick = (e) => {
            e.stopPropagation();
            if (cardData) showCardActions(char, slot);
        };
        grid.appendChild(slot);
    });
}

// --- CONFIGURAÇÃO DOS BOTÕES DO SCOUTER (Filtros) ---
async function setupFilterEvents() {
    const btns = document.querySelectorAll('.btn-scouter-filter');

    // Definição das opções de cada filtro
    const raridades = [{ id: 'TODAS', nome: 'TODAS' }, { id: 'F', img: 'pictures/rarity/2.webp' }, { id: 'E', img: 'pictures/rarity/5.webp' }, { id: 'D', img: 'pictures/rarity/8.webp' }, { id: 'C', img: 'pictures/rarity/11.webp' }, { id: 'B', img: 'pictures/rarity/14.webp' }, { id: 'A', img: 'pictures/rarity/17.webp' }, { id: 'Z', img: 'pictures/rarity/20.webp' }];
    const sagas = [{ id: 'TODAS', nome: 'TODAS' }, ...sagasData.map(s => ({ id: s.Saga, nome: s.Saga, img: `pictures/sagas/${s.ID}.webp` }))];
    const classes = [{ id: 'TODAS', nome: 'TODAS' }, { id: 'Alienigenas', img: 'pictures/classes/Alienígenas.webp' }, { id: 'Artificiais', img: 'pictures/classes/Artificiais.webp' }, { id: 'Celestiais', img: 'pictures/classes/Celestiais.webp' }, { id: 'Entidades', img: 'pictures/classes/Entidades.webp' }, { id: 'Multiversais', img: 'pictures/classes/Multiversais.webp' }, { id: 'Namekuseijins', img: 'pictures/classes/Namekuseijins.webp' }, { id: 'Saiyajins', img: 'pictures/classes/Saiyajins.webp' }, { id: 'Terraqueos', img: 'pictures/classes/Terráqueos.webp' }];

    // Mapeia as habilidades únicas para o filtro de Skills
    const uniqueSkills = [];
    const skillMap = new Set();
    allSkills.forEach(s => {
        if (!skillMap.has(s.skill)) {
            skillMap.add(s.skill);
            uniqueSkills.push({ id: s.skill, img: `pictures/skills/${s.skill}.webp` });
        }
    });
    const skillList = [{ id: 'TODAS', nome: 'TODAS' }, ...uniqueSkills];

    // Opções de ordenação disponíveis
    const orders = [
        { id: 'ID (asc)', nome: 'ID -' }, { id: 'ID (des)', nome: 'ID +' },
        { id: 'Nome (asc)', nome: 'A-Z' }, { id: 'Nome (des)', nome: 'Z-A' },
        { id: 'Custo (asc)', nome: 'CUSTO -' }, { id: 'Custo (des)', nome: 'CUSTO +' },
        { id: 'HP (asc)', nome: 'HP -' }, { id: 'HP (des)', nome: 'HP +' },
        { id: 'ATK (asc)', nome: 'ATK -' }, { id: 'ATK (des)', nome: 'ATK +' }
    ];

    // Atribui as funções de clique para abrir cada menu dropdown
    btns[0].onclick = (e) => { e.stopPropagation(); showDropdown(raridades, 'rarity', btns[0]); };
    btns[1].onclick = (e) => { e.stopPropagation(); showDropdown(sagas, 'saga', btns[1]); };
    btns[2].onclick = (e) => { e.stopPropagation(); showDropdown(classes, 'classe', btns[2]); };
    btns[3].onclick = (e) => { e.stopPropagation(); showDropdown(skillList, 'skill', btns[3]); };
    btns[4].onclick = (e) => { e.stopPropagation(); showDropdown(orders, 'order', btns[4]); };

    // Fecha qualquer dropdown se clicar fora deles
    window.onclick = () => hideDropdown();
}

// Cria e mostra o menu flutuante de opções
function showDropdown(items, type, btn) {
    hideDropdown();
    const d = document.createElement('div'); d.id = 'filter-dropdown'; d.className = 'dropdown-scouter';
    items.forEach(i => {
        const o = document.createElement('div'); o.className = 'dropdown-option';
        o.innerHTML = i.img ? `<img src="${i.img}">` : `<span>${i.nome || i.id}</span>`;
        o.onclick = (e) => {
            e.stopPropagation();
            currentFilters[type] = i.id; // Atualiza o estado do filtro global
            btn.innerText = i.nome || i.id; // Muda o texto do botão para o que foi selecionado
            renderCollection(); // Atualiza a grade de cartas
            hideDropdown();
        };
        d.appendChild(o);
    });
    btn.appendChild(d);
}

// Remove o dropdown da tela
function hideDropdown() {
    const el = document.getElementById('filter-dropdown');
    if (el) el.remove();
}

// --- POPUP DINÂMICO DE DETALHES (Informações da Carta) ---
function openInfoPopup(char) {
    const popup = document.getElementById("info-popup");
    const userCards = JSON.parse(localStorage.getItem("user_cards")) || [];
    const cardData = userCards.find(c => c.id === parseInt(char.ID)) || { level: 1, cards: 0 };
    const lvl = cardData.level;
    const idStr = char.ID.toString().padStart(5, '0');

    // Preenche a frente da carta no popup de giro 3D
    document.querySelector(".flip-card-front").innerHTML = `<div class="card-image-area"><img src="pictures/characters/${idStr}.webp" class="char-img"><img src="pictures/rarity/${char.raridade_completa}.webp" class="layer-rarity"><img src="pictures/position/${char.position === 'Recuado' ? '1.webp' : '2.webp'}" class="layer-position"><img src="pictures/classes/${char.classe}.webp" class="layer-class"><img src="pictures/template/Frente.webp" class="layer-template-front"><div class="card-text-element layer-atk">${getCalculatedStat(char.atk, lvl)}</div><div class="card-text-element layer-hp">${getCalculatedStat(char.hp, lvl)}</div><div class="card-text-element layer-name">${char.nome}</div><div class="card-text-element layer-cost">${char.custo}</div></div>`;

    // Preenche logo da saga e biografia
    const saga = sagasData.find(s => s.Saga === char.saga);
    document.getElementById("info-saga-logo").src = saga ? `pictures/sagas/${saga.ID}.webp` : "";
    document.getElementById("info-bio-text").innerText = char.bibliografia || "Bio não disponível.";

    // Busca e desenha as habilidades do personagem
    const sIds = [char.habilidade_1, char.habilidade_2, char.habilidade_3, char.habilidade_4].map(id => String(id));
    renderSkillsList(allSkills.filter(s => sIds.includes(String(s.ID))));

    // Atualiza o estado do botão de "USAR" (Equipar no Deck)
    updateUseButtonState(char);

    // Atualiza a barra de evolução dentro do popup
    const need = Math.pow(2, lvl);
    document.getElementById("info-upgrade-fill").style.width = `${Math.min((cardData.cards / need) * 100, 100)}%`;
    document.getElementById("info-upgrade-label").innerText = `${cardData.cards}/${need}`;

    // Habilita ou desabilita o botão de EVOLUIR conforme a quantidade de cartas
    const btnE = document.querySelector(".btn-info-action.evolve");
    if (cardData.cards >= need) {
        btnE.className = "btn-info-action evolve ready";
        btnE.onclick = () => performUpgrade(char.ID);
    } else {
        btnE.className = "btn-info-action evolve disabled";
        btnE.onclick = null;
    }

    // Reseta a rotação da carta e exibe o popup
    currentRotationY = 0; velocityX = 0; updateCardTransform(0);
    popup.classList.add("active");
    switchTab('skills');
    setupPhysicalDragEvents();
}

// Altera o texto do botão entre "USAR" e "REMOVER"
function updateUseButtonState(char) {
    const d = JSON.parse(localStorage.getItem("user_deck")) || [];
    const isIn = d.find(c => parseInt(c.ID) === parseInt(char.ID));
    const b = document.querySelector(".btn-info-action.use");
    b.innerText = isIn ? "REMOVER" : "USAR";
    b.className = isIn ? "btn-info-action use use-remove" : "btn-info-action use use-add";
    b.onclick = () => { if (isIn) removeFromDeckById(char.ID); else equipToDeck(char); updateUseButtonState(char); };
}

// Lógica para subir o nível da carta e salvar no LocalStorage
function performUpgrade(id) {
    let u = JSON.parse(localStorage.getItem("user_cards")) || [];
    let idx = u.findIndex(c => c.id === parseInt(id));
    
    if (idx !== -1) {
        let c = u[idx];
        let need = Math.pow(2, c.level);
        
        if (c.cards >= need) {
            c.cards -= need; // Gasta as cartas
            c.level++;       // Sobe o nível
            
            // Salva os novos dados
            localStorage.setItem("user_cards", JSON.stringify(u));
            
            // --- ATUALIZAÇÃO EM TEMPO REAL ---
            renderCollection();      // Atualiza a grade de "Todas as Cartas"
            updateDeckUI();          // Atualiza o Deck no topo
            updateCollectionTopBar(); // Atualiza XP/Moedas se necessário
            
            // Fecha o popup ou reabre para mostrar os novos stats
            const charObj = allCharacters.find(char => parseInt(char.ID) === parseInt(id));
            if (charObj) openInfoPopup(charObj); 
        }
    }
}

function closeInfoPopup() {
    document.getElementById("info-popup").classList.remove("active");
    removePhysicalDragEvents();
}

// Troca entre as abas de Habilidades e Biografia no popup
function switchTab(t) {
    document.getElementById("content-skills").style.display = t === 'skills' ? "block" : "none";
    document.getElementById("content-bio").style.display = t === 'bio' ? "block" : "none";
    document.getElementById("tab-skills").classList.toggle("active", t === 'skills');
    document.getElementById("tab-bio").classList.toggle("active", t === 'bio');
}

// Gera a lista visual de habilidades (ícone + trigger + descrição)
function renderSkillsList(skills) {
    const l = document.getElementById("skills-list");

    // Se não houver skills, cria uma div com a classe 'no-skills-message'
    l.innerHTML = skills.length ? "" : "<div class='no-skills-message'>SEM HABILIDADES.</div>";

    skills.forEach(s => {
        const i = document.createElement("div");
        i.className = "skill-item";
        i.innerHTML = `
            <div class="skill-icon-circle">
                <img src="pictures/skills/${s.skill}.webp">
            </div>
            <div class="skill-text">
                <strong>${s.trigger.toUpperCase()}</strong> 
                <span>${s.description}</span>
            </div>`;
        l.appendChild(i);
    });
}

// --- FÍSICA DO GIRO 3D (Implementação dos cálculos) ---
function updateCardTransform(r) {
    const el = document.getElementById("info-card-render");
    if (el) el.style.transform = `rotateY(${r}deg)`;
}

function onDragStart(e) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    isDragging = true;
    const x = e.touches ? e.touches[0].pageX : e.pageX;
    startX = x; lastX = x; lastTime = Date.now(); velocityX = 0;
}

function onDragMove(e) {
    if (!isDragging) return;
    const x = e.touches ? e.touches[0].pageX : e.pageX;
    const dx = x - startX;
    const dt = Date.now() - lastTime;
    if (dt > 0) velocityX = (x - lastX) / dt;
    updateCardTransform(currentRotationY + (dx * 0.5));
    lastX = x; lastTime = Date.now();
}

function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (Math.abs(velocityX) > 1) {
        velocityX *= 8; requestAnimationFrame(inertiaAnimation);
    } else {
        springBackAnimation(Math.round(currentRotationY / 180) * 180);
    }
}

function inertiaAnimation() {
    if (isDragging) return;
    currentRotationY += velocityX;
    velocityX *= 0.95;
    updateCardTransform(currentRotationY);
    if (Math.abs(velocityX) > 0.1) animationFrameId = requestAnimationFrame(inertiaAnimation);
    else springBackAnimation(Math.round(currentRotationY / 180) * 180);
}

function springBackAnimation(t) {
    if (isDragging) return;
    currentRotationY += (t - currentRotationY) * 0.15;
    updateCardTransform(currentRotationY);
    if (Math.abs(t - currentRotationY) > 0.1) animationFrameId = requestAnimationFrame(() => springBackAnimation(t));
    else currentRotationY = t;
}

// Ativa/Desativa os eventos de toque e mouse para o giro
function setupPhysicalDragEvents() { const c = document.querySelector('.flip-card-container'); c.addEventListener('mousedown', onDragStart); c.addEventListener('touchstart', onDragStart); window.addEventListener('mousemove', onDragMove); window.addEventListener('touchmove', onDragMove, { passive: false }); window.addEventListener('mouseup', onDragEnd); window.addEventListener('touchend', onDragEnd); }
function removePhysicalDragEvents() { const c = document.querySelector('.flip-card-container'); c.removeEventListener('mousedown', onDragStart); c.removeEventListener('touchstart', onDragStart); window.removeEventListener('mousemove', onDragMove); window.removeEventListener('touchmove', onDragMove); window.removeEventListener('mouseup', onDragEnd); window.removeEventListener('touchend', onDragEnd); }

// Mostra o pequeno menu de ações (Balão) ao clicar em uma carta na grade
function showCardActions(char, slot) {

    // 1. REMOVE QUALQUER BALÃO QUE JÁ ESTEJA ABERTO
    document.querySelectorAll('.card-action-popup').forEach(el => el.remove());
    hideDropdown(); // Continua fechando os filtros se houver algum aberto

    const dck = JSON.parse(localStorage.getItem("user_deck")) || [];
    const isIn = dck.find(c => parseInt(c.ID) === parseInt(char.ID));

    const m = document.createElement('div');
    m.id = 'card-actions-balloon'; // LINHA NOVA (Resolve o erro)
    m.className = 'card-action-popup';

    const b1 = document.createElement('button'); b1.className = 'btn-popup-action info'; b1.innerText = "Informacoes"; b1.onclick = () => { openInfoPopup(char); hideDropdown(); };
    const b2 = document.createElement('button'); b2.className = `btn-popup-action ${isIn ? 'remove' : 'add'}`; b2.innerText = isIn ? "REMOVER" : "ADICIONAR";
    b2.onclick = () => {
        if (b2.innerText === "ADICIONAR") {
            equipToDeck(char);
            b2.innerText = "REMOVER";
            b2.className = "btn-popup-action remove";
            // A mágica: Reatribui a função para a próxima vez que clicar
            b2.onclick = () => { removeFromDeckById(char.ID); showCardActions(char, slot); };
        } else {
            removeFromDeckById(char.ID);
            b2.innerText = "ADICIONAR";
            b2.className = "btn-popup-action add";
            b2.onclick = () => { equipToDeck(char); showCardActions(char, slot); };
        }
        renderCollection(); // Atualiza as bordas/cartas no fundo
    };

    m.appendChild(b1); m.appendChild(b2);
    document.querySelector('.colecao-scroll-container').appendChild(m);

    m.style.top = `${slot.offsetTop + slot.offsetHeight + 5}px`;
    m.style.left = `${slot.offsetLeft + (slot.offsetWidth / 2)}px`;
    m.style.transform = "translateX(-50%)";
}

// Remove do deck salvo
function removeFromDeckById(id) {
    let d = JSON.parse(localStorage.getItem("user_deck")) || [];
    const i = d.findIndex(c => parseInt(c.ID) === parseInt(id));
    if (i !== -1) { d.splice(i, 1); localStorage.setItem("user_deck", JSON.stringify(d)); updateDeckUI(); }
}

// Adiciona ao deck salvo (máx 12)
function equipToDeck(c) {
    let d = JSON.parse(localStorage.getItem("user_deck")) || [];
    if (d.length < 12) { d.push(c); localStorage.setItem("user_deck", JSON.stringify(d)); updateDeckUI(); }
}

// Atualiza os slots visuais do deck (grade superior)
function updateDeckUI() {
    const dck = JSON.parse(localStorage.getItem("user_deck")) || [];
    // Pega a lista de cartas do usuário UMA VEZ fora do loop para performance
    const userCards = JSON.parse(localStorage.getItem("user_cards")) || [];
    const slots = document.querySelectorAll('.deck-grid .card-slot');

    slots.forEach((slot, i) => {
        if (dck[i]) {
            const char = dck[i];
            // Busca o nível da carta na lista do usuário
            const cardData = userCards.find(c => c.id === parseInt(char.ID)) || { level: 1 };
            const lvl = cardData.level; 
            const id = char.ID.toString().padStart(5, '0');
            
            // CÁLCULO DOS STATUS REAIS BASEADO NO NÍVEL
            const realATK = getCalculatedStat(char.atk, lvl);
            const realHP = getCalculatedStat(char.hp, lvl);

            slot.innerHTML = `
                <div class="card-image-area">
                    <img src="pictures/characters/${id}.webp" class="char-img">
                    <img src="pictures/rarity/${char.raridade_completa}.webp" class="layer-rarity">
                    <img src="pictures/position/${char.position === 'Recuado' ? '1.webp' : '2.webp'}" class="layer-position">
                    <img src="pictures/classes/${char.classe}.webp" class="layer-class">
                    <img src="pictures/template/Frente.webp" class="layer-template-front">
                    
                    <div class="card-text-element layer-atk">${realATK}</div>
                    <div class="card-text-element layer-hp">${realHP}</div>
                    <div class="card-text-element layer-name">${char.nome}</div>
                    <div class="card-text-element layer-cost">${char.custo}</div>
                </div>`;
            
            slot.className = `card-slot`; 
            slot.onclick = (e) => { 
                e.stopPropagation(); 
                showCardActions(char, slot); 
            };
        } else { 
            slot.innerHTML = `<span>+</span>`; 
            slot.className = `card-slot empty`; 
            slot.onclick = null; 
        }
    });
}

// Atualiza moedas, senzus, nível e XP do topo
function updateCollectionTopBar() {
    const itm = JSON.parse(localStorage.getItem("user_itens")) || { coins: 0, senzus: 0 };
    const xp = JSON.parse(localStorage.getItem("user_xp")) || { level: 1, xp: 0, xp_necessary: 100 };
    if (document.getElementById("user-coins")) document.getElementById("user-coins").innerText = itm.coins.toLocaleString('pt-BR');
    if (document.getElementById("user-senzus")) document.getElementById("user-senzus").innerText = itm.senzus.toLocaleString('pt-BR');
    if (document.getElementById("user-level")) document.getElementById("user-level").innerText = xp.level.toString().padStart(2, '0');
    if (document.getElementById("exp-text")) document.getElementById("exp-text").innerText = `${xp.xp}/${xp.xp_necessary}`;
    const f = document.getElementById("exp-fill"); if (f) f.style.width = `${Math.min((xp.xp / xp.xp_necessary) * 100, 100)}%`;
    updateDeckUI();
}

window.onclick = function(event) {
    // Se o clique NÃO for em um botão de filtro e NÃO for no menu aberto
    if (!event.target.matches('.btn-scouter-filter') && !event.target.closest('#filter-dropdown')) {
        hideDropdown();
        // Remove também os balões de ação das cartas
        document.querySelectorAll('.card-action-popup').forEach(el => el.remove());
    }
}

// Fecha menus ao clicar fora
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('filter-dropdown');
    const balloon = document.querySelector('.card-action-popup');

    // Se houver balão de ação e o clique não for nele nem na carta
    if (balloon && !balloon.contains(e.target) && !e.target.closest('.carta-grade')) {
        balloon.remove();
    }
    
    // Se houver dropdown de filtro e o clique não for nele nem nos botões
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.btn-scouter-filter')) {
        hideDropdown();
    }
}, true); // O 'true' garante que ele capture o clique antes de outros eventos

// Fecha menus ao rolar a página
window.addEventListener('scroll', () => {
    hideDropdown();
    document.querySelectorAll('.card-action-popup').forEach(el => el.remove());
}, { passive: true });
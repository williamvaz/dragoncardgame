/* --- JS/arenas.js --- */
document.addEventListener("DOMContentLoaded", async () => {
    const listContainer = document.getElementById("arenas-list-container");
    const playerStats = JSON.parse(localStorage.getItem("user_trophies")) || { trophies: 0, arena: 1 };

    try {
        // 1. CARREGAMENTO DUPLO: Arenas e Personagens
        const [arenasRes, charsRes] = await Promise.all([
            fetch('JSONs/arenas.json'),
            fetch('JSONs/characters.json')
        ]);
        
        const arenas = await arenasRes.json();
        const allCharacters = await charsRes.json();

        // Ordena arenas da maior para a menor
        arenas.sort((a, b) => b.Arena - a.Arena);

        arenas.forEach(arena => {
            const isCurrent = arena.Arena === playerStats.arena;
            const isLocked = playerStats.trophies < arena["Trofeus minimos"];

            const card = document.createElement("div");
            card.className = `arena-card ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`;
            if (isCurrent) card.id = "current-arena-card";

            // Lógica das bolinhas de limite (Z, A, B)
            let dotsHTML = '';
            const raridadesDots = [
                { key: "Limite Z", class: "dot-z", nome: "Z" },
                { key: "Limite A", class: "dot-a", nome: "A" },
                { key: "Limite B", class: "dot-b", nome: "B" }
            ];
            raridadesDots.forEach(raro => {
                if (arena[raro.key] !== "-") {
                    dotsHTML += `<div class="dot ${raro.class}" onclick="openInfoModal('${arena[raro.key]}', '${raro.nome}')"></div>`.repeat(parseInt(arena[raro.key]));
                }
            });

            // --- 2. FILTRAGEM E ORDENAÇÃO REAL POR RARIDADE ---
            let tempCards = [];
            const rarityOrder = ["F", "E", "D", "C", "B", "A", "Z"]; // Ordem solicitada (Menor para Maior)

            for (let i = 1; i <= 10; i++) {
                let cardID = arena[`Desbloqueavel ${i}`];
                if (cardID && cardID !== "-") {
                    // Busca a raridade real no arquivo characters.json usando o ID
                    const charData = allCharacters.find(c => parseInt(c.ID) === parseInt(cardID));
                    const realRarity = charData ? charData.raridade_completa : "F";

                    tempCards.push({ id: cardID, rarity: realRarity });
                }
            }

            // Ordena a lista baseada no peso do array rarityOrder
            tempCards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));

            // 3. GERAÇÃO DO HTML DAS CARTAS
            let unlocksHTML = '';
            tempCards.forEach(card => {
                const formattedID = card.id.toString().padStart(5, '0');
                unlocksHTML += `
                    <div class="unlock-slot rarity-${card.rarity}">
                        <img src="pictures/characters/${formattedID}.webp" loading="lazy">
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="arena-radar-clean">
                    <img src="pictures/arenas/${arena.Arena}.webp">
                    ${isLocked ? '<div class="lock-icon">🔒</div>' : ''}
                </div>
                <h2 class="arena-title">${arena.Nome}</h2>
                <div class="arena-banner-new">
                    <span class="arena-tag">ARENA ${arena.Arena}</span>
                    <div class="trophy-info"><img src="assets/elements/trophy.webp"><span>${arena["Trofeus minimos"]}</span></div>
                </div>
                <div class="dots-container">${dotsHTML}</div>
                <p class="arena-desc">${arena.Descrição}</p>
                <div class="unlocks-section">
                    <h3 class="unlocks-title">CARTAS DESBLOQUEAVEIS</h3>
                    <div class="unlocks-grid">${unlocksHTML}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });

        // Auto-scroll para a arena atual
        const currentCard = document.getElementById("current-arena-card");
        if (currentCard) {
            setTimeout(() => {
                currentCard.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 100);
        }

    } catch (e) { console.error("Erro ao carregar dados das arenas/personagens:", e); }
});

window.openInfoModal = (quantidade, raridade) => {
    const modal = document.getElementById("info-modal");
    const text = document.getElementById("modal-text");
    if (modal && text) {
        text.innerText = `LIMITE DA ARENA: MAXIMO DE ${quantidade} CARTA(S) DE RARIDADE ${raridade}`;
        modal.style.display = "flex";
    }
};

window.closeInfoModal = () => {
    const modal = document.getElementById("info-modal");
    if (modal) modal.style.display = "none";
};
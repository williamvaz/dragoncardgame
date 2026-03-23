/* --- JS/rewards.js REFORMULADO --- */

window.processResgate = function(id_capsule) {
    const capsulaValida = ["01", "02", "03", "04"].includes(id_capsule);

    if (capsulaValida) {
        fetch('JSONs/capsules_data.json')
            .then(response => response.json())
            .then(data => {
                const capsuleData = data[id_capsule];

                if (capsuleData) {
                    // Sorteio de Zenis
                    const zenisSorted = Math.floor(Math.random() * (capsuleData.zenis.max - capsuleData.zenis.min + 1)) + capsuleData.zenis.min;
                    // Sorteio de Senzus
                    const senzusSorted = Math.floor(Math.random() * (capsuleData.senzus.max - capsuleData.senzus.min + 1)) + capsuleData.senzus.min;

                    const rewardsQueue = [];

                    // Adiciona Zeni na fila se ganhou
                    if (zenisSorted > 0) {
                        rewardsQueue.push({ type: 'zeni', value: zenisSorted, icon: 'imgs/home/icon-zeni.png' });
                    }
                    // Adiciona Senzu na fila se ganhou
                    if (senzusSorted > 0) {
                        rewardsQueue.push({ type: 'senzu', value: senzusSorted, icon: 'imgs/home/icon-senzu.png' });
                    }

                    // Se não ganhou nada (o que não deve acontecer com esses dados, mas por segurança)
                    if (rewardsQueue.length === 0) {
                        alert("Cápsula Vazia! Que azar...");
                        return;
                    }

                    // Inicia a sequência de animação
                    startScatterSequence(capsuleData.name, rewardsQueue);
                    
                } else {
                    console.error('Dados da cápsula não encontrados para o ID:', id_capsule);
                }
            })
            .catch(error => console.error('Erro ao carregar o JSON das cápsulas:', error));
    } else {
        alert("ID de cápsula inválido!");
    }
}

// Controla o estado da abertura (shake -> explode)
let currentRewardState = 'idle'; 
let rewardsItemsList = []; // Armazena os elementos HTML dos itens criados

function startScatterSequence(title, rewards) {
    const overlay = document.createElement('div');
    overlay.className = 'reward-overlay';
    overlay.innerHTML = `
        <h1 id="reward-title">${title}</h1>
        <div class="capsule-container">
            <img id="reward-capsule" src="imgs/rewards/capsule.webp" alt="Capsula">
            <div class="rewards-items-container" id="items-container"></div> </div>
    `;

    document.body.appendChild(overlay);

    const capsuleImg = document.getElementById('reward-capsule');
    const itemsContainer = document.getElementById('items-container');
    rewardsItemsList = []; // Reseta a lista

    currentRewardState = 'idle';

    // 1. Cria todos os elementos HTML dos itens, mas deixa invisíveis no centro
    rewards.forEach((reward, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'reward-item';
        
        // Estilo específico se for ícone redondo (moeda/semente)
        const isIcon = ['zeni', 'senzu'].includes(reward.type);
        
        itemDiv.innerHTML = `
            <img src="${reward.icon}" class="${isIcon ? 'reward-icon' : ''}" alt="${reward.type}">
            <div style="color:white; font-size:3dvw; margin-top:1dvh;">+${reward.value}</div>
        `;

        // --- CÁLCULO DE TRAJETÓRIA ALEATÓRIA (O SEGREDO DO EFEITO) ---
        // Define para onde o item vai voar (X e Y) e quanto vai girar
        // Usamos dvw/dvh para manter a responsividade
        const flyX = (Math.random() - 0.5) * 60; // Voa entre -30dvw e +30dvw horizontalmente
        const flyY = (Math.random() - 0.5) * 50 - 10; // Voa entre -35dvh e +15dvh verticalmente (mais para cima)
        const flyRotate = (Math.random() - 0.5) * 720; // Gira entre -360 e +360 graus

        // Define essas variáveis CSS diretamente no elemento
        itemDiv.style.setProperty('--fly-x', `${flyX}dvw`);
        itemDiv.style.setProperty('--fly-y', `${flyY}dvh`);
        itemDiv.style.setProperty('--fly-rotate', `${flyRotate}deg`);
        // Adiciona um pequeno atraso aleatório para não saírem exatamente juntos
        itemDiv.style.animationDelay = `${Math.random() * 0.2}s`; 

        itemsContainer.appendChild(itemDiv);
        rewardsItemsList.push(itemDiv); // Guarda para ativar depois
    });


    // Controla os cliques no overlay
    overlay.addEventListener('click', () => {
        handleRewardClick(capsuleImg, overlay, rewards);
    });
}

function handleRewardClick(capsuleImg, overlay, rewards) {
    if (currentRewardState === 'idle') {
        // Primeiro Clique: Começa a tremer
        capsuleImg.classList.add('shake');
        currentRewardState = 'shaking';
    } else if (currentRewardState === 'shaking') {
        // Segundo Clique: Explode e lança os itens
        capsuleImg.classList.remove('shake');
        capsuleImg.classList.add('explode');
        currentRewardState = 'exploded';

        // Ativa a animação de voo em todos os itens criados anteriormente
        rewardsItemsList.forEach(item => {
            item.classList.add('fly');
        });

        // Espera a animação de explosão e voo acabar para salvar e permitir fechar
        setTimeout(() => {
            showFinalSummary(overlay, rewards);
        }, 1200); // 1.2s é tempo suficiente para as animações
    } else if (currentRewardState === 'exploded') {
        // Clique após a animação: Fecha tudo
        finalizeRewards(overlay);
    }
}

// Mostra o resumo final e salva os dados (mantendo sua lógica original)
function showFinalSummary(overlay, rewards) {
    let totalZeni = 0;
    let totalSenzu = 0;

    rewards.forEach(r => {
        if (r.type === 'zeni') totalZeni += r.value;
        if (r.type === 'senzu') totalSenzu += r.value;
    });

    // Chama sua função global para salvar no localStorage
    if (window.addCurrency) {
        if (totalZeni > 0) window.addCurrency('zeni', totalZeni);
        if (totalSenzu > 0) window.addCurrency('senzu', totalSenzu);
    }

    const titleH1 = document.getElementById('reward-title');
    titleH1.innerText = "RECOMPENSAS RESGATADAS";
    titleH1.style.animation = "none"; // Para de pulsar

    // Remove a cápsula explodida e os itens soltos para limpar a tela
    document.getElementById('reward-capsule').remove();
    document.getElementById('items-container').remove();

    // Cria um container simples para o resumo (estilo antigo)
    const summaryDiv = document.createElement('div');
    summaryDiv.style.display = 'flex';
    summaryDiv.style.flexDirection = 'column';
    summaryDiv.style.alignItems = 'center';
    summaryDiv.style.gap = '2dvh';
    summaryDiv.innerHTML = `
        <div style="font-size: 4dvw; color:white;">RESUMO:</div>
        <div style="display:flex; gap: 5dvw; align-items:center;">
            ${totalZeni > 0 ? `<div style="display:flex; align-items:center; gap:1dvw; color:white; font-size:3.5dvw;"><img src="imgs/home/icon-zeni.png" class="reward-icon" style="width:7dvw; height:7dvw;"> +${totalZeni}</div>` : ''}
            ${totalSenzu > 0 ? `<div style="display:flex; align-items:center; gap:1dvw; color:white; font-size:3.5dvw;"><img src="imgs/home/icon-senzu.png" class="reward-icon" style="width:7dvw; height:7dvw;"> +${totalSenzu}</div>` : ''}
        </div>
        <div style="color:rgba(255,255,255,0.7); font-size:2.5dvw; margin-top:5dvh;">(Toque para fechar)</div>
    `;

    overlay.querySelector('.capsule-container').appendChild(summaryDiv);
    currentRewardState = 'exploded'; // Mantém o estado para o próximo clique fechar
}

function finalizeRewards(overlay) {
    // Remove o overlay e volta para a Home
    overlay.remove();
}
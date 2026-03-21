/* --- JS/capsules.js COMPLETO --- */
let capsulesData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadCapsulesData();
    initFreeCapsuleTimer();
    initBattleCapsules();
    setupModalEvents();
});

async function loadCapsulesData() {
    try {
        const response = await fetch('JSONs/capsules_data.json');
        capsulesData = await response.json();
    } catch (error) {
        console.error("Erro ao carregar dados das cápsulas:", error);
    }
}

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
    if (num >= 10000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
    return (num ?? 0).toString();
};

const getCapsuleInfo = (id) => capsulesData.find(c => c.id === parseInt(id));

const formatDuration = (ms) => {
    if (ms <= 0) return "00M 00S";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return h > 0 ? `${h}H ${m.toString().padStart(2, '0')}M` : `${m}M ${s.toString().padStart(2, '0')}S`;
};

const getRarityName = (sigla) => {
    const nomes = { "F": "F", "E": "E", "D": "D", "C": "C", "B": "B", "A": "A", "Z": "Z" };
    return nomes[sigla] || sigla;
};

const openCapsuleModal = (slotNum) => {
    const slots = JSON.parse(localStorage.getItem("user_capsules"));
    const slotData = slots[`slot_${slotNum}`];
    if (!slotData) return;

    const info = getCapsuleInfo(slotData.id);
    if (!info) return;

    const modal = document.getElementById("capsule-modal");
    modal.style.display = "flex";

    document.getElementById("modal-capsule-name").innerText = info.nome;
    document.getElementById("modal-capsule-img").src = `pictures/capsules/${info.id}.webp`;
    document.getElementById("modal-zenis-val").innerText = `${formatNumber(info.coins[0])} - ${formatNumber(info.coins[1])}`;

    const garantiaEl = document.getElementById("modal-cards-val");
    if (info.garantias && Object.keys(info.garantias).length > 0) {
        const ordem = ["Z", "A", "B", "C", "D", "E", "F"];
        const raridadesPresentes = Object.keys(info.garantias);
        const maiorRaridade = ordem.find(r => raridadesPresentes.includes(r));
        const qtdGarantida = info.garantias[maiorRaridade];
        garantiaEl.innerText = `${qtdGarantida} RARIDADE ${getRarityName(maiorRaridade)}`;
    } else {
        garantiaEl.innerText = "NENHUMA";
    }

    const msg = document.getElementById("modal-msg");
    const btnConfirm = document.getElementById("btn-modal-confirm");
    const btnLabelText = document.getElementById("btn-label-text");
    const btnCostContainer = document.getElementById("btn-cost-container");

    const itens = JSON.parse(localStorage.getItem("user_itens")) || { senzus: 0 };

    if (slotData.status === "LOCKED") {
        const isAnyUnlocking = Object.values(slots).some(s => s && s.status === "UNLOCKING");
        const tempoMS = info.tempo_horas * 3600000;
        msg.innerText = formatDuration(tempoMS);

        if (isAnyUnlocking) {
            const cost = Math.ceil(tempoMS / (10 * 60 * 1000));
            btnLabelText.innerText = "ABRIR AGORA";
            if (btnCostContainer) btnCostContainer.style.display = "flex";
            if (document.getElementById("btn-cost-value")) document.getElementById("btn-cost-value").innerText = cost;
            btnConfirm.onclick = () => {
                if (itens.senzus >= cost) confirmFastUnlock(slotNum, cost);
                else if (typeof showToast === "function") showToast("SENZUS INSUFICIENTES!");
            };
        } else {
            btnLabelText.innerText = "INICIAR";
            if (btnCostContainer) btnCostContainer.style.display = "none";
            btnConfirm.onclick = () => startUnlocking(slotNum, info.tempo_horas);
        }
    } else if (slotData.status === "UNLOCKING") {
        const remaining = slotData.duration - (Date.now() - slotData.start);
        const cost = Math.ceil(remaining / (10 * 60 * 1000));
        msg.innerText = formatDuration(remaining);
        btnLabelText.innerText = "ABRIR AGORA";
        if (btnCostContainer) btnCostContainer.style.display = "flex";
        if (document.getElementById("btn-cost-value")) document.getElementById("btn-cost-value").innerText = cost;
        btnConfirm.onclick = () => {
            if (itens.senzus >= cost) confirmFastUnlock(slotNum, cost);
            else if (typeof showToast === "function") showToast("SENZUS INSUFICIENTES!");
        };
    } else if (slotData.status === "READY") {
        msg.innerText = "CONCLUÍDO";
        btnLabelText.innerText = "RESGATAR";
        if (btnCostContainer) btnCostContainer.style.display = "none";
        btnConfirm.onclick = () => collectCapsule(slotNum);
    }
};

const setupModalEvents = () => {
    const modal = document.getElementById("capsule-modal");
    modal.onclick = (e) => { if (e.target.id === "capsule-modal") closeCapsuleModal(); };
};

const closeCapsuleModal = () => { document.getElementById("capsule-modal").style.display = "none"; };

const startUnlocking = (slotNum, horas) => {
    const slots = JSON.parse(localStorage.getItem("user_capsules"));
    slots[`slot_${slotNum}`].status = "UNLOCKING";
    slots[`slot_${slotNum}`].duration = horas * 3600000;
    slots[`slot_${slotNum}`].start = Date.now();
    localStorage.setItem("user_capsules", JSON.stringify(slots));
    closeCapsuleModal();
};

const confirmFastUnlock = (slotNum, cost) => {
    const modal = document.getElementById("confirm-modal");
    document.getElementById("confirm-text").innerText = `Deseja gastar ${cost} Senzus para abrir instantaneamente?`;
    modal.style.display = "flex";
    document.getElementById("confirm-yes").onclick = () => {
        modal.style.display = "none";
        fastUnlock(slotNum, cost);
    };
    document.getElementById("confirm-cancel").onclick = () => { modal.style.display = "none"; };
};

const fastUnlock = (slotNum, cost) => {
    const itens = JSON.parse(localStorage.getItem("user_itens")) || { coins: 0, senzus: 0 };
    if (itens.senzus >= cost) {
        itens.senzus -= cost;
        localStorage.setItem("user_itens", JSON.stringify(itens));
        const slots = JSON.parse(localStorage.getItem("user_capsules"));
        slots[`slot_${slotNum}`].status = "READY";
        localStorage.setItem("user_capsules", JSON.stringify(slots));
        window.dispatchEvent(new Event('storage'));
        closeCapsuleModal();
    }
};

const collectCapsule = async (slotNum) => {
    const slots = JSON.parse(localStorage.getItem("user_capsules"));
    const slotData = slots[`slot_${slotNum}`];
    if (slotData && typeof processResgate === "function") {
        processResgate(slotData.id); 
    }
    slots[`slot_${slotNum}`] = null;
    localStorage.setItem("user_capsules", JSON.stringify(slots));
    closeCapsuleModal();
};

const initBattleCapsules = () => {
    if (!localStorage.getItem("user_capsules")) {
        localStorage.setItem("user_capsules", JSON.stringify({ slot_1: null, slot_2: null, slot_3: null, slot_4: null }));
    }
    document.querySelectorAll(".capsule-slot").forEach((slot, index) => {
        slot.onclick = () => openCapsuleModal(index + 1);
    });
    setInterval(tickBattleCapsules, 1000);
};

const tickBattleCapsules = () => {
    const slots = JSON.parse(localStorage.getItem("user_capsules"));
    if (!slots) return;
    const slotElements = document.querySelectorAll(".capsule-slot");

    Object.keys(slots).forEach((key, index) => {
        const data = slots[key];
        const el = slotElements[index];
        if (!el) return;

        if (!data) {
            el.classList.add("empty");
            el.classList.remove("ready-to-open");
            el.innerHTML = '<div class="empty-icon">+</div>';
            return;
        }

        const info = getCapsuleInfo(data.id);
        if (!info) return;

        if (el.classList.contains("empty") || !el.querySelector(".timer")) {
            el.classList.remove("empty");
            el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center"><span class="status"></span><h2 class="timer"></h2></div><img><span class="capsule-name"></span>`;
        }

        const timerEl = el.querySelector(".timer");
        const statusEl = el.querySelector(".status");
        const nameEl = el.querySelector(".capsule-name");
        const imgEl = el.querySelector("img");

        if (!timerEl || !statusEl || !nameEl || !imgEl) return;

        nameEl.innerText = info.nome;
        imgEl.src = `pictures/capsules/${info.id}.webp`;

        if (data.status === "UNLOCKING") {
            const rem = data.duration - (Date.now() - data.start);
            if (rem <= 0) {
                data.status = "READY";
                localStorage.setItem("user_capsules", JSON.stringify(slots));
            } else {
                timerEl.innerText = formatDuration(rem);
                statusEl.innerText = "ABRINDO";
            }
        } else if (data.status === "READY") {
            statusEl.innerText = "PRONTO";
            timerEl.innerText = "ABRIR";
            el.classList.add("ready-to-open");
        } else {
            statusEl.innerText = "TRANCADO";
            timerEl.innerText = formatDuration(info.tempo_horas * 3600000);
        }
    });
};

function initFreeCapsuleTimer() {
    const timerEl = document.getElementById("free-reward-timer");
    const container = document.getElementById("btn-free-capsule");
    if (!timerEl || !container) return;

    setInterval(() => {
        const next = parseInt(localStorage.getItem("next_free_capsule")) || 0;
        const left = next - Date.now();
        if (left <= 0) {
            timerEl.innerText = "RESGATAR";
            container.classList.add("ready");
        } else {
            timerEl.innerText = formatDuration(left);
            container.classList.remove("ready");
        }
    }, 1000);

    container.onclick = () => {
        if (container.classList.contains("ready") && typeof processResgate === "function") {
            processResgate(1);
        }
    };
}

const showToast = (message) => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};
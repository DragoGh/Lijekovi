// Drago's Lijekovi Tracker - Core JavaScript Logic

const MAX_LIJEKOVA = 10;
const STORAGE_KEY = 'lijekovi_baza_v1';
const INITIALIZED_KEY = 'lijekovi_initialized_v1';

// Initial default state if first time open
const DEFAULT_LIJEKOVI = [
    {
        id: 1,
        naziv: 'Lekadol 500mg',
        datumPocetka: getTodayIsoString(),
        datumSljedecegIzdavanja: addDaysToDate(getTodayIsoString(), 30),
        brojTableta: 30,
        trajanjeDana: 30,
        maxPodizanja: 3,
        trenutnoPodizanje: 1,
        log: 'Uzimati po 1 tabletu u slučaju bolova ili povišene temperature.'
    },
    {
        id: 2,
        naziv: 'Pramin 10mg',
        datumPocetka: getIsoStringMinusDays(25),
        datumSljedecegIzdavanja: addDaysToDate(getIsoStringMinusDays(25), 30),
        brojTableta: 30,
        trajanjeDana: 30,
        maxPodizanja: 2,
        trenutnoPodizanje: 2,
        log: 'Uzimati prije obroka prema uputi liječnika.'
    }
];

let lijekovi = [];
let deferredInstallPrompt = null;

// Helper Date Functions
function getTodayIsoString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getIsoStringMinusDays(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateHr(isoString) {
    if (!isoString) return '--.--.----.';
    const parts = isoString.split('-');
    if (parts.length !== 3) return isoString;
    return `${parts[2]}.${parts[1]}.${parts[0]}.`;
}

function addDaysToDate(isoString, days) {
    if (!isoString) return getTodayIsoString();
    const parts = isoString.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    date.setDate(date.getDate() + parseInt(days));
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDaysRemaining(targetIso) {
    if (!targetIso) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = targetIso.split('-');
    const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Storage Operations (Robust persistence across reload/export/server sync)
async function loadLijekovi() {
    // 1. Try local server API first
    try {
        const response = await fetch('/api/lijekovi', { cache: 'no-store' });
        if (response.ok) {
            const serverData = await response.json();
            if (Array.isArray(serverData) && serverData.length > 0) {
                lijekovi = sanitizeData(serverData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lijekovi));
                localStorage.setItem(INITIALIZED_KEY, 'true');
                renderApp();
                return;
            }
        }
    } catch (e) {
        console.log('Poslužiteljski API nije dostupan ili je prazan, koristi se lokalni spremnik.');
    }

    // 2. Try LocalStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    const isInit = localStorage.getItem(INITIALIZED_KEY);

    if (stored !== null) {
        try {
            lijekovi = sanitizeData(JSON.parse(stored));
        } catch (e) {
            console.error('Greška pri čitanju spremljenih podataka:', e);
            lijekovi = [...DEFAULT_LIJEKOVI];
        }
    } else if (!isInit) {
        // First time opening app
        lijekovi = [...DEFAULT_LIJEKOVI];
        localStorage.setItem(INITIALIZED_KEY, 'true');
        saveLijekovi();
        return;
    } else {
        // User initialized before and explicitly removed all items
        lijekovi = [];
    }

    renderApp();
}

function sanitizeData(dataList) {
    return dataList.map(med => ({
        id: med.id,
        naziv: med.naziv || 'Nepoznati lijek',
        datumPocetka: med.datumPocetka || getTodayIsoString(),
        datumSljedecegIzdavanja: med.datumSljedecegIzdavanja || addDaysToDate(med.datumPocetka || getTodayIsoString(), med.trajanjeDana || 30),
        brojTableta: med.brojTableta || 30,
        trajanjeDana: med.trajanjeDana || 30,
        maxPodizanja: med.maxPodizanja || 3,
        trenutnoPodizanje: med.trenutnoPodizanje || 1,
        log: med.log || ''
    }));
}

function saveLijekovi() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lijekovi));
    localStorage.setItem(INITIALIZED_KEY, 'true');

    // Sync to local server file asynchronously
    fetch('/api/lijekovi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lijekovi)
    }).catch(err => console.log('Automatska pohrana na server nije aktivna.'));

    renderApp();
}

// Notifications Helper
function checkAndRequestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function triggerBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'icon-192.png' });
    }
}

// UI Rendering Logic
function renderApp() {
    renderHeaderStats();
    renderMedsList();
}

function renderHeaderStats() {
    const todayFormatted = formatDateHr(getTodayIsoString());
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.textContent = todayFormatted;

    const countEl = document.getElementById('medsCount');
    if (countEl) countEl.textContent = `${lijekovi.length} / ${MAX_LIJEKOVA}`;

    let urgentWarnings = 0;
    let expiredCount = 0;
    let refillSoonCount = 0;

    lijekovi.forEach(m => {
        const expDate = addDaysToDate(m.datumPocetka, m.trajanjeDana);
        const daysStockLeft = getDaysRemaining(expDate);
        const daysNextRefillLeft = getDaysRemaining(m.datumSljedecegIzdavanja);

        if (daysStockLeft < 0) {
            expiredCount++;
        } else if (daysStockLeft <= 7) {
            urgentWarnings++;
        }

        if (daysNextRefillLeft <= 3 && m.trenutnoPodizanje < m.maxPodizanja) {
            refillSoonCount++;
        }
    });

    const statusCard = document.getElementById('statusCard');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    if (expiredCount > 0 || urgentWarnings > 0 || refillSoonCount > 0) {
        statusCard.className = 'dash-card span-full';
        
        if (expiredCount > 0) {
            statusIcon.className = 'status-indicator icon-danger';
            statusText.innerHTML = `<span style="color: var(--danger)">[ UPOZORENJE ] ${expiredCount} lijek/a istekao! Napravite obnovu zaliha.</span>`;
        } else if (refillSoonCount > 0) {
            statusIcon.className = 'status-indicator icon-warning';
            statusText.innerHTML = `<span style="color: var(--warning)">[ NOTIFIKACIJA ] ${refillSoonCount} lijek/a stiže za izdavanje u sljedeća 3 dana!</span>`;
        } else {
            statusIcon.className = 'status-indicator icon-warning';
            statusText.innerHTML = `<span style="color: var(--warning)">[ UPOZORENJE ] ${urgentWarnings} lijek/a treba naručiti u sljedećih 7 dana!</span>`;
        }
    } else {
        statusCard.className = 'dash-card span-full';
        statusIcon.className = 'status-indicator icon-ok';
        statusText.textContent = 'Sve zalihe lijekova i ponovljivi recepti su stabilni.';
    }
}

function renderMedsList() {
    const container = document.getElementById('medsList');
    if (!container) return;
    container.innerHTML = '';

    if (lijekovi.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                </svg>
                <h3>Nema registriranih lijekova</h3>
                <p>Kliknite na dugme "Dodaj novi lijek" kako biste započeli praćenje zaliha.</p>
            </div>
        `;
        return;
    }

    lijekovi.forEach((med) => {
        const expDateIso = addDaysToDate(med.datumPocetka, med.trajanjeDana);
        const daysLeft = getDaysRemaining(expDateIso);
        const daysNextRefill = getDaysRemaining(med.datumSljedecegIzdavanja);
        
        let cardClass = 'med-card';
        let badgeClass = 'badge-ok';
        let badgeText = 'U redu';
        let progressFillClass = 'fill-ok';
        let statusNotice = '';

        if (daysLeft < 0) {
            cardClass += ' danger-card';
            badgeClass = 'badge-danger';
            badgeText = 'ISTEKLO!';
            progressFillClass = 'fill-danger';
            statusNotice = '<div style="color: var(--danger); font-weight: bold; font-size: 0.8rem; margin-top: 4px;">⚠️ Zalihe su potrošened!</div>';
        } else if (daysLeft <= 7) {
            cardClass += ' warning-card';
            badgeClass = 'badge-warning';
            badgeText = `Još ${daysLeft}d`;
            progressFillClass = 'fill-warning';
            
            if (med.trenutnoPodizanje < med.maxPodizanja) {
                statusNotice = `<div style="color: var(--warning); font-weight: bold; font-size: 0.8rem; margin-top: 4px;">🔔 Naruči/Podigni lijek (Sljedeće: ${med.trenutnoPodizanje + 1}/${med.maxPodizanja})</div>`;
            } else {
                statusNotice = `<div style="color: var(--danger); font-weight: bold; font-size: 0.8rem; margin-top: 4px;">🚨 Iskorišten recept! Traži novi recept od liječnika.</div>`;
            }
        }

        // Check 3 days before next refill date notification
        let refillNoticeBadge = '';
        if (daysNextRefill <= 3 && med.trenutnoPodizanje < med.maxPodizanja) {
            refillNoticeBadge = `
                <div style="background-color: var(--warning-bg); border: 1px solid var(--warning); border-radius: 6px; padding: 6px 10px; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.1rem;">🔔</span>
                    <span style="color: var(--warning); font-weight: 600; font-size: 0.82rem;">
                        ${daysNextRefill < 0 ? 'Sljedeće izdavanje je dospjelo!' : `Sljedeće izdavanje za ${daysNextRefill} dana (${formatDateHr(med.datumSljedecegIzdavanja)})`}
                    </span>
                </div>
            `;
        }

        // Percentage for progress bar
        const totalDuration = Math.max(med.trajanjeDana, 1);
        const percentRemaining = Math.max(0, Math.min(100, Math.round((daysLeft / totalDuration) * 100)));

        // Log snippet HTML (2-3 lines display)
        const logHtml = med.log ? `
            <div class="med-log-box" style="margin-top: 6px;">
                <div class="med-log-title">Napomena / Log:</div>
                <div>${escapeHtml(med.log)}</div>
            </div>
        ` : '';

        const cardEl = document.createElement('div');
        cardEl.className = cardClass;
        cardEl.innerHTML = `
            <div class="med-header">
                <div class="med-title-area">
                    <span class="med-id">ID: #${med.id}</span>
                    <h3 class="med-name">${escapeHtml(med.naziv)}</h3>
                </div>
                <span class="med-badge ${badgeClass}">${badgeText}</span>
            </div>

            <div class="days-bar-container">
                <div class="days-bar-info">
                    <span>Preostalo zaliha:</span>
                    <span class="days-count" style="color: ${daysLeft <= 7 ? (daysLeft < 0 ? 'var(--danger)' : 'var(--warning)') : 'var(--success)'}">
                        ${daysLeft < 0 ? '0 dana (Isteklo)' : daysLeft + ' dana'}
                    </span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${progressFillClass}" style="width: ${percentRemaining}%"></div>
                </div>
                ${statusNotice}
                ${refillNoticeBadge}
            </div>

            <div class="med-details-grid">
                <div class="detail-item">
                    <span class="detail-label">Početak korištenja:</span>
                    <span class="detail-value">${formatDateHr(med.datumPocetka)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Istek zaliha:</span>
                    <span class="detail-value">${formatDateHr(expDateIso)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Sljedeće izdavanje:</span>
                    <span class="detail-value" style="color: ${daysNextRefill <= 3 ? 'var(--warning)' : 'inherit'}">${formatDateHr(med.datumSljedecegIzdavanja)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Recept podizanje:</span>
                    <span class="detail-value" style="color: ${med.trenutnoPodizanje >= med.maxPodizanja ? 'var(--warning)' : 'inherit'}">
                        ${med.trenutnoPodizanje} / ${med.maxPodizanja}
                    </span>
                </div>
            </div>

            ${logHtml}

            <div class="med-actions">
                <button class="btn btn-sm btn-success" onclick="openRefillModal(${med.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                        <path d="M23 4v6h-6M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Podigni lijek
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openEditModal(${med.id})">
                    Uredi
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteMedication(${med.id})">
                    Obriši
                </button>
            </div>
        `;

        container.appendChild(cardEl);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// Modal Handlers (Add / Edit)
const medModal = document.getElementById('medModal');
const medForm = document.getElementById('medForm');

document.getElementById('openAddModalBtn').addEventListener('click', () => {
    if (lijekovi.length >= MAX_LIJEKOVA) {
        alert(`Dosegnut je maksimalan broj lijekova (${MAX_LIJEKOVA}/${MAX_LIJEKOVA})! Obrišite neki lijek da biste dodali novi.`);
        return;
    }
    openAddModal();
});

document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelMedBtn').addEventListener('click', closeModal);

// Dynamic update of default next refill date when datumPocetka or trajanjeDana changes
document.getElementById('datumInput').addEventListener('change', autoUpdateNextRefillDate);
document.getElementById('trajanjeInput').addEventListener('input', autoUpdateNextRefillDate);

function autoUpdateNextRefillDate() {
    const medId = document.getElementById('medId').value;
    // Auto-update only for new medications
    if (!medId) {
        const datumPocetka = document.getElementById('datumInput').value || getTodayIsoString();
        const trajanjeDana = parseInt(document.getElementById('trajanjeInput').value, 10) || 30;
        document.getElementById('datumSljedecegIzdavanjaInput').value = addDaysToDate(datumPocetka, trajanjeDana);
    }
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Dodaj novi lijek';
    document.getElementById('medId').value = '';
    document.getElementById('nazivInput').value = '';
    
    const today = getTodayIsoString();
    document.getElementById('datumInput').value = today;
    document.getElementById('tableteInput').value = '30';
    document.getElementById('trajanjeInput').value = '30';
    document.getElementById('datumSljedecegIzdavanjaInput').value = addDaysToDate(today, 30);
    document.getElementById('maxPodizanjaInput').value = '3';
    document.getElementById('trenutnoPodizanjeInput').value = '1';
    document.getElementById('logInput').value = '';
    
    document.getElementById('trenutnoPodizanjeGroup').style.display = 'none';
    medModal.classList.remove('hidden');
    checkAndRequestNotificationPermission();
}

function openEditModal(id) {
    const med = lijekovi.find(m => m.id === id);
    if (!med) return;

    document.getElementById('modalTitle').textContent = `Uredi lijek: ${med.naziv}`;
    document.getElementById('medId').value = med.id;
    document.getElementById('nazivInput').value = med.naziv;
    document.getElementById('datumInput').value = med.datumPocetka;
    document.getElementById('tableteInput').value = med.brojTableta;
    document.getElementById('trajanjeInput').value = med.trajanjeDana;
    document.getElementById('datumSljedecegIzdavanjaInput').value = med.datumSljedecegIzdavanja || addDaysToDate(med.datumPocetka, med.trajanjeDana);
    document.getElementById('maxPodizanjaInput').value = med.maxPodizanja;
    document.getElementById('trenutnoPodizanjeInput').value = med.trenutnoPodizanje;
    document.getElementById('logInput').value = med.log || '';

    document.getElementById('trenutnoPodizanjeGroup').style.display = 'flex';
    medModal.classList.remove('hidden');
}

function closeModal() {
    medModal.classList.add('hidden');
}

medForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const idVal = document.getElementById('medId').value;
    const naziv = document.getElementById('nazivInput').value.trim();
    const datumPocetka = document.getElementById('datumInput').value || getTodayIsoString();
    const brojTableta = parseInt(document.getElementById('tableteInput').value, 10);
    const trajanjeDana = parseInt(document.getElementById('trajanjeInput').value, 10);
    const datumSljedecegIzdavanja = document.getElementById('datumSljedecegIzdavanjaInput').value || addDaysToDate(datumPocetka, trajanjeDana);
    const maxPodizanja = parseInt(document.getElementById('maxPodizanjaInput').value, 10);
    const trenutnoPodizanje = parseInt(document.getElementById('trenutnoPodizanjeInput').value, 10) || 1;
    const log = document.getElementById('logInput').value.trim();

    if (!naziv) {
        alert('Naziv lijeka ne smije biti prazan!');
        return;
    }

    if (idVal) {
        // Edit mode
        const index = lijekovi.findIndex(m => m.id === parseInt(idVal, 10));
        if (index !== -1) {
            lijekovi[index] = {
                id: parseInt(idVal, 10),
                naziv,
                datumPocetka,
                datumSljedecegIzdavanja,
                brojTableta,
                trajanjeDana,
                maxPodizanja,
                trenutnoPodizanje: Math.min(trenutnoPodizanje, maxPodizanja),
                log
            };
        }
    } else {
        // Add mode
        let newId = 1;
        for (let i = 1; i <= MAX_LIJEKOVA; i++) {
            if (!lijekovi.some(m => m.id === i)) {
                newId = i;
                break;
            }
        }

        lijekovi.push({
            id: newId,
            naziv,
            datumPocetka,
            datumSljedecegIzdavanja,
            brojTableta,
            trajanjeDana,
            maxPodizanja,
            trenutnoPodizanje: 1,
            log
        });
    }

    saveLijekovi();
    closeModal();
});

// Delete medication
function deleteMedication(id) {
    const med = lijekovi.find(m => m.id === id);
    if (!med) return;

    if (confirm(`Jeste li sigurni da želite obrisati lijek "${med.naziv}"?`)) {
        lijekovi = lijekovi.filter(m => m.id !== id);
        saveLijekovi();
    }
}

// Refill / Podizanje lijeka Modal
const refillModal = document.getElementById('refillModal');
document.getElementById('closeRefillModalBtn').addEventListener('click', closeRefillModal);

function closeRefillModal() {
    refillModal.classList.add('hidden');
}

function openRefillModal(id) {
    const med = lijekovi.find(m => m.id === id);
    if (!med) return;

    const content = document.getElementById('refillContent');
    const isMaxReached = med.trenutnoPodizanje >= med.maxPodizanja;

    if (isMaxReached) {
        content.innerHTML = `
            <div class="refill-info-card" style="border: 1px solid var(--danger);">
                <h4 style="color: var(--danger); font-size: 1.05rem;">⚠️ PAŽNJA: Iskoristili ste sva podizanja!</h4>
                <p style="font-size: 0.9rem; margin-top: 4px;">
                    Iskorišteno je <strong>${med.trenutnoPodizanje} od ${med.maxPodizanja}</strong> podizanja na trenutnom receptu za lijek <strong>"${escapeHtml(med.naziv)}"</strong>.
                </p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">
                    Morate zatražiti <strong>Novi Recept</strong> od svog liječnika obiteljske medicine.
                </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
                <label style="font-size: 0.88rem; font-weight: 600;">Jeste li dobili NOVI recept od liječnika?</label>
                <div class="form-group">
                    <label>Maksimalan broj podizanja na novom receptu:</label>
                    <select id="newMaxRefillSelect">
                        <option value="1">1 (Jednokratni recept)</option>
                        <option value="2">2 podizanja</option>
                        <option value="3" selected>3 podizanja</option>
                        <option value="4">4 podizanja</option>
                        <option value="5">5 podizanja</option>
                        <option value="6">6 podizanja (Ponovljivi)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Datum sljedećeg izdavanja:</label>
                    <input type="date" id="newNextRefillDateInput" value="${addDaysToDate(getTodayIsoString(), med.trajanjeDana)}">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeRefillModal()">Zatvori</button>
                    <button class="btn btn-primary" onclick="confirmNewPrescription(${med.id})">
                        Započni novi recept
                    </button>
                </div>
            </div>
        `;
    } else {
        const nextRefill = med.trenutnoPodizanje + 1;
        const suggestedNextRefillDate = addDaysToDate(getTodayIsoString(), med.trajanjeDana);
        content.innerHTML = `
            <div class="refill-info-card">
                <h4 style="color: var(--success); font-size: 1.05rem;">Evidentiranje podizanja lijeka</h4>
                <div class="refill-info-item" style="margin-top: 8px;">
                    <span>Lijek:</span>
                    <strong>${escapeHtml(med.naziv)}</strong>
                </div>
                <div class="refill-info-item">
                    <span>Trenutno podizanje:</span>
                    <span>${med.trenutnoPodizanje} od ${med.maxPodizanja}</span>
                </div>
                <div class="refill-info-item" style="color: var(--primary);">
                    <span>Novo stanje nakon podizanja:</span>
                    <strong>${nextRefill} od ${med.maxPodizanja}</strong>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">
                    Potvrdom podizanja datum početka zaliha automatski se postavlja na <strong>današnji datum (${formatDateHr(getTodayIsoString())})</strong>.
                </p>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
                <label for="refillNextDateInput">Sljedeće izdavanje dospijeva na datum:</label>
                <input type="date" id="refillNextDateInput" value="${suggestedNextRefillDate}">
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeRefillModal()">Odustani</button>
                <button class="btn btn-success" onclick="confirmStandardRefill(${med.id})">
                    Potvrdi podizanje lijeka
                </button>
            </div>
        `;
    }

    refillModal.classList.remove('hidden');
}

function confirmStandardRefill(id) {
    const med = lijekovi.find(m => m.id === id);
    if (!med) return;

    const customNextDate = document.getElementById('refillNextDateInput').value;

    med.trenutnoPodizanje += 1;
    med.datumPocetka = getTodayIsoString();
    med.datumSljedecegIzdavanja = customNextDate || addDaysToDate(getTodayIsoString(), med.trajanjeDana);

    saveLijekovi();
    closeRefillModal();
}

function confirmNewPrescription(id) {
    const med = lijekovi.find(m => m.id === id);
    if (!med) return;

    const newMax = parseInt(document.getElementById('newMaxRefillSelect').value, 10);
    const customNextDate = document.getElementById('newNextRefillDateInput').value;

    med.maxPodizanja = newMax;
    med.trenutnoPodizanje = 1;
    med.datumPocetka = getTodayIsoString();
    med.datumSljedecegIzdavanja = customNextDate || addDaysToDate(getTodayIsoString(), med.trajanjeDana);

    saveLijekovi();
    closeRefillModal();
}

// Backup (Export / Import JSON)
document.getElementById('exportDataBtn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lijekovi, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lijekovi_backup_${getTodayIsoString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                lijekovi = sanitizeData(imported);
                saveLijekovi();
                alert('Podaci o lijekovima uspješno su uvezeni!');
            } else {
                alert('Neispravan format datoteke!');
            }
        } catch (err) {
            alert('Pogreška pri čitanju datoteke JSON!');
        }
    };
    reader.readAsText(file);
});

// PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.classList.remove('hidden');
    }
});

document.getElementById('installAppBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
        console.log('Korisnik je prihvatio instalaciju aplikacije!');
    }
    deferredInstallPrompt = null;
    document.getElementById('pwaInstallBanner').classList.add('hidden');
});

// Immediate display of date on launch
document.addEventListener('DOMContentLoaded', () => {
    const todayFormatted = formatDateHr(getTodayIsoString());
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.textContent = todayFormatted;
});

// App Initialization
loadLijekovi();

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://vsyjnxmofujgwrjigzcj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeWpueG1vZnVqZ3dyamlnemNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDA5MzUsImV4cCI6MjA5NTgxNjkzNX0.LvQDwxxp9DsQIXmemsF5nimazZwoafMyjXpT-6eY1Ao';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalItinerariData = [];
let globalBajetData = [];
const groupMembers = ["Amri", "Athirah", "Huda", "Dar", "Man Kim", "Yul", "Aqmal"];

// HELPER FUNCTION: Time conversion for chronological sorting
function kiraMasa(masaStr) {
    if(!masaStr) return 9999;
    let str = masaStr.toLowerCase();
    let match = str.match(/(\d+)[:.](\d+)/); 
    if(!match) return 9999;
    let jam = parseInt(match[1]);
    let minit = parseInt(match[2]);
    if (str.includes("petang") || str.includes("malam") || str.includes("pm")) { if (jam < 12) jam += 12; } 
    else if (str.includes("pagi") || str.includes("am")) { if (jam === 12) jam = 0; }
    return (jam * 60) + minit;
}

// GENERIC DELETE FUNCTION
async function padamData(jadual, id) {
    if (confirm("Are you sure you want to delete this item?")) {
        const { error } = await _supabase.from(jadual).delete().eq('id', id);
        if (error) alert("Failed: " + error.message); else location.reload();
    }
}

// ==========================================
// ITINERARY FUNCTIONS
// ==========================================
async function tambahItinerari() {
    const hari = document.getElementById('addHari').value;
    const masa = document.getElementById('addMasa').value;
    const aktiviti = document.getElementById('addAktiviti').value;
    if(!hari || !aktiviti) return alert("Fill in Day and Activity!");
    const { error } = await _supabase.from('itinerari').insert([{ hari, masa, aktiviti }]);
    if (error) alert("Failed: " + error.message); else location.reload();
}

function bukaModalEditItinerari(id) {
    const item = globalItinerariData.find(x => x.id === id);
    document.getElementById('editItinId').value = item.id;
    document.getElementById('editHari').value = item.hari || '';
    document.getElementById('editMasa').value = item.masa || '';
    document.getElementById('editAktiviti').value = item.aktiviti || '';
    document.getElementById('editPenerangan').value = item.penerangan || '';
    new bootstrap.Modal(document.getElementById('modalEditItinerari')).show();
}

async function simpanEditItinerari() {
    const id = document.getElementById('editItinId').value;
    const hari = document.getElementById('editHari').value;
    const masa = document.getElementById('editMasa').value;
    const aktiviti = document.getElementById('editAktiviti').value;
    const penerangan = document.getElementById('editPenerangan').value;
    const { error } = await _supabase.from('itinerari').update({ hari, masa, aktiviti, penerangan }).eq('id', id);
    if (error) alert("Failed: " + error.message); else location.reload();
}

async function fetchItinerari() {
    const { data } = await _supabase.from('itinerari').select('*');
    globalItinerariData = data || [];
    let dataIkutHari = {};
    globalItinerariData.forEach(row => {
        let hari = row.hari ? row.hari.trim() : "";
        if(hari !== "" && row.aktiviti) {
            if(!dataIkutHari[hari]) dataIkutHari[hari] = []; 
            dataIkutHari[hari].push(row);
        }
    });

    let finalHTML = '';
    Object.keys(dataIkutHari).sort((a,b) => a-b).forEach(hari => {
        dataIkutHari[hari].sort((a, b) => kiraMasa(a.masa) - kiraMasa(b.masa));
        finalHTML += `<h2 class="day-header"><i class="fas fa-calendar-day me-2"></i> DAY ${hari}</h2><div class="timeline-container">`;
        dataIkutHari[hari].forEach(row => {
            finalHTML += `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="action-group">
                            <button onclick="bukaModalEditItinerari(${row.id})" class="btn-action edit"><i class="fas fa-edit"></i></button>
                            <button onclick="padamData('itinerari', ${row.id})" class="btn-action delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                        <div class="time-badge">${row.masa || 'TBD'}</div>
                        <h5 class="fw-bold text-dark mb-2">${row.aktiviti}</h5>
                        <p class="text-muted mb-0" style="font-size: 0.95rem;">${row.penerangan || ''}</p>
                    </div>
                </div>`;
        });
        finalHTML += `</div>`; 
    });
    document.getElementById('ruang-itinerari').innerHTML = finalHTML || "<p class='text-center'>No itinerary data found.</p>";
}

// ==========================================
// BUDGET FUNCTIONS
// ==========================================
async function tambahBajet() {
    const perkara = document.getElementById('addPerkara').value;
    const harga = document.getElementById('addHarga').value;
    const paid_by = document.getElementById('addPaidBy').value;
    const split_for = document.getElementById('addSplitFor').value;
    
    if(!perkara || !harga) return alert("Fill in Item and Price!");
    const { error } = await _supabase.from('bajet').insert([{ perkara, harga, paid_by, split_for }]);
    if (error) alert("Failed: " + error.message); else location.reload();
}

async function simpanSplitResit() {
    const receiptName = document.getElementById('splitResitName').value;
    const payer = document.getElementById('splitResitPayer').value;
    
    if(!receiptName || !payer) return alert("Please fill in the Receipt Name and Who Paid!");

    const amounts = {
        "Amri": parseFloat(document.getElementById('split_Amri').value) || 0,
        "Athirah": parseFloat(document.getElementById('split_Athirah').value) || 0,
        "Huda": parseFloat(document.getElementById('split_Huda').value) || 0,
        "Dar": parseFloat(document.getElementById('split_Dar').value) || 0,
        "Man Kim": parseFloat(document.getElementById('split_ManKim').value) || 0,
        "Yul": parseFloat(document.getElementById('split_Yul').value) || 0,
        "Aqmal": parseFloat(document.getElementById('split_Aqmal').value) || 0
    };

    let batchData = [];
    
    for (const [person, amount] of Object.entries(amounts)) {
        if (amount > 0) {
            batchData.push({
                perkara: `${receiptName} (${person})`, 
                harga: amount,
                paid_by: payer,
                split_for: person
            });
        }
    }

    if(batchData.length === 0) return alert("You didn't enter any amounts!");

    const { error } = await _supabase.from('bajet').insert(batchData);
    if (error) alert("Failed: " + error.message); else location.reload();
}

function bukaModalEditBajet(id) {
    const item = globalBajetData.find(x => x.id === id);
    document.getElementById('editBajetId').value = item.id;
    document.getElementById('editPerkara').value = item.perkara || '';
    
    let pureNumber = parseFloat(item.harga.toString().replace(/[^0-9.-]+/g,""));
    document.getElementById('editHarga').value = isNaN(pureNumber) ? '' : pureNumber;
    document.getElementById('editPaidBy').value = item.paid_by || '';
    document.getElementById('editSplitFor').value = item.split_for || 'Everyone';
    new bootstrap.Modal(document.getElementById('modalEditBajet')).show();
}

async function simpanEditBajet() {
    const id = document.getElementById('editBajetId').value;
    const perkara = document.getElementById('editPerkara').value;
    const harga = document.getElementById('editHarga').value;
    const paid_by = document.getElementById('editPaidBy').value;
    const split_for = document.getElementById('editSplitFor').value;
    
    const { error } = await _supabase.from('bajet').update({ perkara, harga, paid_by, split_for }).eq('id', id);
    if (error) alert("Failed: " + error.message); else location.reload();
}

async function fetchBajet() {
    const { data } = await _supabase.from('bajet').select('*').order('id');
    globalBajetData = data || [];
    
    let htmlBajet = '';
    let memberPaidOut = { "Amri":0, "Athirah":0, "Huda":0, "Dar":0, "Man Kim":0, "Yul":0, "Aqmal":0 };
    let memberConsumed = { "Amri":0, "Athirah":0, "Huda":0, "Dar":0, "Man Kim":0, "Yul":0, "Aqmal":0 };

    globalBajetData.forEach(row => {
        let costVal = parseFloat(row.harga.toString().replace(/[^0-9.-]+/g,""));
        let displayCost = isNaN(costVal) ? row.harga : `RM ${costVal.toFixed(2)}`;
        
        let paidBy = row.paid_by || "Group Fund";
        let splitFor = row.split_for || "Everyone";

        let payerBadge = paidBy !== "Group Fund" ? `<span class="badge bg-secondary mb-1">Paid by: ${paidBy}</span><br>` : ``;
        let splitBadge = splitFor === "Everyone" ? `<span class="badge bg-success">Shared</span>` : `<span class="badge bg-warning text-dark">For: ${splitFor}</span>`;

        if(!isNaN(costVal)) {
            if(paidBy && memberPaidOut[paidBy] !== undefined) memberPaidOut[paidBy] += costVal;

            if(splitFor === "Everyone") {
                let splitCost = costVal / 7;
                groupMembers.forEach(m => memberConsumed[m] += splitCost);
            } else if (memberConsumed[splitFor] !== undefined) {
                memberConsumed[splitFor] += costVal;
            }
        }

        htmlBajet += `
            <tr>
                <td>${row.perkara}</td>
                <td class="fw-bold">${displayCost}</td>
                <td style="font-size:0.85rem;">${payerBadge}${splitBadge}</td>
                <td>
                    <div class="d-flex justify-content-end gap-2">
                        <button onclick="bukaModalEditBajet(${row.id})" class="btn-action edit"><i class="fas fa-edit"></i></button>
                        <button onclick="padamData('bajet', ${row.id})" class="btn-action delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
    });
    
    document.getElementById('bajet-table-body').innerHTML = htmlBajet || "<tr><td colspan='4' class='text-center text-muted'>No expenses added yet.</td></tr>";

    let summaryHTML = `<div class="text-start mt-3">`;
    let hasData = false;

    groupMembers.forEach(member => {
        let paid = memberPaidOut[member];
        let consumed = memberConsumed[member];
        let balance = paid - consumed; 
        
        if(paid > 0 || consumed > 0) hasData = true;

        if(balance > 0.05) { 
            summaryHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <span><strong>${member}</strong></span>
                    <span class="receives">Gets back RM ${balance.toFixed(2)}</span>
                </div>`;
        } else if (balance < -0.05) {
            summaryHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <span><strong>${member}</strong></span>
                    <span class="owes">Owes RM ${Math.abs(balance).toFixed(2)}</span>
                </div>`;
        } else {
            summaryHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <span class="text-muted"><strong>${member}</strong></span>
                    <span class="settled"><i class="fas fa-check-circle"></i> Settled</span>
                </div>`;
        }
    });

    if(!hasData) summaryHTML = `<p class="text-muted text-center mt-3">Add expenses to see who owes whom.</p>`;
    else summaryHTML += `</div>`;

    document.getElementById('summary-content').innerHTML = summaryHTML;
}

// Initial Data Fetch
fetchItinerari();
fetchBajet();
// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://vsyjnxmofujgwrjigzcj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeWpueG1vZnVqZ3dyamlnemNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDA5MzUsImV4cCI6MjA5NTgxNjkzNX0.LvQDwxxp9DsQIXmemsF5nimazZwoafMyjXpT-6eY1Ao'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalItinerariData = [];
let globalBajetData = [];
let globalMemberData = [];
let groupMembers = []; 

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

async function padamData(jadual, id) {
    if (confirm("Are you sure you want to delete this item?")) {
        const { error } = await _supabase.from(jadual).delete().eq('id', id);
        if (error) alert("Failed: " + error.message); else location.reload();
    }
}

// ==========================================
// IMAGE UPLOAD HELPER FUNCTION
// ==========================================
async function uploadImageToSupabase(file) {
    // Generate a random unique name for the file so it doesn't overwrite others
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

    // Upload to 'avatars' bucket
    const { data, error } = await _supabase.storage.from('avatars').upload(fileName, file);
    
    if (error) throw error;

    // Get the public URL to show on the website
    const { data: publicData } = _supabase.storage.from('avatars').getPublicUrl(fileName);
    return publicData.publicUrl;
}

// ==========================================
// TRIP INFO (DYNAMIC HEADER)
// ==========================================
async function fetchTripInfo() {
    const { data, error } = await _supabase.from('trip_info').select('*').limit(1);
    if (data && data.length > 0) {
        document.getElementById('display-trip-title').innerText = data[0].title || "MY TRIP";
        document.getElementById('display-trip-subtitle').innerText = data[0].subtitle || "Ready to go!";
        
        document.getElementById('tripInfoId').value = data[0].id;
        document.getElementById('editTripTitle').value = data[0].title;
        document.getElementById('editTripSubtitle').value = data[0].subtitle;
    } else {
        document.getElementById('display-trip-title').innerText = "SETUP REQUIRED";
        document.getElementById('display-trip-subtitle').innerText = "Please add a row to 'trip_info' in Supabase.";
    }
}

async function simpanTripInfo() {
    const id = document.getElementById('tripInfoId').value;
    const title = document.getElementById('editTripTitle').value;
    const subtitle = document.getElementById('editTripSubtitle').value;
    
    if(!id) {
        await _supabase.from('trip_info').insert([{ title, subtitle }]);
    } else {
        await _supabase.from('trip_info').update({ title, subtitle }).eq('id', id);
    }
    location.reload();
}

// ==========================================
// TRIP MEMBERS (WITH FILE UPLOAD)
// ==========================================
async function fetchMembers() {
    const { data, error } = await _supabase.from('trip_members').select('*');
    if (error) { console.error(error); return; }

    globalMemberData = data || [];
    let html = '';
    let splitInputsHtml = ''; 
    groupMembers = []; 

    data.forEach(member => {
        groupMembers.push(member.name); 
        
        let imgSource = member.image_url ? member.image_url : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

        // Added Edit button to the member card
        html += `
            <div class="col-6 col-sm-4 col-md-3 member-card position-relative">
                <div class="position-absolute top-0 end-0 m-1 d-flex gap-1" style="z-index: 10;">
                    <button onclick="bukaModalEditMember(${member.id})" class="btn btn-sm btn-light p-1 shadow-sm rounded-circle" style="width: 28px; height: 28px;"><i class="fas fa-pencil-alt text-info" style="font-size: 12px;"></i></button>
                    <button onclick="padamData('trip_members', ${member.id})" class="btn btn-sm btn-light p-1 shadow-sm rounded-circle" style="width: 28px; height: 28px;"><i class="fas fa-times text-danger" style="font-size: 12px;"></i></button>
                </div>
                <img src="${imgSource}" alt="${member.name}" class="member-img">
                <h6 class="fw-bold mb-0">${member.name}</h6>
                <small class="text-muted">${member.role || 'Member'}</small>
            </div>
        `;

        splitInputsHtml += `
            <div class="row g-2 mb-2">
                <div class="col-4 fw-bold align-self-center">${member.name}</div>
                <div class="col-8">
                    <div class="input-group">
                        <span class="input-group-text border-0 bg-light">RM</span>
                        <input type="number" class="form-control bg-light border-0 split-input dynamic-split-val" placeholder="0.00" data-member="${member.name}">
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('ruang-members').innerHTML = html || "<p class='text-muted'>No members added yet.</p>";
    document.getElementById('dynamic-split-inputs').innerHTML = splitInputsHtml;

    updateBudgetDropdowns();
}

async function tambahMember() {
    const btn = document.getElementById('btnSaveMember');
    const name = document.getElementById('addMemberName').value;
    const role = document.getElementById('addMemberRole').value;
    const fileInput = document.getElementById('addMemberImgFile');

    if(!name) return alert("Member name is required!");

    btn.innerText = "Uploading...";
    btn.disabled = true;

    let image_url = '';
    
    // Check if user selected a file to upload
    if (fileInput.files.length > 0) {
        try {
            image_url = await uploadImageToSupabase(fileInput.files[0]);
        } catch (err) {
            btn.innerText = "Add Member";
            btn.disabled = false;
            return alert("Image upload failed. Did you create the 'avatars' public bucket? Error: " + err.message);
        }
    }

    const { error } = await _supabase.from('trip_members').insert([{ name, role, image_url }]);
    if (error) {
        alert("Database error: " + error.message);
        btn.innerText = "Add Member";
        btn.disabled = false;
    } else {
        location.reload();
    }
}

function bukaModalEditMember(id) {
    const member = globalMemberData.find(x => x.id === id);
    document.getElementById('editMemberId').value = member.id;
    document.getElementById('editMemberName').value = member.name || '';
    document.getElementById('editMemberRole').value = member.role || '';
    document.getElementById('editMemberOldImg').value = member.image_url || '';
    document.getElementById('editMemberImgFile').value = ''; // Reset file input
    
    new bootstrap.Modal(document.getElementById('modalEditMember')).show();
}

async function simpanEditMember() {
    const btn = document.getElementById('btnUpdateMember');
    const id = document.getElementById('editMemberId').value;
    const name = document.getElementById('editMemberName').value;
    const role = document.getElementById('editMemberRole').value;
    const fileInput = document.getElementById('editMemberImgFile');
    let image_url = document.getElementById('editMemberOldImg').value; // Default to old image

    if(!name) return alert("Member name is required!");

    btn.innerText = "Updating...";
    btn.disabled = true;

    // If they selected a NEW file, upload it and overwrite the image_url
    if (fileInput.files.length > 0) {
        try {
            image_url = await uploadImageToSupabase(fileInput.files[0]);
        } catch (err) {
            btn.innerText = "Update Member";
            btn.disabled = false;
            return alert("Image upload failed: " + err.message);
        }
    }

    const { error } = await _supabase.from('trip_members').update({ name, role, image_url }).eq('id', id);
    
    if (error) {
        alert("Failed: " + error.message);
        btn.innerText = "Update Member";
        btn.disabled = false;
    } else {
        location.reload();
    }
}

function updateBudgetDropdowns() {
    let payerOptions = '<option value="">Select person...</option>';
    let splitOptions = '<option value="Everyone">Everyone (Split Evenly)</option>';
    
    groupMembers.forEach(name => {
        payerOptions += `<option value="${name}">${name}</option>`;
        splitOptions += `<option value="${name}">Only ${name}</option>`;
    });
    
    payerOptions += '<option value="Group Fund">Group Fund / Split</option>';

    ['addPaidBy', 'editPaidBy', 'splitResitPayer'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerHTML = payerOptions;
    });

    ['addSplitFor', 'editSplitFor'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerHTML = splitOptions;
    });
}

// ==========================================
// ITINERARY FUNCTIONS
// ==========================================
async function tambahItinerari() {
    const hari = document.getElementById('addHari').value;
    const masa = document.getElementById('addMasa').value;
    const aktiviti = document.getElementById('addAktiviti').value;
    const penerangan = document.getElementById('addPenerangan').value;
    
    if(!hari || !aktiviti) return alert("Fill in Day and Activity!");
    const { error } = await _supabase.from('itinerari').insert([{ hari, masa, aktiviti, penerangan }]);
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

    let batchData = [];
    const splitInputs = document.querySelectorAll('.dynamic-split-val');
    
    splitInputs.forEach(input => {
        let amount = parseFloat(input.value) || 0;
        let person = input.getAttribute('data-member');
        
        if (amount > 0) {
            batchData.push({
                perkara: `${receiptName} (${person})`, 
                harga: amount,
                paid_by: payer,
                split_for: person
            });
        }
    });

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
    let memberPaidOut = {};
    let memberConsumed = {};
    
    groupMembers.forEach(m => {
        memberPaidOut[m] = 0;
        memberConsumed[m] = 0;
    });

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
                let splitCost = costVal / (groupMembers.length || 1); 
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

    let debtors = [];   
    let creditors = []; 

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
            creditors.push({ name: member, amount: balance });
        } else if (balance < -0.05) {
            summaryHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <span><strong>${member}</strong></span>
                    <span class="owes">Owes RM ${Math.abs(balance).toFixed(2)}</span>
                </div>`;
            debtors.push({ name: member, amount: Math.abs(balance) });
        } else {
            summaryHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <span class="text-muted"><strong>${member}</strong></span>
                    <span class="settled"><i class="fas fa-check-circle"></i> Settled</span>
                </div>`;
        }
    });

    if(!hasData) {
        summaryHTML = `<p class="text-muted text-center mt-3">Add expenses to see who owes whom.</p></div>`;
        document.getElementById('summary-content').innerHTML = summaryHTML;
        return;
    } 
    summaryHTML += `</div>`;

    let transferInstructions = `<h6 class="fw-bold text-center mt-4 border-top pt-3"><i class="fas fa-exchange-alt text-muted"></i> Transfer Instructions</h6><div class="text-center small text-muted mb-3">Follow these exact payments to clear all debts:</div>`;
    let hasTransfers = false;

    let c = 0; 
    let d = 0; 

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    while (d < debtors.length && c < creditors.length) {
        let debtor = debtors[d];
        let creditor = creditors[c];

        let transferAmount = Math.min(debtor.amount, creditor.amount);

        if (transferAmount > 0.01) {
            transferInstructions += `
                <div class="p-2 mb-2 bg-light rounded d-flex justify-content-between align-items-center mx-auto" style="max-width: 350px; border: 1px solid #e2f0cb;">
                    <span><strong>${debtor.name}</strong> ➔ <strong>${creditor.name}</strong></span>
                    <span class="fw-bold text-danger">RM ${transferAmount.toFixed(2)}</span>
                </div>`;
            hasTransfers = true;
        }

        debtor.amount -= transferAmount;
        creditor.amount -= transferAmount;

        if (debtor.amount <= 0.01) d++;
        if (creditor.amount <= 0.01) c++;
    }

    if (!hasTransfers) {
        transferInstructions = `<p class="text-muted text-center mt-3">All clean! No transfers needed.</p>`;
    }

    document.getElementById('summary-content').innerHTML = summaryHTML + transferInstructions;
}

// ==========================================
// INITIALIZE APP (SEQUENTIAL LOAD)
// ==========================================
fetchTripInfo();
fetchMembers().then(() => {
    fetchItinerari();
    fetchBajet();
});
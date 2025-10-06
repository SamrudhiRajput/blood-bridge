// Main JS for Blood Bridge demo (frontend-only)
// Features:
// - donor registration (stored in localStorage)
// - generate professional PDF certificate using jsPDF
// - request submission (stored in localStorage)
// - donors list, search, export CSV
// - simple UI interactions

(function(){
  // Utilities
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  function saveToStorage(key, value){localStorage.setItem(key, JSON.stringify(value))}
  function loadFromStorage(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []}}

  // Donor form handling & certificate generation
  const donorForm = qs('#donorForm');
  const previewBtn = qs('#previewBtn');

  if(donorForm){
    donorForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = qs('#donorName').value.trim();
      const age = qs('#donorAge').value.trim();
      const blood = qs('#donorBlood').value.trim();
      const city = qs('#donorCity').value.trim();
      const phone = qs('#donorPhone').value.trim();
      const notes = qs('#donorNotes').value.trim();

      if(!name || !blood || !phone){alert('Please complete required fields');return}

      // Save donor to localStorage
      const donors = loadFromStorage('donors');
      donors.unshift({name,age,blood,city,phone,notes,registeredAt:(new Date()).toISOString()});
      saveToStorage('donors', donors);

      // Generate certificate
      generateCertificate(name, blood);

      alert('🎉 Donor Registered Successfully! Certificate downloaded. Donor saved locally for demo.');
      donorForm.reset();
    });

    previewBtn && previewBtn.addEventListener('click', function(){
      const name = qs('#donorName').value.trim() || 'Donor Name';
      const blood = qs('#donorBlood').value.trim() || 'A+';
      generateCertificate(name, blood, true);
    });
  }

  // Request form handling
  const requestForm = qs('#requestForm');
  if(requestForm){
    const requestsListEl = qs('#requestsList');
    const clearBtn = qs('#clearRequests');

    function renderRequests(){
      const requests = loadFromStorage('requests');
      if(!requestsListEl) return;
      requestsListEl.innerHTML = '';
      requests.slice().reverse().forEach(r=>{
        const li = document.createElement('li');
        li.textContent = `${r.patient} — ${r.blood} — ${r.hospital} — ${r.phone} (${new Date(r.at).toLocaleString()})`;
        requestsListEl.appendChild(li);
      });
    }

    requestForm.addEventListener('submit', function(e){
      e.preventDefault();
      const patient = qs('#patientName').value.trim();
      const blood = qs('#requiredBlood').value.trim();
      const hospital = qs('#hospital').value.trim();
      const phone = qs('#requestPhone').value.trim();
      const notes = qs('#requestNotes').value.trim();
      if(!patient || !blood || !phone){alert('Please complete required fields');return}
      const requests = loadFromStorage('requests');
      requests.push({patient,blood,hospital,phone,notes,at:(new Date()).toISOString()});
      saveToStorage('requests', requests);
      alert('✅ Blood Request Submitted. Donors will see it in the demo list.');
      requestForm.reset();
      renderRequests();
    });

    clearBtn && clearBtn.addEventListener('click', function(){
      if(confirm('Clear all stored demo requests?')){localStorage.removeItem('requests'); renderRequests();}
    });

    renderRequests();
  }

  // Donors list page logic
  const donorsTableBody = qs('#donorsTable tbody');
  const searchBox = qs('#searchBox');
  const exportCsvBtn = qs('#exportCsv');

  function renderDonors(filter){
    if(!donorsTableBody) return;
    const donors = loadFromStorage('donors');
    const rows = donors.filter(d=>{
      if(!filter) return true;
      const fl = filter.toLowerCase();
      return d.name.toLowerCase().includes(fl) || d.city.toLowerCase().includes(fl) || d.blood.toLowerCase().includes(fl);
    });
    donorsTableBody.innerHTML = rows.map(d=>{
      return `<tr>
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.age||'')}</td>
        <td>${escapeHtml(d.blood)}</td>
        <td>${escapeHtml(d.city||'')}</td>
        <td>${escapeHtml(d.phone)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;padding:1rem">No donors registered yet.</td></tr>';
  }

  if(searchBox){
    searchBox.addEventListener('input', function(){ renderDonors(this.value) });
  }
  if(exportCsvBtn){
    exportCsvBtn.addEventListener('click', function(){
      const donors = loadFromStorage('donors');
      if(!donors.length){alert('No donors to export');return}
      const csv = toCSV(donors);
      const blob = new Blob([csv],{type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'donors.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  renderDonors();

  // Certificate generator using jsPDF
  function generateCertificate(name, blood, previewOnly){
    try{
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape','pt','a4');
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // background
      doc.setFillColor(255,255,255);
      doc.rect(0,0,width,height,'F');

      // border
      doc.setDrawColor(200,35,51);
      doc.setLineWidth(6);
      doc.rect(30,30,width-60,height-60);

      // small inner border
      doc.setDrawColor(240,240,240);
      doc.setLineWidth(1);
      doc.rect(50,50,width-100,height-100);

      // Title
      doc.setFont('helvetica','bold');
      doc.setFontSize(34);
      doc.setTextColor(200,35,51);
      doc.text('Certificate of Appreciation', width/2, 120, {align:'center'});

      // Logo circle with drop (simple)
      // circle
      doc.setFillColor(200,35,51);
      doc.circle(90,110,30,'F');
      // drop (triangle-like)
      doc.setFillColor(255,255,255);
      doc.ellipse(90,100,10,14,'F');

      // Presented to
      doc.setFont('helvetica','normal');
      doc.setFontSize(14);
      doc.setTextColor(80,80,80);
      doc.text('This certificate is proudly presented to', width/2, 170, {align:'center'});

      // Name
      doc.setFont('times','bolditalic');
      doc.setFontSize(28);
      doc.setTextColor(20,20,20);
      doc.text(name, width/2, 210, {align:'center'});

      // Body
      doc.setFont('times','normal');
      doc.setFontSize(16);
      doc.setTextColor(60,60,60);
      const bodyText = `In recognition of their generous blood donation (${blood}). Your selfless act helps save lives and strengthens our community.`;
      doc.text(bodyText, width/2, 250, {align:'center', maxWidth: width-160});

      // Date & signature
      const dateStr = new Date().toLocaleDateString();
      doc.setFontSize(12);
      doc.setTextColor(90,90,90);
      doc.text(`Date: ${dateStr}`, 80, height-120);
      doc.text('Authorized Signature', width-140, height-120, {align:'center'});

      // decorative line for signature
      doc.setDrawColor(200,35,51);
      doc.setLineWidth(1);
      doc.line(width-220, height-125, width-80, height-125);

      if(previewOnly){
        // Open in new window as data URL
        const uri = doc.output('datauristring');
        window.open(uri, '_blank');
      } else {
        doc.save(`${name.replace(/\s+/g,'_')}_Donation_Certificate.pdf`);
      }
    }catch(err){
      console.error('Certificate generation failed', err);
      alert('Certificate generation failed. Make sure jspdf is loaded.');
    }
  }

  // helpers
  function toCSV(arr){
    const headers = ['Name','Age','Blood Group','City','Phone','Notes','RegisteredAt'];
    const rows = arr.map(d => [d.name,d.age,d.blood,d.city,d.phone,(d.notes||''),d.registeredAt].map(v=>`"\${String(v||'').replace(/"/g,'""')}"`).join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  }
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

})();

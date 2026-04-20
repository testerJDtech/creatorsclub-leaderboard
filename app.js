const STORAGE_KEY = 'lb_data_v1';

const DEFAULT = {
  sports: ['Table Tennis', 'Pool / Snooker'],
  players: ['John','Jordan','Paul','Awesome','Sam','Femisha','Lucy','Daniella'],
  scores: {},
  updated: null
};

let data = null;
let tab = null;

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT));
  } catch {
    data = JSON.parse(JSON.stringify(DEFAULT));
  }
  tab = tabFromHash() || data.sports[0] || null;
  if (tab && !window.location.hash) {
    history.replaceState(null, '', '#' + encodeURIComponent(tab));
  }
  render();
}

function saveData() {
  data.updated = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  updateSubtitle();
}

function tabFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const t = decodeURIComponent(hash);
  return (data.sports.includes(t) || t === '__manage') ? t : null;
}

function updateSubtitle() {
  const el = document.getElementById('last-updated');
  if (data.updated) {
    const d = new Date(data.updated);
    el.textContent = 'Last updated ' + d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) + ' at ' + d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
  } else {
    el.textContent = 'No results recorded yet';
  }
}

function getScores(sport) {
  return data.players.map(p => {
    const s = data.scores[sport + '__' + p] || { w: 0, l: 0 };
    const played = s.w + s.l;
    return { name: p, w: s.w, l: s.l, played, pct: played > 0 ? Math.round(s.w / played * 100) : null };
  }).sort((a, b) => b.w - a.w || a.l - b.l || a.name.localeCompare(b.name));
}

function animateContent() {
  const el = document.getElementById('content');
  if (!el) return;
  el.classList.remove('content-enter');
  void el.offsetWidth;
  el.classList.add('content-enter');
}

function render() {
  updateSubtitle();
  renderTabs();
  renderContent();
}

function renderTabs() {
  const el = document.getElementById('tabs');
  el.innerHTML = data.sports.map(s =>
    `<button class="tab${s === tab ? ' active' : ''}" onclick="setTab(${esc(JSON.stringify(s))})">${esc(s)}</button>`
  ).join('') + `<button class="tab${tab === '__manage' ? ' active' : ''}" onclick="setTab('__manage')">+ manage</button>`;
}

function renderContent() {
  const el = document.getElementById('content');
  if (tab === '__manage') { renderManage(el); animateContent(); return; }
  if (!tab) {
    el.innerHTML = '<p class="empty-state">No sports added yet. Click "+ manage" to get started.</p>';
    animateContent();
    return;
  }

  const rows = getScores(tab);
  const hasGames = rows.some(r => r.played > 0);

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th style="text-align:center">W</th>
            <th style="text-align:center">L</th>
            <th style="text-align:center">Played</th>
            <th style="text-align:center">Win %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => {
            const rankClass = hasGames ? (i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '') : '';
            return `<tr>
              <td class="rank ${rankClass}">${hasGames ? i + 1 : '—'}</td>
              <td class="player-name">${esc(r.name)}</td>
              <td class="wins">${r.w}</td>
              <td class="losses">${r.l}</td>
              <td class="num">${r.played}</td>
              <td class="num">${r.pct !== null ? r.pct + '%' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-label">Log a result</div>
    <div class="log-row">
      <select id="winner">${data.players.map(p => `<option>${esc(p)}</option>`).join('')}</select>
      <span class="vs-label">beat</span>
      <select id="loser">${data.players.map((p, i) => `<option${i === 1 ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>
      <button class="primary" onclick="logResult()">Record win</button>
    </div>
    <div class="flash" id="flash"></div>
  `;

  animateContent();
}

function renderManage(el) {
  el.innerHTML = `
    <div class="section-label" style="margin-top:0">Sports</div>
    <div class="chip-list">${data.sports.map(s =>
      `<span class="chip">${esc(s)} <span class="chip-x" onclick="removeSport(${esc(JSON.stringify(s))})">×</span></span>`
    ).join('')}</div>
    <div class="add-row">
      <input type="text" id="new-sport" placeholder="Add a sport..." onkeydown="if(event.key==='Enter')addSport()">
      <button class="primary" onclick="addSport()">Add</button>
    </div>

    <hr>

    <div class="section-label">Players</div>
    <div class="chip-list">${data.players.map(p =>
      `<span class="chip">${esc(p)} <span class="chip-x" onclick="removePlayer(${esc(JSON.stringify(p))})">×</span></span>`
    ).join('')}</div>
    <div class="add-row">
      <input type="text" id="new-player" placeholder="Add a player..." onkeydown="if(event.key==='Enter')addPlayer()">
      <button class="primary" onclick="addPlayer()">Add</button>
    </div>

    <hr>

    <div class="section-label">Reset scores</div>
    <div class="log-row">
      <select id="reset-sport">${data.sports.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <button class="danger-btn" onclick="resetSport()">Reset scores</button>
    </div>

    <hr>

    <div class="section-label">Export / import</div>
    <div class="log-row">
      <button onclick="exportData()">Export scores (.xlsx)</button>
      <button onclick="importData()">Import backup</button>
    </div>
    <div class="flash" id="flash"></div>
  `;
}

function setTab(t) {
  tab = t;
  history.pushState(null, '', '#' + encodeURIComponent(t));
  render();
}

window.addEventListener('popstate', () => {
  tab = tabFromHash() || data.sports[0] || null;
  render();
});

function logResult() {
  const w = document.getElementById('winner').value;
  const l = document.getElementById('loser').value;
  if (w === l) { flash('Pick two different players.'); return; }
  const wk = tab + '__' + w, lk = tab + '__' + l;
  if (!data.scores[wk]) data.scores[wk] = { w: 0, l: 0 };
  if (!data.scores[lk]) data.scores[lk] = { w: 0, l: 0 };
  data.scores[wk].w++;
  data.scores[lk].l++;
  saveData();
  renderContent();
  document.getElementById('winner').value = w;
  document.getElementById('loser').value = l;
  flash(w + ' beat ' + l + ' — saved!');
}

function addSport() {
  const val = document.getElementById('new-sport').value.trim();
  if (!val) return;
  if (!data.sports.includes(val)) { data.sports.push(val); saveData(); }
  render();
}

function removeSport(s) {
  if (!confirm('Remove "' + s + '" and all its scores?')) return;
  data.sports = data.sports.filter(x => x !== s);
  Object.keys(data.scores).filter(k => k.startsWith(s + '__')).forEach(k => delete data.scores[k]);
  tab = data.sports[0] || null;
  history.replaceState(null, '', tab ? '#' + encodeURIComponent(tab) : '#');
  saveData(); render();
}

function addPlayer() {
  const val = document.getElementById('new-player').value.trim();
  if (!val) return;
  if (!data.players.includes(val)) { data.players.push(val); saveData(); }
  render();
}

function removePlayer(p) {
  if (!confirm('Remove "' + p + '" and all their scores?')) return;
  data.players = data.players.filter(x => x !== p);
  Object.keys(data.scores).filter(k => k.endsWith('__' + p)).forEach(k => delete data.scores[k]);
  saveData(); render();
}

function resetSport() {
  const s = document.getElementById('reset-sport').value;
  if (!confirm('Reset all scores for "' + s + '"?')) return;
  Object.keys(data.scores).filter(k => k.startsWith(s + '__')).forEach(k => delete data.scores[k]);
  saveData(); render();
}

function exportData() {
  if (typeof XLSX === 'undefined') {
    alert('Spreadsheet library not loaded. Check your internet connection.');
    return;
  }
  try {
    const wb = XLSX.utils.book_new();
    data.sports.forEach(sport => {
      const rows = getScores(sport);
      const hasGames = rows.some(r => r.played > 0);
      const wsData = [
        ['Rank', 'Player', 'Wins', 'Losses', 'Played', 'Win %'],
        ...rows.map((r, i) => [
          hasGames ? i + 1 : '',
          r.name,
          r.w,
          r.l,
          r.played,
          r.pct !== null ? r.pct / 100 : ''
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: 5 });
        if (ws[addr] && typeof ws[addr].v === 'number') ws[addr].z = '0%';
      }
      const sheetName = sport.replace(/[:\\/?\*\[\]]/g, '-').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    const count = (parseInt(localStorage.getItem('lb_export_count') || '0', 10) + 1);
    localStorage.setItem('lb_export_count', count);
    const filename = 'current-' + String(count).padStart(3, '0') + '.xlsx';
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.sports && parsed.players && parsed.scores) {
          data = parsed;
          tab = data.sports[0] || null;
          history.replaceState(null, '', tab ? '#' + encodeURIComponent(tab) : '#');
          saveData(); render();
          flash('Data imported successfully!');
        } else {
          alert('Invalid file format.');
        }
      } catch { alert('Could not read file.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function flash(msg) {
  const el = document.getElementById('flash');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadData();

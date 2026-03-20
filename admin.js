/* admin.js - Painel Administrativo */
const SUPABASE_URL = 'https://ebjxikbqlbtxpzvyfnxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yVpw74x_WMk2YR-iT9hM0Q_0QGYvGbg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let pendingImages = []; // {file, preview} for new uploads
let existingImages = []; // URLs already saved
let currentFilter = 'all';

// ─── TOAST ───
function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-[#1C1917]' };
  t.className = `toast ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── AUTH ───
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email || !pass) { errEl.textContent = 'Preencha todos os campos.'; errEl.classList.remove('hidden'); return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { errEl.textContent = 'E-mail ou senha inválidos.'; errEl.classList.remove('hidden'); await logActivity('login_failed', 'auth', null, { email }); return; }
  currentUser = data.user;
  await loadProfile();
  await logActivity('login', 'auth', null, { email });
  showDashboard();
}

async function handleLogout() {
  await logActivity('logout', 'auth');
  await sb.auth.signOut();
  currentUser = null; currentProfile = null;
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
  if (data) {
    document.getElementById('user-name').textContent = data.full_name || data.email;
    document.getElementById('user-role-display').textContent = data.role;
    document.getElementById('user-avatar').textContent = (data.full_name || data.email).charAt(0).toUpperCase();
    if (data.role === 'admin') document.getElementById('btn-add-user').classList.remove('hidden');
  }
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.remove('hidden');
  document.getElementById('admin-dashboard').classList.add('flex');
  loadDashboard();
}

// ─── CHECK SESSION ON LOAD ───
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
    showDashboard();
  }
})();

// ─── SECTIONS ───
function showSection(name) {
  ['dashboard','properties','users','logs'].forEach(s => {
    document.getElementById('sec-' + s).classList.add('hidden');
  });
  document.getElementById('sec-' + name).classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === name);
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'properties') loadProperties();
  if (name === 'users') loadUsers();
  if (name === 'logs') loadLogs();
}

// ─── DASHBOARD ───
async function loadDashboard() {
  const { data: props } = await sb.from('properties').select('*');
  const all = props || [];
  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-active').textContent = all.filter(p => p.is_active).length;
  document.getElementById('stat-apts').textContent = all.filter(p => p.category === 'apartamento').length;
  document.getElementById('stat-houses').textContent = all.filter(p => p.category === 'casa').length;

  const { data: logs } = await sb.from('activity_logs').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(5);
  const el = document.getElementById('recent-logs');
  if (!logs || logs.length === 0) { el.innerHTML = '<p class="text-stone-300 italic">Nenhuma atividade registrada.</p>'; return; }
  el.innerHTML = logs.map(l => {
    const who = l.profiles?.full_name || l.profiles?.email || 'Sistema';
    const time = new Date(l.created_at).toLocaleString('pt-BR');
    return `<div class="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0"><div class="w-2 h-2 rounded-full bg-[#A18058]"></div><span><strong>${who}</strong> ${l.action} — <span class="text-stone-300">${time}</span></span></div>`;
  }).join('');
}

// ─── PROPERTIES ───
async function loadProperties() {
  let query = sb.from('properties').select('*').order('sort_order').order('created_at', { ascending: false });
  if (currentFilter !== 'all') query = query.eq('category', currentFilter);
  const { data } = await query;
  const tbody = document.getElementById('properties-table-body');
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-stone-300 italic">Nenhum imóvel cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => {
    const img = p.images && p.images.length > 0 ? p.images[0] : '';
    const statusColors = { novo: 'bg-green-50 text-green-700', usado: 'bg-amber-50 text-amber-700', aluguel: 'bg-blue-50 text-blue-700' };
    const sc = statusColors[p.status] || 'bg-stone-100 text-stone-600';
    const price = Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const canDel = currentProfile?.role === 'admin';
    return `<tr class="hover:bg-stone-50/50 transition-colors">
      <td class="px-6 py-4"><div class="flex items-center gap-4">${img ? `<img src="${img}" class="w-14 h-10 rounded-lg object-cover"/>` : '<div class="w-14 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-300"><iconify-icon icon="lucide:image" width="16"></iconify-icon></div>'}<div><div class="text-sm font-medium text-stone-900">${p.title}</div><div class="text-xs text-stone-400">${p.city}, ${p.state}</div></div></div></td>
      <td class="px-4 py-4"><span class="text-xs font-medium capitalize">${p.category}</span></td>
      <td class="px-4 py-4 text-sm font-medium text-stone-900">${price}</td>
      <td class="px-4 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc}">${p.status}</span></td>
      <td class="px-4 py-4"><div class="w-3 h-3 rounded-full ${p.is_active ? 'bg-green-400' : 'bg-stone-200'}"></div></td>
      <td class="px-6 py-4 text-right"><div class="flex items-center justify-end gap-2">
        <button onclick="editProperty('${p.id}')" class="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"><iconify-icon icon="lucide:pencil" width="15"></iconify-icon></button>
        ${canDel ? `<button onclick="deleteProperty('${p.id}','${p.title}')" class="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors"><iconify-icon icon="lucide:trash-2" width="15"></iconify-icon></button>` : ''}
      </div></td></tr>`;
  }).join('');
}

function filterProperties(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    const isActive = (cat === 'all' && b.textContent === 'Todos') || b.textContent.toLowerCase().startsWith(cat.slice(0, 4));
    b.className = isActive
      ? 'filter-btn active px-5 py-2 rounded-full text-xs font-medium bg-[#1C1917] text-white'
      : 'filter-btn px-5 py-2 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-500 hover:border-stone-400 transition-colors';
  });
  loadProperties();
}

// ─── PROPERTY MODAL ───
function openPropertyModal(data = null) {
  pendingImages = [];
  existingImages = data?.images || [];
  document.getElementById('prop-id').value = data?.id || '';
  document.getElementById('prop-title').value = data?.title || '';
  document.getElementById('prop-city').value = data?.city || 'João Pessoa';
  document.getElementById('prop-state').value = data?.state || 'PB';
  document.getElementById('prop-category').value = data?.category || 'apartamento';
  document.getElementById('prop-status').value = data?.status || 'novo';
  document.getElementById('prop-price').value = data?.price || '';
  document.getElementById('prop-bedrooms').value = data?.bedrooms ?? 2;
  document.getElementById('prop-suites').value = data?.suites ?? 1;
  document.getElementById('prop-area').value = data?.area_m2 ?? 60;
  document.getElementById('prop-description').value = data?.description || '';
  document.getElementById('prop-featured').checked = data?.is_featured || false;
  document.getElementById('prop-active').checked = data?.is_active ?? true;
  document.getElementById('modal-title').textContent = data ? 'Editar Imóvel' : 'Novo Imóvel';
  renderImagePreviews();
  document.getElementById('property-modal').classList.remove('hidden');
}

function closePropertyModal() {
  document.getElementById('property-modal').classList.add('hidden');
  pendingImages = []; existingImages = [];
}

async function editProperty(id) {
  const { data } = await sb.from('properties').select('*').eq('id', id).single();
  if (data) openPropertyModal(data);
}

async function deleteProperty(id, title) {
  if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return;
  await sb.from('properties').delete().eq('id', id);
  await logActivity('excluiu imóvel', 'property', id, { title });
  showToast('Imóvel excluído.');
  loadProperties();
  loadDashboard();
}

// ─── IMAGE HANDLING ───
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  const total = existingImages.length + pendingImages.length + files.length;
  if (total > 6) { showToast('Máximo de 6 imagens por imóvel.', 'error'); return; }
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => { pendingImages.push({ file: f, preview: ev.target.result }); renderImagePreviews(); };
    reader.readAsDataURL(f);
  });
  e.target.value = '';
}

function renderImagePreviews() {
  const c = document.getElementById('images-preview');
  let html = '';
  existingImages.forEach((url, i) => {
    html += `<div class="img-thumb aspect-[4/3] rounded-xl overflow-hidden relative">
      <img src="${url}" class="w-full h-full object-cover"/>
      <button type="button" onclick="removeExistingImage(${i})" class="remove-btn absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600">✕</button>
    </div>`;
  });
  pendingImages.forEach((img, i) => {
    html += `<div class="img-thumb aspect-[4/3] rounded-xl overflow-hidden relative border-2 border-[#A18058]/30">
      <img src="${img.preview}" class="w-full h-full object-cover"/>
      <button type="button" onclick="removePendingImage(${i})" class="remove-btn absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600">✕</button>
    </div>`;
  });
  c.innerHTML = html;
  document.getElementById('drop-zone').style.display = (existingImages.length + pendingImages.length >= 6) ? 'none' : '';
}

function removeExistingImage(i) { existingImages.splice(i, 1); renderImagePreviews(); }
function removePendingImage(i) { pendingImages.splice(i, 1); renderImagePreviews(); }

// Drag & Drop
const dz = document.getElementById('drop-zone');
if (dz) {
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const dt = e.dataTransfer;
    if (dt.files) { document.getElementById('file-input').files = dt.files; handleFileSelect({ target: { files: dt.files, value: '' } }); }
  });
}

async function uploadImages(propertyId) {
  const urls = [...existingImages];
  for (const img of pendingImages) {
    const ext = img.file.name.split('.').pop();
    const path = `${propertyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('property-images').upload(path, img.file, { upsert: true });
    if (!error) {
      const { data: urlData } = sb.storage.from('property-images').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
  }
  return urls;
}

// ─── SAVE PROPERTY ───
async function saveProperty(e) {
  e.preventDefault();
  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const id = document.getElementById('prop-id').value;
  const propData = {
    title: document.getElementById('prop-title').value,
    city: document.getElementById('prop-city').value,
    state: document.getElementById('prop-state').value,
    category: document.getElementById('prop-category').value,
    status: document.getElementById('prop-status').value,
    price: parseFloat(document.getElementById('prop-price').value) || 0,
    bedrooms: parseInt(document.getElementById('prop-bedrooms').value) || 0,
    suites: parseInt(document.getElementById('prop-suites').value) || 0,
    area_m2: parseFloat(document.getElementById('prop-area').value) || 0,
    description: document.getElementById('prop-description').value,
    is_featured: document.getElementById('prop-featured').checked,
    is_active: document.getElementById('prop-active').checked,
  };

  try {
    if (id) {
      // Upload new images then update
      const imgs = await uploadImages(id);
      propData.images = imgs;
      await sb.from('properties').update(propData).eq('id', id);
      await logActivity('editou imóvel', 'property', id, { title: propData.title });
      showToast('Imóvel atualizado com sucesso!');
    } else {
      propData.created_by = currentUser.id;
      const { data: newProp, error } = await sb.from('properties').insert(propData).select().single();
      if (error) throw error;
      // Upload images with new ID
      if (pendingImages.length > 0) {
        const imgs = await uploadImages(newProp.id);
        await sb.from('properties').update({ images: imgs }).eq('id', newProp.id);
      }
      await logActivity('cadastrou imóvel', 'property', newProp.id, { title: propData.title });
      showToast('Imóvel cadastrado com sucesso!');
    }
    closePropertyModal();
    loadProperties();
    loadDashboard();
  } catch (err) {
    showToast('Erro ao salvar: ' + err.message, 'error');
  }
  btn.disabled = false; btn.textContent = 'Salvar Imóvel';
}

// ─── USERS ───
async function loadUsers() {
  const { data } = await sb.from('profiles').select('*').order('created_at');
  const tbody = document.getElementById('users-table-body');
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-12 text-center text-stone-300 italic">Nenhum usuário.</td></tr>'; return; }
  tbody.innerHTML = data.map(u => {
    const roleBg = u.role === 'admin' ? 'bg-[#A18058]/10 text-[#A18058]' : 'bg-stone-100 text-stone-600';
    return `<tr class="hover:bg-stone-50/50 transition-colors">
      <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xs font-bold">${(u.full_name || u.email).charAt(0).toUpperCase()}</div><div><div class="text-sm font-medium text-stone-900">${u.full_name || '—'}</div><div class="text-xs text-stone-400">${u.email}</div></div></div></td>
      <td class="px-4 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBg}">${u.role}</span></td>
      <td class="px-4 py-4 text-sm text-stone-400">${new Date(u.created_at).toLocaleDateString('pt-BR')}</td></tr>`;
  }).join('');
}

function openUserModal() { document.getElementById('user-modal').classList.remove('hidden'); }
function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

async function createUser() {
  const name = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim();
  const pass = document.getElementById('new-user-password').value;
  const role = document.getElementById('new-user-role').value;
  const errEl = document.getElementById('user-error');
  errEl.classList.add('hidden');
  if (!name || !email || !pass) { errEl.textContent = 'Preencha todos os campos.'; errEl.classList.remove('hidden'); return; }
  if (pass.length < 6) { errEl.textContent = 'Senha deve ter no mínimo 6 caracteres.'; errEl.classList.remove('hidden'); return; }
  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { full_name: name, role } }
  });
  if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return; }
  await logActivity('criou usuário', 'user', null, { email, role });
  showToast('Usuário criado! Ele deverá confirmar o e-mail.');
  closeUserModal();
  loadUsers();
}

// ─── LOGS ───
async function loadLogs() {
  const { data } = await sb.from('activity_logs').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50);
  const tbody = document.getElementById('logs-table-body');
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-stone-300 italic">Nenhum log.</td></tr>'; return; }
  tbody.innerHTML = data.map(l => {
    const who = l.profiles?.full_name || l.profiles?.email || 'Sistema';
    const time = new Date(l.created_at).toLocaleString('pt-BR');
    const details = l.details ? JSON.stringify(l.details).slice(0, 80) : '—';
    return `<tr class="hover:bg-stone-50/50 transition-colors">
      <td class="px-6 py-3 text-sm text-stone-400">${time}</td>
      <td class="px-4 py-3 text-sm text-stone-600">${who}</td>
      <td class="px-4 py-3 text-sm font-medium text-stone-900">${l.action}</td>
      <td class="px-4 py-3 text-xs text-stone-400 max-w-xs truncate">${details}</td></tr>`;
  }).join('');
}

// ─── LOG ACTIVITY ───
async function logActivity(action, entityType, entityId = null, details = {}) {
  try {
    await sb.from('activity_logs').insert({
      user_id: currentUser?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (e) { console.warn('Log error:', e); }
}

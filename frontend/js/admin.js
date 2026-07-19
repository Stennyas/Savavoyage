const API = '/api';

let allReservations = [];
let allTrajets = [];

async function api(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function switchTab(tab) {
  ['dashboard', 'routes', 'reservations'].forEach((t) => {
    document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-links a[data-tab]').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  if (tab === 'dashboard') loadStats();
  if (tab === 'routes') loadRoutesAdmin();
  if (tab === 'reservations') loadReservations();
}

async function checkAuth() {
  try {
    const { user } = await api(`${API}/auth/me`);
    if (!user) {
      window.location.href = '/login';
      return false;
    }
    document.getElementById('adminName').textContent = user.username;
    return true;
  } catch {
    window.location.href = '/login';
    return false;
  }
}

async function logoutAdmin() {
  await api(`${API}/auth/logout`, { method: 'POST' });
  window.location.href = '/login';
}

async function loadStats() {
  const grid = document.getElementById('statsGrid');
  try {
    const stats = await api(`${API}/stats`);
    const byStatus = stats.byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s }), {});
    const confirmed = byStatus.confirmed?.count || 0;
    const pending = byStatus.pending?.count || 0;
    const cancelled = byStatus.cancelled?.count || 0;
    const revenue = (byStatus.confirmed?.revenue || 0) + (byStatus.pending?.revenue || 0);
    const occupancy = stats.totalSeats ? Math.round((stats.totals.passengers / stats.totalSeats) * 100) : 0;

    grid.innerHTML = `
      <div class="stat-card"><div class="stat-value">${stats.totals.count}</div><div class="stat-label">Réservations totales</div></div>
      <div class="stat-card"><div class="stat-value">${revenue.toLocaleString('fr-FR')} Ar</div><div class="stat-label">Revenus</div></div>
      <div class="stat-card"><div class="stat-value">${occupancy}%</div><div class="stat-label">Taux d'occupation</div></div>
      <div class="stat-card"><div class="stat-value">${stats.totals.passengers || 0}</div><div class="stat-label">Passagers transportés</div></div>
    `;

    document.getElementById('qsConfirmed').textContent = confirmed;
    document.getElementById('qsPending').textContent = pending;
    document.getElementById('qsCancelled').textContent = cancelled;
    document.getElementById('qsPassengers').textContent = stats.totals.passengers || 0;

    const statusChart = document.getElementById('statusChart');
    statusChart.innerHTML = `
      <div class="summary-item"><span class="label">Confirmées</span><span class="value">${confirmed}</span></div>
      <div class="summary-item"><span class="label">En attente</span><span class="value">${pending}</span></div>
      <div class="summary-item"><span class="label">Annulées</span><span class="value">${cancelled}</span></div>
    `;
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadRoutesAdmin() {
  const list = document.getElementById('routesList');
  try {
    allTrajets = await api(`${API}/trajets`);
    if (allTrajets.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted)">Aucun trajet.</p>';
    } else {
      list.innerHTML = '<div class="table-list">' + allTrajets
        .map(
          (t) => `
        <div class="list-row">
          <div class="row-main">
            <strong>${t.departure} → ${t.arrival}</strong>
            <span style="color:var(--text-muted)">🕘 ${t.time}</span>
            <span class="route-price">${Number(t.price).toLocaleString('fr-FR')} Ar</span>
            <span class="badge ${t.active ? 'badge-confirmed' : 'badge-cancelled'}">${t.active ? 'Actif' : 'Inactif'}</span>
          </div>
          <div class="row-actions">
            <button class="btn btn-sm btn-outline" onclick="editRoute(${t.id})">Modifier</button>
            <button class="btn btn-sm btn-outline" onclick="deleteRoute(${t.id})">Supprimer</button>
          </div>
        </div>`
        )
        .join('') + '</div>';
    }
    populateRouteFilter(allTrajets);
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function populateRouteFilter(list) {
  const filter = document.getElementById('filterRoute');
  if (!filter) return;
  filter.innerHTML = '<option value="">Tous les trajets</option>' +
    list.map((t) => `<option value="${t.id}">${t.departure} → ${t.arrival}</option>`).join('');
}

function openRouteModal() {
  document.getElementById('routeModalTitle').textContent = 'Nouveau trajet';
  document.getElementById('routeForm').reset();
  document.getElementById('routeId').value = '';
  document.getElementById('routeModal').classList.add('open');
}
function closeRouteModal() {
  document.getElementById('routeModal').classList.remove('open');
}

function editRoute(id) {
  const t = allTrajets.find((x) => x.id === id);
  if (!t) return;
  document.getElementById('routeModalTitle').textContent = 'Modifier le trajet';
  document.getElementById('routeId').value = t.id;
  document.getElementById('routeDeparture').value = t.departure;
  document.getElementById('routeArrival').value = t.arrival;
  document.getElementById('routeTime').value = t.time;
  document.getElementById('routePrice').value = t.price;
  document.getElementById('routeSeats').value = t.seats;
  document.getElementById('routeActive').value = String(t.active);
  document.getElementById('routeModal').classList.add('open');
}

async function deleteRoute(id) {
  if (!confirm('Supprimer ce trajet ?')) return;
  try {
    await api(`${API}/trajets/${id}`, { method: 'DELETE' });
    loadRoutesAdmin();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('routeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('routeId').value;
  const payload = {
    departure: document.getElementById('routeDeparture').value,
    arrival: document.getElementById('routeArrival').value,
    time: document.getElementById('routeTime').value,
    price: Number(document.getElementById('routePrice').value),
    seats: Number(document.getElementById('routeSeats').value),
    active: Number(document.getElementById('routeActive').value)
  };
  try {
    if (id) {
      await api(`${API}/trajets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api(`${API}/trajets`, { method: 'POST', body: JSON.stringify(payload) });
    }
    closeRouteModal();
    loadRoutesAdmin();
  } catch (err) {
    alert(err.message);
  }
});

async function loadReservations() {
  const list = document.getElementById('reservationsList');
  try {
    allReservations = await api(`${API}/reservations`);
    filterReservations();
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function filterReservations() {
  const search = document.getElementById('filterSearch').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const route = document.getElementById('filterRoute').value;
  const date = document.getElementById('filterDate').value;

  const filtered = allReservations.filter((r) => {
    if (search && !r.booking_number.toLowerCase().includes(search)) return false;
    if (status && r.status !== status) return false;
    if (route && String(r.route_id) !== route) return false;
    if (date && r.travel_date !== date) return false;
    return true;
  });

  const list = document.getElementById('reservationsList');
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted)">Aucune réservation.</p>';
    return;
  }
  list.innerHTML = '<div class="table-list">' + filtered
    .map(
      (r) => `
      <div class="list-row">
        <div class="row-main">
          <strong>${r.booking_number}</strong>
          <span style="color:var(--text-muted)">${r.departure || ''} → ${r.arrival || ''}</span>
          <span style="color:var(--text-muted)">📅 ${r.travel_date}</span>
          <span style="color:var(--text-muted)">👤 ${r.passenger_count}</span>
          <span class="badge badge-${r.status}">${r.status}</span>
        </div>
        <div class="row-actions">
          <button class="btn btn-sm btn-outline" onclick="openStatusModal(${r.id}, '${r.booking_number}')">Statut</button>
          <button class="btn btn-sm btn-outline" onclick="deleteReservation(${r.id})">Supprimer</button>
        </div>
      </div>`
    )
    .join('') + '</div>';
}

function openStatusModal(id, num) {
  document.getElementById('statusBookingId').value = id;
  document.getElementById('statusBookingNum').value = num;
  document.getElementById('statusModal').classList.add('open');
}
function closeStatusModal() {
  document.getElementById('statusModal').classList.remove('open');
}

async function updateStatus() {
  const id = document.getElementById('statusBookingId').value;
  const status = document.getElementById('statusNew').value;
  try {
    await api(`${API}/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    closeStatusModal();
    loadReservations();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteReservation(id) {
  if (!confirm('Supprimer cette réservation ?')) return;
  try {
    await api(`${API}/reservations/${id}`, { method: 'DELETE' });
    loadReservations();
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('.admin-page')) return;
  const ok = await checkAuth();
  if (!ok) return;
  document.querySelectorAll('.nav-links a[data-tab]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(a.dataset.tab);
    });
  });
  switchTab('dashboard');
});

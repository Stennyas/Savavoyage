const API = 'https://savavoyage.onrender.com/api';

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
  document.querySelectorAll('.navbar-nav a[data-tab]').forEach((a) => {
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
      <div class="col-md-6 col-lg-3 mb-3">
        <div class="card border rounded-4 shadow-sm h-100">
          <div class="card-body text-center">
            <div class="display-6 fw-bold" style="color:var(--primary-dark);">${stats.totals.count}</div>
            <div class="text-muted small">Réservations totales</div>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-3">
        <div class="card border rounded-4 shadow-sm h-100">
          <div class="card-body text-center">
            <div class="display-6 fw-bold" style="color:var(--primary-dark);">${revenue.toLocaleString('fr-FR')} Ar</div>
            <div class="text-muted small">Revenus</div>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-3">
        <div class="card border rounded-4 shadow-sm h-100">
          <div class="card-body text-center">
            <div class="display-6 fw-bold" style="color:var(--primary-dark);">${occupancy}%</div>
            <div class="text-muted small">Taux d'occupation</div>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-3">
        <div class="card border rounded-4 shadow-sm h-100">
          <div class="card-body text-center">
            <div class="display-6 fw-bold" style="color:var(--primary-dark);">${stats.totals.passengers || 0}</div>
            <div class="text-muted small">Passagers transportés</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('qsConfirmed').textContent = confirmed;
    document.getElementById('qsPending').textContent = pending;
    document.getElementById('qsCancelled').textContent = cancelled;
    document.getElementById('qsPassengers').textContent = stats.totals.passengers || 0;

    const statusChart = document.getElementById('statusChart');
    statusChart.innerHTML = `
      <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
        <span class="text-muted">Confirmées</span>
        <span class="fw-medium">${confirmed}</span>
      </div>
      <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
        <span class="text-muted">En attente</span>
        <span class="fw-medium">${pending}</span>
      </div>
      <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
        <span class="text-muted">Annulées</span>
        <span class="fw-medium">${cancelled}</span>
      </div>
    `;
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-danger py-2 px-3">${err.message}</div>`;
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
            <button class="btn btn-sm btn-outline-secondary" onclick="editRoute(${t.id})">Modifier</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="deleteRoute(${t.id})">Supprimer</button>
          </div>
        </div>`
        )
        .join('') + '</div>';
    }
    populateRouteFilter(allTrajets);
  } catch (err) {
    list.innerHTML = `<div class="alert alert-danger py-2 px-3">${err.message}</div>`;
  }
}

function populateRouteFilter(list) {
  const filter = document.getElementById('filterRoute');
  if (!filter) return;
  filter.innerHTML = '<option value="">Tous les trajets</option>' +
    list.map((t) => `<option value="${t.id}">${t.departure} → ${t.arrival}</option>`).join('');
}

function openRouteModal() {
  document.getElementById('routeModalLabel').textContent = 'Nouveau trajet';
  document.getElementById('routeForm').reset();
  document.getElementById('routeId').value = '';
  const modal = new bootstrap.Modal(document.getElementById('routeModal'));
  modal.show();
}
function closeRouteModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('routeModal'));
  if (modal) modal.hide();
}

function editRoute(id) {
  const t = allTrajets.find((x) => x.id === id);
  if (!t) return;
  document.getElementById('routeModalLabel').textContent = 'Modifier le trajet';
  document.getElementById('routeId').value = t.id;
  document.getElementById('routeDeparture').value = t.departure;
  document.getElementById('routeArrival').value = t.arrival;
  document.getElementById('routeTime').value = t.time;
  document.getElementById('routePrice').value = t.price;
  document.getElementById('routeSeats').value = t.seats;
  document.getElementById('routeActive').value = String(t.active);
  const modal = new bootstrap.Modal(document.getElementById('routeModal'));
  modal.show();
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
    list.innerHTML = `<div class="alert alert-danger py-2 px-3">${err.message}</div>`;
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
          ${r.contact_phone ? `<span style="color:var(--text-muted); font-size:0.85rem;">📞 ${r.contact_phone}</span>` : ''}
        </div>
        <div class="row-actions">
          <button class="btn btn-sm btn-outline-secondary" onclick="viewReservation(${r.id})">Détails</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="openStatusModal(${r.id}, '${r.booking_number}')">Statut</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="deleteReservation(${r.id})">Supprimer</button>
        </div>
      </div>`
    )
    .join('') + '</div>';
}

function openStatusModal(id, num) {
  document.getElementById('statusBookingId').value = id;
  document.getElementById('statusBookingNum').value = num;
  const modal = new bootstrap.Modal(document.getElementById('statusModal'));
  modal.show();
}
function closeStatusModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
  if (modal) modal.hide();
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

function closeDetailModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
  if (modal) modal.hide();
}

async function viewReservation(id) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  content.innerHTML = '<div class="text-center py-4 text-muted"><div class="spinner-border text-primary mb-3" role="status"><span class="visually-hidden">Chargement...</span></div><p>Chargement...</p></div>';

  try {
    const r = await api(`${API}/reservations/${id}`);
    const trajet = allTrajets.find(t => t.id === r.route_id);
    content.innerHTML = `
      <div class="d-flex flex-column" style="gap:16px;">
        <div class="row g-3">
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Réservation</span>
              <span class="fw-medium"><strong>${r.booking_number}</strong></span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Statut</span>
              <span class="badge badge-${r.status}">${r.status}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Trajet</span>
              <span class="fw-medium">${trajet ? trajet.departure + ' → ' + trajet.arrival : '—'}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Date</span>
              <span class="fw-medium">${r.travel_date}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Passagers</span>
              <span class="fw-medium">${r.passenger_count}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Montant</span>
              <span class="fw-medium">${Number(r.total_amount).toLocaleString('fr-FR')} Ar</span>
            </div>
          </div>
        </div>

        <hr class="my-1" style="border:none;border-top:1px solid var(--border);">

        <h6 class="fw-semibold">&#x1F4DE; Contact client</h6>
        <div class="row g-3">
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Nom</span>
              <span class="fw-medium">${r.contact_name || '—'}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Téléphone</span>
              <span class="fw-medium">${r.contact_phone || '—'}</span>
            </div>
          </div>
        </div>

        <hr class="my-1" style="border:none;border-top:1px solid var(--border);">

        <h6 class="fw-semibold">&#x1F465; Passagers</h6>
        <div style="white-space:pre-wrap; font-size:0.9rem; color:var(--text);">${r.passengers || 'Aucune information'}</div>

        <hr class="my-1" style="border:none;border-top:1px solid var(--border);">

        <div class="row g-3">
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Sièges</span>
              <span class="fw-medium">${r.selected_seats || '—'}</span>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex justify-content-between py-2 border-bottom border-dashed">
              <span class="text-muted small">Créée le</span>
              <span class="fw-medium">${r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger py-2 px-3">${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('tabDashboard')) return;
  const ok = await checkAuth();
  if (!ok) return;
  document.querySelectorAll('.navbar-nav a[data-tab]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(a.dataset.tab);
    });
  });
  switchTab('dashboard');
});

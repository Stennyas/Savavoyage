const API = 'https://savavoyage.onrender.com/api';

let trajets = [];
let selectedRoute = null;
let selectedSeats = [];
let occupiedSeats = [];
const SEATS_PER_ROW = 4;
const ROWS = 6;
const TOTAL_SEATS = SEATS_PER_ROW * ROWS;

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

function initHome() {
  if (!document.getElementById('routesGrid')) return;
  loadTrajets();
  setupBooking();
}

async function loadTrajets() {
  try {
    trajets = await api(`${API}/trajets`);
    renderRoutes(trajets);
    populateRouteSelect(trajets);
  } catch (err) {
    console.error(err);
  }
}

function renderRoutes(list) {
  const grid = document.getElementById('routesGrid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="col-12"><p class="text-muted text-center mb-0">Aucun trajet disponible.</p></div>';
    return;
  }
  grid.innerHTML = list
    .map(
      (t) => `
      <div class="col-md-4">
        <div class="route-card ${t.active ? '' : 'inactive'}">
          <div class="route-head">
            <span>${t.departure}</span>
            <span class="route-arrow">→</span>
            <span>${t.arrival}</span>
          </div>
          <div class="route-meta">
            <span>🕘 ${t.time}</span>
            <span class="route-price">${Number(t.price).toLocaleString('fr-FR')} Ar</span>
          </div>
        </div>
      </div>`
    )
    .join('');
}

function populateRouteSelect(list) {
  const select = document.getElementById('routeSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Choisir un trajet...</option>' +
    list
      .filter((t) => t.active)
      .map((t) => `<option value="${t.id}" data-price="${t.price}">${t.departure} → ${t.arrival} (${t.time})</option>`)
      .join('');
}

function setupBooking() {
  const routeSelect = document.getElementById('routeSelect');
  const passengerCount = document.getElementById('passengerCount');
  const travelDate = document.getElementById('travelDate');

  if (!routeSelect) return;

  routeSelect.addEventListener('change', onRouteChange);
  passengerCount.addEventListener('change', () => updateSeatsNeeded());
  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.addEventListener('click', confirmBooking);

  if (travelDate) {
    travelDate.min = new Date().toISOString().split('T')[0];
    travelDate.addEventListener('change', refreshOccupiedSeats);
  }
  renderSeatMap();
}

async function refreshOccupiedSeats() {
  if (!selectedRoute || !document.getElementById('travelDate').value) {
    occupiedSeats = [];
    renderSeatMap();
    return;
  }
  try {
    const date = document.getElementById('travelDate').value;
    occupiedSeats = await api(`${API}/reservations/occupied?route_id=${selectedRoute.id}&date=${date}`);
    selectedSeats = selectedSeats.filter((s) => !occupiedSeats.includes(s));
    renderSeatMap();
    updateSummary();
  } catch (err) {
    console.error(err);
  }
}

function onRouteChange() {
  const select = document.getElementById('routeSelect');
  const id = select.value;
  selectedRoute = trajets.find((t) => String(t.id) === id) || null;
  selectedSeats = [];
  refreshOccupiedSeats();
  updateSummary();
}

function updateSeatsNeeded() {
  const count = Number(document.getElementById('passengerCount').value);
  document.getElementById('seatsNeeded').textContent = count;
  selectedSeats = [];
  renderSeatMap();
  updateSummary();
}

function renderSeatMap() {
  const map = document.getElementById('seatMap');
  if (!map) return;
  const needed = Number(document.getElementById('passengerCount').value);

  let html = '<div class="bus">';
  html += '<div class="bus-driver" title="Conducteur">🧑‍✈️<span>Conducteur</span></div>';
  html += '<div class="bus-cabin">';

  for (let row = 0; row < ROWS; row++) {
    const base = row * SEATS_PER_ROW + 1;
    const seats = [base, base + 1, base + 2, base + 3];
    html += '<div class="bus-row">';
    html += `<span class="row-label">${row + 1}</span>`;
    html += seatEl(seats[0], needed);
    html += seatEl(seats[1], needed);
    html += '<span class="aisle"></span>';
    html += seatEl(seats[2], needed);
    html += seatEl(seats[3], needed);
    html += '</div>';
  }

  html += '</div></div>';

  map.innerHTML = html;
  map.querySelectorAll('.seat').forEach((seat) => {
    if (seat.classList.contains('occupied')) return;
    seat.addEventListener('click', () => {
      const num = Number(seat.dataset.seat);
      if (selectedSeats.includes(num)) {
        selectedSeats = selectedSeats.filter((s) => s !== num);
      } else {
        if (selectedSeats.length >= needed) {
          alert(`Vous ne pouvez sélectionner que ${needed} siège(s).`);
          return;
        }
        selectedSeats.push(num);
      }
      renderSeatMap();
      updateSummary();
    });
  });
}

function seatEl(num, needed) {
  let cls = 'seat available';
  if (occupiedSeats.includes(num)) cls = 'seat occupied';
  else if (selectedSeats.includes(num)) cls = 'seat selected';
  return `<div class="${cls}" data-seat="${num}">${num}</div>`;
}

function updateSummary() {
  const count = Number(document.getElementById('passengerCount').value);
  const price = selectedRoute ? Number(selectedRoute.price) : 0;
  document.getElementById('summaryRoute').textContent = selectedRoute
    ? `${selectedRoute.departure} → ${selectedRoute.arrival} (${selectedRoute.time})`
    : '—';
  const date = document.getElementById('travelDate').value;
  document.getElementById('summaryDate').textContent = date || '—';
  document.getElementById('summaryPassengers').textContent = count;
  document.getElementById('summarySeats').textContent = selectedSeats.length ? selectedSeats.join(', ') : '—';
  document.getElementById('summaryPrice').textContent = price ? `${price.toLocaleString('fr-FR')} Ar` : '—';
  document.getElementById('summaryTotal').textContent = `${price * count} Ar`;
}

async function confirmBooking() {
  if (!selectedRoute) return alert('Veuillez choisir un trajet.');
  const travelDate = document.getElementById('travelDate').value;
  if (!travelDate) return alert('Veuillez choisir une date.');
  const count = Number(document.getElementById('passengerCount').value);
  if (selectedSeats.length !== count) return alert(`Sélectionnez ${count} siège(s).`);
  const passengerInfo = document.getElementById('passengerInfo').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactPhone = document.getElementById('contactPhone').value.trim();

  if (!contactName) return alert('Veuillez saisir le nom du contact.');
  if (!contactPhone) return alert('Veuillez saisir le numéro de téléphone du contact.');

  try {
    const res = await api(`${API}/reservations`, {
      method: 'POST',
      body: JSON.stringify({
        route_id: selectedRoute.id,
        travel_date: travelDate,
        passenger_count: count,
        passengers: passengerInfo,
        selected_seats: selectedSeats.join(','),
        total_amount: Number(selectedRoute.price) * count,
        contact_name: contactName,
        contact_phone: contactPhone,
      })
    });
    document.getElementById('bookingNumber').textContent = res.booking_number;
    openModal();
    resetBooking();
  } catch (err) {
    alert(err.message);
  }
}

function resetBooking() {
  document.getElementById('routeSelect').value = '';
  document.getElementById('travelDate').value = '';
  document.getElementById('passengerInfo').value = '';
  document.getElementById('contactName').value = '';
  document.getElementById('contactPhone').value = '';
  document.getElementById('passengerCount').value = '1';
  selectedRoute = null;
  selectedSeats = [];
  renderSeatMap();
  updateSummary();
}

function openModal() {
  const modalEl = document.getElementById('confirmModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}
function closeModal() {
  const modalEl = document.getElementById('confirmModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
}

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('loginAlert');
    alertBox.innerHTML = '';
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    try {
      const res = await api(`${API}/login`, {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('username').value,
          password: document.getElementById('password').value
        })
      });
      window.location.href = '/admin';
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-danger py-2 px-3">${err.message}</div>`;
      btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHome();
  initLogin();
});

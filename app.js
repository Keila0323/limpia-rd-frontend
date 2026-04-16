/* =============================================
   LIMPIA RD — Frontend App
   Connects to: https://limpia-rd.onrender.com
   ============================================= */

const API = 'https://limpia-rd.onrender.com';

/* --- MOBILE MENU --- */
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

menuToggle?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  mobileMenu.setAttribute('aria-hidden', !isOpen);
  menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
});

// Close on link click
mobileMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

/* --- HERO STATS --- */
async function loadStats() {
  try {
    const [cleaners, requests] = await Promise.allSettled([
      fetch(`${API}/cleaners/`).then(r => r.json()),
      fetch(`${API}/requests/`).then(r => r.json()),
    ]);

    const cleanerCount = cleaners.status === 'fulfilled' && Array.isArray(cleaners.value)
      ? cleaners.value.length : '—';
    const requestCount = requests.status === 'fulfilled' && Array.isArray(requests.value)
      ? requests.value.length : '—';

    animateCount('statCleaners', cleanerCount);
    animateCount('statRequests', requestCount);
  } catch (e) {
    // silent — stats just show dash
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el || target === '—') { el && (el.textContent = target); return; }
  const n = parseInt(target);
  if (isNaN(n)) { el.textContent = target; return; }
  const duration = 800;
  const start = performance.now();
  requestAnimationFrame(function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * n);
    if (progress < 1) requestAnimationFrame(tick);
  });
}

/* --- CLEANERS DIRECTORY --- */
let allCleaners = [];

async function loadCleaners(filters = {}) {
  const grid = document.getElementById('cleanersGrid');
  const empty = document.getElementById('cleanersEmpty');

  // Show skeleton
  grid.innerHTML = `
    <div class="skeleton-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>`;
  empty.classList.add('hidden');

  try {
    const params = new URLSearchParams();
    if (filters.city)       params.set('city', filters.city);
    if (filters.service)    params.set('service_type', filters.service);
    if (filters.language)   params.set('language', filters.language);
    if (filters.min_rating) params.set('min_rating', filters.min_rating);

    const url = `${API}/cleaners/${params.toString() ? '?' + params : ''}`;
    const data = await fetch(url).then(r => r.json());
    allCleaners = Array.isArray(data) ? data : [];
  } catch (e) {
    allCleaners = getMockCleaners();
  }

  renderCleaners(allCleaners, grid, empty);
}

function renderCleaners(cleaners, grid, empty) {
  if (!cleaners.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = cleaners.map(c => cleanerCard(c)).join('');
}

function cleanerCard(c) {
  const initials = c.full_name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const rating   = c.average_rating ? c.average_rating.toFixed(1) : 'Nuevo';
  const rate     = c.hourly_rate ? `$${c.hourly_rate}/hr` : c.flat_rate ? `$${c.flat_rate} fijo` : 'A consultar';
  const services = (c.services_offered || []).slice(0, 3).map(s =>
    `<span class="service-tag">${escHtml(s)}</span>`).join('');
  const langs    = (c.languages || []).map(l =>
    `<span class="lang-badge">${escHtml(l.toUpperCase())}</span>`).join('');
  const exp      = c.years_experience ? `${c.years_experience} año${c.years_experience !== 1 ? 's' : ''} de exp.` : '';

  return `
  <article class="cleaner-card" tabindex="0" aria-label="Perfil de ${escHtml(c.full_name)}">
    <div class="cleaner-header">
      <div style="display:flex;align-items:flex-start;gap:var(--space-3)">
        <div class="cleaner-avatar" aria-hidden="true">${escHtml(initials)}</div>
        <div>
          <div class="cleaner-name">${escHtml(c.full_name)}</div>
          ${exp ? `<div class="cleaner-exp">${escHtml(exp)}</div>` : ''}
        </div>
      </div>
      <div class="cleaner-rating" aria-label="Calificación ${rating}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        ${rating}
      </div>
    </div>
    ${services ? `<div class="cleaner-services" aria-label="Servicios">${services}</div>` : ''}
    <div class="cleaner-footer">
      <div class="cleaner-rate"><strong>${escHtml(rate)}</strong></div>
      <div class="cleaner-languages" aria-label="Idiomas">${langs}</div>
    </div>
  </article>`;
}

/* --- FILTERS --- */
document.getElementById('applyFilters')?.addEventListener('click', () => {
  const city      = document.getElementById('filterCity').value.trim();
  const service   = document.getElementById('filterService').value;
  const language  = document.getElementById('filterLang').value;
  const rating    = document.getElementById('filterRating').value;
  loadCleaners({ city, service, language, min_rating: rating });
});

document.getElementById('resetFilters')?.addEventListener('click', () => {
  document.getElementById('filterCity').value = '';
  document.getElementById('filterService').value = '';
  document.getElementById('filterLang').value = '';
  document.getElementById('filterRating').value = '';
  loadCleaners();
});

/* --- REQUEST FORM --- */
const requestForm    = document.getElementById('requestForm');
const requestSuccess = document.getElementById('requestSuccess');
const submitBtn      = document.getElementById('submitBtn');
const newRequestBtn  = document.getElementById('newRequest');

requestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const hostId       = parseInt(document.getElementById('hostId').value);
  const serviceType  = document.getElementById('serviceType').value;
  const city         = document.getElementById('locationCity').value.trim();
  const neighborhood = document.getElementById('locationNeighborhood').value.trim();
  const datetime     = document.getElementById('scheduledDate').value;
  const lang         = document.getElementById('preferredLang').value;

  // Basic validation
  if (!hostId || !serviceType || !city || !neighborhood || !datetime) {
    highlightErrors({ hostId, serviceType, city, neighborhood, datetime });
    return;
  }

  // Loading state
  submitBtn.querySelector('.btn-text').classList.add('hidden');
  submitBtn.querySelector('.btn-spinner').classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const payload = {
      host_id:                hostId,
      service_type:           serviceType,
      location_city:          city,
      location_neighborhood:  neighborhood,
      scheduled_datetime:     datetime + ':00',
      status:                 'pending',
    };

    let requestId = null;
    try {
      const res = await fetch(`${API}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        requestId = data.id;
      }
    } catch (_) { /* API unavailable — show mock success */ }

    // Fetch matches
    let matches = [];
    if (requestId) {
      try {
        const matchParams = new URLSearchParams({ top_n: 3 });
        if (lang) matchParams.set('preferred_language', lang);
        const mRes = await fetch(`${API}/requests/${requestId}/matches?${matchParams}`);
        if (mRes.ok) matches = await mRes.json();
      } catch (_) {}
    }

    // Fallback: filter allCleaners locally as proxy match
    if (!matches.length && allCleaners.length) {
      matches = allCleaners
        .filter(c =>
          (c.cities_neighborhoods || []).some(loc =>
            loc.toLowerCase().includes(city.toLowerCase())
          ) ||
          (c.services_offered || []).some(s =>
            s.toLowerCase().includes(serviceType.toLowerCase().split(' ')[0])
          )
        )
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 3)
        .map(c => ({
          cleaner_id:          c.id,
          full_name:           c.full_name,
          average_rating:      c.average_rating,
          years_experience:    c.years_experience,
          services_offered:    c.services_offered,
          cities_neighborhoods: c.cities_neighborhoods,
          languages:           c.languages,
        }));
    }

    // Show success
    requestForm.classList.add('hidden');
    requestSuccess.classList.remove('hidden');
    renderMatches(matches);

  } finally {
    submitBtn.querySelector('.btn-text').classList.remove('hidden');
    submitBtn.querySelector('.btn-spinner').classList.add('hidden');
    submitBtn.disabled = false;
  }
});

function renderMatches(matches) {
  const grid = document.getElementById('matchesGrid');
  if (!matches.length) {
    grid.innerHTML = '<p style="color:var(--color-text-muted);font-size:var(--text-sm)">No encontramos limpiadores disponibles para esa combinación. Intenta con otra ciudad o servicio.</p>';
    return;
  }
  grid.innerHTML = matches.map((m, i) => `
    <div class="match-card">
      <div class="match-rank" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
      <div class="match-info">
        <div class="match-name">${escHtml(m.full_name)}</div>
        <div class="match-meta">
          ${m.years_experience ? `${m.years_experience} años de experiencia · ` : ''}
          ${(m.services_offered || []).slice(0, 2).join(', ')}
        </div>
      </div>
      <div class="match-rating" aria-label="Calificación">
        ${m.average_rating ? m.average_rating.toFixed(1) + '★' : 'Nuevo'}
      </div>
    </div>`).join('');
}

newRequestBtn?.addEventListener('click', () => {
  requestSuccess.classList.add('hidden');
  requestForm.classList.remove('hidden');
  requestForm.reset();
  requestForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
});

function highlightErrors(fields) {
  const map = {
    hostId:       'hostId',
    serviceType:  'serviceType',
    city:         'locationCity',
    neighborhood: 'locationNeighborhood',
    datetime:     'scheduledDate',
  };
  Object.entries(fields).forEach(([key, val]) => {
    const el = document.getElementById(map[key]);
    if (el) {
      el.classList.toggle('error', !val);
      el.addEventListener('input', () => el.classList.remove('error'), { once: true });
    }
  });
}

/* --- MOCK DATA (fallback if API is cold-starting) --- */
function getMockCleaners() {
  return [
    {
      id: 1,
      full_name: 'María Rodríguez',
      bio: 'Especialista en limpieza hotelera con 8 años de experiencia en Punta Cana.',
      services_offered: ['Airbnb Cleaning', 'Hotel Cleaning', 'Deep Cleaning'],
      cities_neighborhoods: ['Punta Cana', 'Bávaro'],
      hourly_rate: 18,
      flat_rate: null,
      years_experience: 8,
      languages: ['es', 'en'],
      average_rating: 4.9,
      review_count: 47,
    },
    {
      id: 2,
      full_name: 'Carlos Méndez',
      bio: 'Proveedor de servicios de lavandería y limpieza en Santo Domingo.',
      services_offered: ['Laundry', 'Deep Cleaning'],
      cities_neighborhoods: ['Santo Domingo', 'Gazcue'],
      hourly_rate: 15,
      flat_rate: null,
      years_experience: 5,
      languages: ['es'],
      average_rating: 4.6,
      review_count: 22,
    },
    {
      id: 3,
      full_name: 'Ana Jiménez',
      bio: 'Limpieza profesional de piscinas y exteriores en la Romana y Casa de Campo.',
      services_offered: ['Pool Cleaning', 'Hotel Cleaning'],
      cities_neighborhoods: ['La Romana', 'Casa de Campo'],
      hourly_rate: null,
      flat_rate: 120,
      years_experience: 10,
      languages: ['es', 'en'],
      average_rating: 5.0,
      review_count: 61,
    },
  ];
}

/* --- UTILS --- */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --- INIT --- */
loadStats();
loadCleaners();

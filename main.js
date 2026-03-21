/* main.js - Front-end com integração Supabase */
const SUPABASE_URL = 'https://ebjxikbqlbtxpzvyfnxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yVpw74x_WMk2YR-iT9hM0Q_0QGYvGbg';

let sbClient = null;
let allProperties = [];

function getSb() {
  if (!sbClient && typeof supabase !== 'undefined') {
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return sbClient;
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

  // Scroll animations for glass nav
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) nav.classList.add('shadow-sm');
    else nav.classList.remove('shadow-sm');
  });

  // Hero Search logic
  setupHeroSearch();

  // Setup filter buttons (Section)
  setupFilters();

  // Fetch properties from Supabase
  fetchProperties();
});

function setupHeroSearch() {
  const searchBtn = document.getElementById('hero-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const type = document.getElementById('search-type').value;
      const maxPrice = Number(document.getElementById('search-price').value);
      
      renderProperties({ category: type, maxPrice: maxPrice });
      
      // Scroll to properties section
      const section = document.getElementById('imoveis');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

function setupFilters() {
  const container = document.querySelector('#imoveis .flex.items-center.gap-2');
  if (!container) return;
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => {
        b.className = 'px-6 py-2 bg-white border border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-400 rounded-full text-xs font-medium tracking-wide transition-all whitespace-nowrap';
      });
      btn.className = 'px-6 py-2 bg-[#1C1917] text-white rounded-full text-xs font-medium tracking-wide shadow-lg';
      const text = btn.textContent.trim().toLowerCase();
      let filter = 'all';
      if (text.includes('casa')) filter = 'casa';
      else if (text.includes('apartamento')) filter = 'apartamento';
      renderProperties(filter);
    });
  });
}

async function fetchProperties() {
  const client = getSb();
  if (!client) { showPlaceholderCards(); return; }

  try {
    const { data, error } = await client
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProperties = data || [];
    if (allProperties.length > 0) {
      renderProperties('all');
    } else {
      showPlaceholderCards();
    }
  } catch (e) {
    console.warn('Supabase fetch error:', e);
    showPlaceholderCards();
  }
}

function renderProperties(filters = 'all') {
  const container = document.getElementById('supabase-properties-container');
  if (!container) return;

  let props = allProperties;

  // Apply filters
  if (typeof filters === 'string') {
    if (filters !== 'all') {
      props = props.filter(p => p.category === filters);
    }
  } else {
    // Advanced filtering from hero
    if (filters.category && filters.category !== 'all') {
      props = props.filter(p => p.category === filters.category);
    }
    if (filters.maxPrice && filters.maxPrice > 0) {
      props = props.filter(p => Number(p.price) <= filters.maxPrice);
    }
    // João Pessoa is implicit as per user request to "mantendo apenas João Pessoa", 
    // but we can add a hard filter if needed:
    // props = props.filter(p => p.city.toLowerCase().includes('joão pessoa'));
  }

  if (props.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-16 text-stone-300 italic">Nenhum imóvel encontrado com estes critérios.</div>';
    return;
  }

  container.innerHTML = props.map((p, i) => {
    const img = p.images && p.images.length > 0
      ? p.images[0]
      : 'https://images.unsplash.com/photo-1613490493576-7fde63acd8?auto=format&fit=crop&w=800&q=80';

    const price = Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const statusLabels = { novo: 'Novo', usado: 'Usado', aluguel: 'Aluguel' };
    const statusLabel = statusLabels[p.status] || p.status;

    const statusStyles = {
      novo: 'bg-[#1C1917]/80 backdrop-blur-md text-white border border-white/10',
      usado: 'bg-[#FAFAF9]/95 backdrop-blur-md text-stone-900',
      aluguel: 'bg-[#A18058] backdrop-blur-md text-white'
    };
    const statusStyle = statusStyles[p.status] || statusStyles.novo;

    return `<div class="group cursor-pointer property-card opacity-0 translate-y-4 transition-all duration-700 ease-out" style="transition-delay: ${i * 100}ms">
      <div class="relative aspect-[4/3] overflow-hidden rounded-[1rem] mb-6">
        <img src="${img}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" loading="lazy"/>
        <div class="absolute inset-0 bg-gradient-to-t from-[#1C1917]/50 via-transparent to-transparent opacity-60"></div>
        <div class="absolute top-4 left-4 flex gap-2">
          <span class="px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest shadow-sm ${statusStyle}">${statusLabel}</span>
          ${p.is_featured ? '<span class="bg-[#A18058] px-3 py-1.5 rounded-sm text-[9px] font-bold text-white uppercase tracking-widest shadow-sm">Destaque</span>' : ''}
        </div>
        <div class="absolute bottom-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <div class="bg-[#1C1917] text-[#FAFAF9] px-4 py-2 rounded-full text-xs font-medium shadow-xl flex items-center gap-2">
            Ver Detalhes <iconify-icon icon="lucide:arrow-right" width="10"></iconify-icon>
          </div>
        </div>
      </div>
      <div>
        <div class="flex justify-between items-baseline mb-2">
          <h3 class="text-xl text-[#474543] serif italic">${p.title}</h3>
          <span class="text-lg font-medium text-[#474543] font-sans">${price}</span>
        </div>
        <p class="text-[#474543] text-xs uppercase tracking-widest mb-4">${p.city}, ${p.state}</p>
        <div class="flex items-center gap-6 text-[#474543] text-xs border-t border-stone-200 pt-4">
          <div class="flex items-center gap-2">
            <iconify-icon icon="lucide:bed-double" width="14"></iconify-icon> <span>${p.bedrooms} Quartos</span>
          </div>
          <div class="flex items-center gap-2">
            <iconify-icon icon="lucide:bath" width="14"></iconify-icon> <span>${p.suites} Suítes</span>
          </div>
          <div class="flex items-center gap-2">
            <iconify-icon icon="lucide:maximize" width="14"></iconify-icon> <span>${Number(p.area_m2)} m²</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Animate cards in
  requestAnimationFrame(() => {
    container.querySelectorAll('.property-card').forEach((card, index) => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 150);
    });
  });
}

function showPlaceholderCards() {
  const propertyCards = document.querySelectorAll('.property-card');
  propertyCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 200);
  });
}

/* main.js - Core functionality */
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Supabase Data Placeholder Fetching (Mock)
  async function fetchProperties() {
    // In the future, replace with real Supabase call:
    // const { data, error } = await supabase.from('properties').select('*')
    console.log("Fetching properties from Supabase...");
    
    // Example logic to handle loading states or animations
    const propertyCards = document.querySelectorAll('.property-card');
    propertyCards.forEach((card, index) => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 200);
    });
  }

  fetchProperties();

  // Scroll animations for glass nav
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
      nav.classList.add('shadow-sm');
    } else {
      nav.classList.remove('shadow-sm');
    }
  });
});

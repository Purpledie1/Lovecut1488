// Fade-in
const obs = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)));
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
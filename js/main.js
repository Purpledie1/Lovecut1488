// Intersection Observer
const obs = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)));
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// 3D Tilt Logic
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${x * 20}deg) rotateX(${y * -20}deg)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = `none`);
});
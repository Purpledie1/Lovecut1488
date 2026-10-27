let currentStep = 1;
window.goToStep = (step) => {
    document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
    document.querySelector(`.step-${step}`).style.display = 'block';
    currentStep = step;
};
function runRemoveWelcomeH1Script() {
    const welcomeH1 = document.getElementById('welcomeH1');
    setTimeout(() => {
        welcomeH1.className = 'animate__animated animate__fadeOut'
    }, 4000);
}

runRemoveWelcomeH1Script();
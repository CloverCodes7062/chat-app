function runDragVideosScript(container) {
    let isDragging = false;
    let offsetX, offsetY;

    const screenShareContainer = document.getElementById(container);

    screenShareContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - screenShareContainer.getBoundingClientRect().left;
        offsetY = e.clientY - screenShareContainer.getBoundingClientRect().top;
        screenShareContainer.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;

        screenShareContainer.style.left = `${x}px`;
        screenShareContainer.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        screenShareContainer.style.cursor = 'grab';
    });
}

runDragVideosScript(container);
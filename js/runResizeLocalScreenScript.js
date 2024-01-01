function runResizeLocalScreenScript() {
    const resizeLocalScreenBtn = document.getElementById('resize-localScreen-btn');
    const localScreenContainer = document.getElementById('localScreenContainer');
    const localScreen = document.getElementById('localScreen');

    resizeLocalScreenBtn.className = 'misc-btns';

    const startingWidth = `${281.469 * 2}`;
    const startingHeight = `${197.31 * 2}`;

    localScreenContainer.style.width = startingWidth + 'px';
    localScreenContainer.style.height = startingHeight + 'px';

    resizeLocalScreenBtn.addEventListener('click', (e) => {
        e.preventDefault();

        if (localScreen.style.display != 'none') {
            console.log('srcObject Found');
            const computedStyle = window.getComputedStyle(localScreenContainer);
            let currentWidth = parseFloat(computedStyle.width);
            let currentHeight = parseFloat(computedStyle.height);

            const currentBtnText = resizeLocalScreenBtn.textContent;
            console.log('currentBtnText', currentBtnText);

            if (currentBtnText == 'Current Size | Small') {
                currentWidth *= 2;
                currentHeight *= 2;
            
                localScreenContainer.style.width = `${currentWidth}px`;
                localScreenContainer.style.height = `${currentHeight}px`;

                resizeLocalScreenBtn.textContent = 'Current Size | Medium';

            } else if (currentBtnText == 'Current Size | Medium') {
                currentWidth *= 1.25;
                currentHeight *= 1.25;
            
                localScreenContainer.style.width = `${currentWidth}px`;
                localScreenContainer.style.height = `${currentHeight}px`;

                resizeLocalScreenBtn.textContent = 'Current Size | Large';

            } else if (currentBtnText == 'Current Size | Large') {

                currentWidth = startingWidth;
                currentHeight = startingHeight;
                
                console.log(currentWidth, currentHeight);
                localScreenContainer.style.width = `${currentWidth}px`;
                localScreenContainer.style.height = `${currentHeight}px`;

                resizeLocalScreenBtn.textContent = 'Current Size | Small';
            }
        } else {
            console.log('srcObject Not Found');
        }

    });
}

runResizeLocalScreenScript();
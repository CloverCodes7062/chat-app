function runSetLocalScreenWidthHeightScript() {
    const leftSections = document.getElementsByClassName('left-section');
    const leftSection = leftSections[0];
    const rect = leftSection.getBoundingClientRect();

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const localScreenContainer = document.getElementById('localScreenContainer');
    localScreenContainer.style.width = `${containerWidth}px`;
    localScreenContainer.style.height = `auto`;
}

runSetLocalScreenWidthHeightScript();
function runObserveReceivedMsgList() {
    const messagesContainer = document.getElementById('messages-container');

    const observer = new MutationObserver(() => {
        const receievedMsgList = document.getElementById('receivedMsgList');

        if (receievedMsgList) {
            console.log('observer found mutation in messages-container, correcting receivedMsgList margin-top', receievedMsgList);
            receievedMsgList.style.marginTop = `${90 * (receievedMsgList.childElementCount / 2)}px`;
        }
    });

    const config = { childList: true };

    observer.observe(messagesContainer, config);
}

runObserveReceivedMsgList();
function runObserveRemoteVideosContainer() {
    const remoteVideosContainer = document.getElementById('remoteVideosContainer');

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                console.log('A child node has been added/removed');
                const remoteVideosContainer = document.getElementsByClassName('remoteVideoContainer');

                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        const videoToMakeDraggable = remoteVideosContainer[remoteVideosContainer.length - 1];
                        const videoToMakeDraggableId = videoToMakeDraggable.id;
                    
                        runDragVideosScript(videoToMakeDraggableId);
                    });    
                }

                if (mutation.removedNodes.length > 0) {
                    const removedNodeId = parseInt(mutation.removedNodes[0].id.match(/\d+/)[0]);

                    for (const remoteVideoContainer of remoteVideosContainer) {
                        let idNumber = parseInt(remoteVideoContainer.id.match(/\d+/)[0]);

                        if (idNumber >= removedNodeId) {
                            const remoteVideoContainerBtn = document.getElementById(`remoteVideo-${idNumber}-btn`);

                            idNumber -= mutation.removedNodes.length;

                            remoteVideoContainer.id = `remoteVideo-${idNumber}`;
                            remoteVideoContainerBtn.id = `remoteVideo-${idNumber}-resizeBtn`;
                        }
                    }
                }
            }
        }
    });
    const config = { childList: true };

    observer.observe(remoteVideosContainer, config);
}

runObserveRemoteVideosContainer();
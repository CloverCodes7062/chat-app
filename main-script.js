function mainScript() {
    function formatDate(sentOn) {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        };
    
        const formattedDate = new Date(sentOn).toLocaleString(undefined, options);
        return formattedDate;
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        const sendMsgForm = document.getElementById('preventDefault-POST');
        const deleteMsgForms = document.getElementsByClassName('preventDefault-DELETE');
    
        sendMsgForm.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const messageInput = document.getElementById('message');
            const message = messageInput.value;
            console.log('Message to Send', message);
    
            axios.post('/', { message: message })
                .then(() => {
                    console.log('Message Successfully Sent To Backend');
                    messageInput.value = '';
                })
                .catch((error) => console.log('Erroring Sending Message', error));
        });
    
        for (let deleteMsgForm of deleteMsgForms) {
            deleteMsgForm.addEventListener('submit', async (event) => {
                event.preventDefault();
    
                const delUrl = deleteMsgForm.action;
                console.log('delUrl', delUrl);
    
                axios.delete(delUrl)
                    .then(() => {
                        console.log('Message Deleted from DB');
                    })
                    .catch((error) => {
                        console.error('Server Error Delete Message', error);
                    });
            });
        }
    
    });
    
    let screenStream;
    let peerId;
    let remotePeerId;
    let remotePeerIds = [];
    const socket = io();
    
    let peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('My peer Id is: ' + id);
        peerId = id;
        console.log('Sending peerId to other peers (peer.on(open))');
        socket.emit('broadcastPeerId', peerId);
    });
    
    socket.on('receivePeerId', (receivedPeerId) => {
        console.log('Received peer Id: ' + receivedPeerId);
        remotePeerId = receivedPeerId;
        
        if (!(remotePeerId in remotePeerIds)) {
            console.log('Adding PeerId to remotePeerIds: STATE OF remotePeerIds, ', remotePeerIds);
            remotePeerIds.push(remotePeerId);
        }
    
        console.log(`Sending Back PeerId ${peerId} to remotePeerId ${remotePeerId}`);
        socket.emit('sendBackPeerId', peerId);
    });
    
    socket.on('recieveSentBackPeerId', (receivedPeerId) => {
        console.log('Received sentBackPeerId', receivedPeerId);
        remotePeerId = receivedPeerId;
    
        if (!(remotePeerId in remotePeerIds)) {
            console.log('Adding PeerId to remotePeerIds: STATE OF remotePeerIds, ', remotePeerIds);
            remotePeerIds.push(remotePeerId);
        }
    });
    
    socket.on('newMessage', async (message) => {
        console.log('New Message Event Triggered');
    
        const messagesList = document.getElementById('messagesList');
        const listItem = document.createElement('div');
    
        const formattedDate = formatDate(message.sentOn);
    
        listItem.innerHTML = `
            <li>Sent by ${message.name} on ${formattedDate}</li>
            <li>${message.message}</li>
        `;
        messagesList.appendChild(listItem);
    
        const deleteForm = document.createElement('form');
        deleteForm.dataset.messageId = message._id;
        deleteForm.action = `/delete-message?id=${message._id}`;
        deleteForm.className = 'preventDefault-DELETE'
        deleteForm.innerHTML = `<button type="submit">Delete</button>`;
        deleteForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const delUrl = deleteForm.action;
            console.log('delUrl', delUrl);
    
            axios.delete(delUrl)
                .then(() => {
                    console.log('Message Deleted from DB');
                })
                .catch((error) => {
                    console.error('Server Error Delete Message', error);
                });
        });
        listItem.appendChild(deleteForm);
    });
    
    socket.on('resetChatMessages', async (messages) => {
        const messagesContainer = document.getElementById('messages-container');
        const formPreventDefaultPOST = document.getElementById('preventDefault-POST');

        const messagesList = document.createElement('ul');
        messagesList.id = 'messagesList';
        messagesList.innerHTML = '';

        messages.forEach((message) => {
            console.log('message', message);
            const formattedDate = formatDate(message.sentOn);
            const listItem = document.createElement('div');
    
            listItem.innerHTML = `
                <li>Sent by ${message.name} on ${formattedDate}</li>
                <li>${message.message}</li>
            `;
            messagesList.appendChild(listItem);
    
            axios.get(`/canDelete?id=${message.id}`)
                .then((response) => {
                    if (response.status == 204) {
                        const deleteForm = document.createElement('form');
                        deleteForm.dataset.messageId = message.id;
                        deleteForm.action = `/delete-message?id=${message.id}`;
                        deleteForm.className = 'preventDefault-DELETE'
                        deleteForm.innerHTML = `<button type="submit">Delete</button>`;
                        deleteForm.addEventListener('submit', (event) => {
                            event.preventDefault();
                            const delUrl = deleteForm.action;
                            console.log('delUrl', delUrl);
    
                            axios.delete(delUrl)
                                .then(() => {
                                    console.log('Message Deleted from DB');
                                })
                                .catch((error) => {
                                    console.error('Server Error Delete Message', error);
                                });
                        });
                        listItem.appendChild(deleteForm);
                    } else {
                        console.error('.status not 204', response.status);
                    }
                })
                .catch((error) => {
                    console.error('Error Checking canDelete', error);
                })
        });

        const oldMessagesList = document.getElementById('messagesList');

        if (oldMessagesList) {
            console.log('oldMessagesList', oldMessagesList);
            oldMessagesList.remove();
        }

        messagesContainer.insertBefore(messagesList, formPreventDefaultPOST);
    });
    
    socket.on('receiveStopRemoteStream', (streamIdToStop) => {
    
        console.log('receiveStopRemoteStream', streamIdToStop);
    
        const allRemoteVideos = document.getElementsByClassName('remoteVideo');
    
        for (remoteVideo of allRemoteVideos) {
            let remoteStream = remoteVideo.srcObject;
    
            if (remoteStream.id == streamIdToStop) {
                console.log('stopping remoteStream', remoteStream);
    
                remoteStream.getTracks().forEach(track => track.stop());
        
                remoteStream = null;
    
                remoteVideo.style.display = 'none';
            }
        }
    });
    
    socket.on('deleteMessageFromDOM', (messageId) => {
        console.log('Received deleteMessageFromDOM', messageId);

        const deleteForms = document.getElementsByClassName('preventDefault-DELETE');
        console.log('deleteForms', deleteForms);

        for (let deleteForm of deleteForms) {
            const storedMessageId = deleteForm.dataset.messageId;
            console.log('storedMessageId', storedMessageId);
            if (storedMessageId == messageId) {
                console.log('Found deleteForm with messageId:', storedMessageId);

                deleteForm.parentNode.remove()
            }
        }
    });
    
    socket.emit('getNewMessages');
    
    peer.on('call', (call) => {
        console.log('Incoming Call');
        
        call.answer();
    
        call.on('stream', (stream) => {
            console.log('stream', stream);
    
            const remoteVideosContainer = document.getElementById('remoteVideosContainer');
            const remoteVideo = document.createElement('video');
            remoteVideo.className = 'remoteVideo';
            remoteVideo.autoplay = true;
            remoteVideo.muted = true;
            remoteVideo.srcObject = stream;
            remoteVideo.style.width = '60vw';
            remoteVideo.style.height = 'auto';
            remoteVideosContainer.appendChild(remoteVideo);
        });
    })
    
    document.getElementById('startScreenShare').addEventListener('click', () => {
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
                screenStream = stream;
                
                const videoTrack = screenStream.getVideoTracks()[0];
                const constraints = {
                    width: { max: 1920 },
                    height: { max: 1080 },
                }
    
                videoTrack.applyConstraints(constraints).then(() => {
                    document.getElementById('localScreen').srcObject = stream;
                    document.getElementById('localScreen').style.display = 'block';
    
                    document.getElementById('startScreenShare').style.display = 'none';
                    document.getElementById('stopScreenShare').style.display = 'block';
    
                    screenStream.getVideoTracks()[0].onended = () => {
                        stopScreenShare();
                    };
    
                    if (remotePeerIds.length > 0) {
                        shareScreen();
                    }
                })
                .catch(error => console.log('Error Applying Constraints:', error));
            })
            .catch(error => console.log('Error starting the screen share:', error));
    });
    
    document.getElementById('stopScreenShare').addEventListener('click', () => {
        stopScreenShare();
    });
    
    function stopScreenShare() {
        socket.emit('sendStopRemoteStream', screenStream.id);
        screenStream.getTracks().forEach(track => track.stop());
        
        screenStream = null;
    
        document.getElementById('startScreenShare').style.display = 'block';
        document.getElementById('stopScreenShare').style.display = 'none';
        document.getElementById('localScreen').style.display = 'none';
    }
    
    function shareScreen() {
        console.log('shareScreen Called');
    
        for (id of remotePeerIds) {
            console.log(`(shareScreen) Sending screenStream ${screenStream} to remotePeerId ${id}`);
            const call = peer.call(id, screenStream);
        }
    }
}

mainScript();
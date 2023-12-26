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

        if (screenStream) {
            const userName = userNameOfSender;

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender:  userName},
            };

            console.log(`calling receivedPeerId ${receivedPeerId} with current screenStream`);
            const call = peer.call(receivedPeerId, screenStream, callOptions);
        }
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
        console.log('message', message);
        console.log('New Message Event Triggered');
    
        const messagesList = document.getElementById('messagesList');
        const listItem = document.createElement('div');
        
        const formattedDate = formatDate(message.sentOn);
        listItem.innerHTML = `
            <li>
                <p>Sent by ${message.name} on ${formattedDate}</p>
                <p>${message.message}</p>
            </li>
        `;

        messagesList.appendChild(listItem);
        listItem.dataset.messageId = message._id;

        axios.get(`/canDelete?id=${message._id}`)
            .then((response) => {
                if (response.status == 204) {
                    listItem.className = 'chat-msg sent-msg';
                    const deleteForm = document.createElement('form');
                    deleteForm.action = `/delete-message?id=${message._id}`;
                    deleteForm.className = 'preventDefault-DELETE'
                    deleteForm.innerHTML = `<button type="submit" class="delete-msg-btn">Delete</button>`;
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
                listItem.className = 'chat-msg received-msg'
                console.error('Error Checking canDelete', error);
            })

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
                <li>
                    <p>Sent by ${message.name} on ${formattedDate}</p>
                    <p>${message.message}</p>
                </li>
            `;

            messagesList.appendChild(listItem);
            listItem.dataset.messageId = message.id;
    
            axios.get(`/canDelete?id=${message.id}`)
                .then((response) => {
                    if (response.status == 204) {
                        listItem.className = 'chat-msg sent-msg';
                        const deleteForm = document.createElement('form');
                        deleteForm.action = `/delete-message?id=${message.id}`;
                        deleteForm.className = 'preventDefault-DELETE'
                        deleteForm.innerHTML = `<button type="submit" class="delete-msg-btn">Delete</button>`;
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
                    listItem.className = 'chat-msg received-msg'
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

        const deleteCandidates = document.getElementsByClassName('chat-msg');
        console.log('deleteCandidates', deleteCandidates);

        for (let deleteCandidate of deleteCandidates) {
            const storedMessageId = deleteCandidate.dataset.messageId;
            console.log('storedMessageId', storedMessageId);
            if (storedMessageId == messageId) {
                console.log('Found deleteForm with messageId:', storedMessageId);

                deleteCandidate.remove()
            }
        }
    });

    socket.on('remotePeerDisconnected', (receivedPeerId) => {
        if (remotePeerIds.includes(receivedPeerId)) {
            console.log(`Removing receivedPeerId ${receivedPeerId} from remotePeerIds ${remotePeerIds}`);
            const index = remotePeerIds.indexOf(receivedPeerId);

            remotePeerIds.splice(index, 1);

            console.log(`Removed receivedPeerId ${receivedPeerId} from remotePeerIds ${remotePeerIds}`);
        } else {
            console.log(`receivedPeerId ${receivedPeerId} not in remotePeerIds ${remotePeerIds}`);
        }
    });
    
    socket.emit('getNewMessages');
    
    peer.on('call', (call) => {
        console.log('Incoming Call');
        console.log('Call Metadata', call.metadata);
        const callerPeerId = call.metadata.peerId;
        const callerUserName = call.metadata.userNameOfSender;
        call.answer();

        call.on('stream', (stream) => {

            console.log('caller', callerUserName);
            console.log('callerPeerId', callerPeerId);
    
            const remoteVideosContainer = document.getElementById('remoteVideosContainer');
            const remoteVideoContainer = document.createElement('div');
            remoteVideoContainer.className = 'remoteVideoContainer';
            remoteVideosContainer.appendChild(remoteVideoContainer);

            const remoteVideo = document.createElement('video');
            remoteVideo.className = 'remoteVideo';
            remoteVideo.autoplay = true;
            remoteVideo.muted = true;
            remoteVideo.srcObject = stream;
            remoteVideo.style.width = '60vw';
            remoteVideo.style.height = 'auto';
            remoteVideo.style.display = 'none';

            remoteVideoContainer.appendChild(remoteVideo);

            const remoteVideoButton = document.createElement('button');
            remoteVideoButton.textContent = `${callerUserName} is live! | View Stream`;
            remoteVideoContainer.appendChild(remoteVideoButton);

            const removeRemoteVideoButton = document.createElement('button');
            removeRemoteVideoButton.textContent = `Stop Watching ${callerUserName}'s Stream`;

            remoteVideoButton.addEventListener('click', () => {
                remoteVideo.style.display = 'block';
                remoteVideoContainer.appendChild(removeRemoteVideoButton);
                remoteVideoButton.remove();
            });

            removeRemoteVideoButton.addEventListener('click', () => {
                remoteVideo.style.display = 'none';
                remoteVideoContainer.appendChild(remoteVideoButton);
                removeRemoteVideoButton.remove();
            });

        });
    });

    window.addEventListener('beforeunload', (event) => {
        if (peerId) {
            socket.emit('peerDisconnected', peerId);
            peer.destroy();
            socket.disconnect();
        }
    });
    
    document.getElementById('startScreenShare').addEventListener('click', () => {
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
                screenStream = stream;

                const resizeLocalScreenBtn = document.getElementById('resize-localScreen-btn');
                const localScreenContainer = document.getElementById('localScreenContainer');
                resizeLocalScreenBtn.style.display = 'block';
                localScreenContainer.style.pointerEvents = 'auto';
                
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
        const resizeLocalScreenBtn = document.getElementById('resize-localScreen-btn');
        const localScreenContainer = document.getElementById('localScreenContainer');
        resizeLocalScreenBtn.style.display = 'none';
        localScreenContainer.style.pointerEvents = 'none';

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
            const userName = userNameOfSender;
            console.log('userNameOfSender', userName);

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender: userName },
            };

            console.log(`(shareScreen) Sending screenStream ${screenStream} to remotePeerId ${id}`);
            const call = peer.call(id, screenStream, callOptions);
        }
    }
}

mainScript();
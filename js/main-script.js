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

    function formatDateShort(date) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        }

        const formattedDateShort = new Date(date).toLocaleString(undefined, options);
        return formattedDateShort;
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

    let audioStream;
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

        const localAudioVisualizer = document.getElementById('localAudioVisualizer');
        const src = localAudioVisualizer.src;

        if (screenStream) {
            const userName = userNameOfSender;

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender:  userName,  senderVisualizerSrc: src },
            };

            console.log(`calling receivedPeerId ${receivedPeerId} with current screenStream`);
            const call = peer.call(receivedPeerId, screenStream, callOptions);
            
        }

        if (audioStream) {
            const userName = userNameOfSender;

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender:  userName,  senderVisualizerSrc: src },
            };

            console.log(`calling receivedPeerId ${receivedPeerId} with current audioStream`);
            const call = peer.call(receivedPeerId, audioStream, callOptions);
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
        console.log('New Message Event Triggered');

        const listItem = document.createElement('div');
        const messagesList = document.getElementById('messagesList');
        
        messagesList.appendChild(listItem);
        listItem.style.position = "relative";

        const formattedDate = formatDate(message.sentOn);
        
        const uint8Array = new Uint8Array(message.profilePicture.data.data);
        const base64String = btoa(String.fromCharCode.apply(null, uint8Array));
        const moreDetailsP = `
        <p>Sent by ${message.name}</p>
        <p>${message.sentBy}</p>
        `;
        const moreDetailsContainer = document.createElement('div');
        moreDetailsContainer.id = 'more-details-container';
        moreDetailsContainer.className = 'animate__animated animate__fadeIn'
        moreDetailsContainer.style.position = 'absolute';
        moreDetailsContainer.style.zIndex = '1000'
        moreDetailsContainer.innerHTML = moreDetailsP;

        const formattedDateShort = formatDateShort(message.sentOn);

        listItem.innerHTML = `
        <li class="msg-li">
            <p class="msg-date">${formattedDateShort}</p>
            <div class="msg-img-p-container">
                <img 
                    src="data:${message.profilePicture.contentType};base64,${base64String}"
                    width="45" 
                    height="45" 
                    style="border-radius: 50%;"
                >
                <p class="msg-body">${message.message}</p>
            </div>
        </li>
        `;

        listItem.append(moreDetailsContainer);

        listItem.addEventListener('mouseenter', () => {
            moreDetailsContainer.style.display = 'flex';
            moreDetailsContainer.style.pointerEvents = 'auto';
        });

        listItem.addEventListener('mouseleave', () => {
            moreDetailsContainer.style.display = 'none';
            moreDetailsContainer.style.pointerEvents = 'none';
        });

        listItem.dataset.messageId = message._id;

        console.log('listItemBefore', listItem);

        axios.get(`/canDelete?id=${message._id}`)
            .then((response) => {
                console.log('listItem 204', listItem)
                if (response.status == 204) {
                    listItem.className = 'chat-msg sent-msg';
                    
                    const computedStyle = getComputedStyle(listItem);
                    moreDetailsContainer.style.right = `${parseFloat(computedStyle.width) + 50}px`;
                    moreDetailsContainer.style.backgroundColor = 'rgb(51,10,105)';

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
                console.log('listItem Error', listItem);
                listItem.className = 'chat-msg received-msg';

                const computedStyle = getComputedStyle(listItem);
                moreDetailsContainer.style.left = `${parseFloat(computedStyle.width) + 50}px`;
                moreDetailsContainer.style.backgroundColor = 'rgb(155,74,206)';

                console.error('Error Checking canDelete', error);
            })
    });
    
    socket.on('resetChatMessages', async (messages) => {
        console.log('resetChatMessages called');

        const messagesContainer = document.getElementById('messages-container');
        const formPreventDefaultPOST = document.getElementById('preventDefault-POST');

        const messagesList = document.createElement('ul');
        messagesList.id = 'messagesList';
        messagesList.innerHTML = '';

        messages.forEach((message) => {
            const formattedDate = formatDate(message.sentOn);
            const listItem = document.createElement('div');
            listItem.style.position = "relative";

            const uint8Array = new Uint8Array(message.sentByPicture.data);
            const base64String = btoa(String.fromCharCode.apply(null, uint8Array));
            const moreDetailsP = `
            <p>Sent by ${message.name}</p>
            <p>${message.sentBy}</p>
            `;
            const formattedDateShort = formatDateShort(message.sentOn);

            const moreDetailsContainer = document.createElement('div');
            moreDetailsContainer.id = 'more-details-container';
            moreDetailsContainer.className = 'animate__animated animate__fadeIn'
            moreDetailsContainer.style.position = 'absolute';
            moreDetailsContainer.style.zIndex = '1000'
            moreDetailsContainer.innerHTML = moreDetailsP;

            listItem.innerHTML = `
            <li class="msg-li">
                <p class="msg-date">${formattedDateShort}</p>
                <div class="msg-img-p-container">
                    <img 
                        src="data:${message.sentByPicture.contentType};base64,${base64String}"
                        width="45" 
                        height="45" 
                        style="border-radius: 50%;"
                    >
                    <p class="msg-body">${message.message}</p>
                </div>
            </li>
            `;

            listItem.append(moreDetailsContainer);
            listItem.addEventListener('mouseenter', () => {
                moreDetailsContainer.style.display = 'flex';
                moreDetailsContainer.style.pointerEvents = 'auto';
            });

            listItem.addEventListener('mouseleave', () => {
                moreDetailsContainer.style.display = 'none';
                moreDetailsContainer.style.pointerEvents = 'none';
            });

            messagesList.appendChild(listItem);
            listItem.dataset.messageId = message.id;
            axios.get(`/canDelete?id=${message.id}`)
                .then((response) => {
                    if (response.status == 204) {
                        listItem.className = 'chat-msg sent-msg';

                        const computedStyle = getComputedStyle(listItem);
                        moreDetailsContainer.style.right = `${parseFloat(computedStyle.width) + 50}px`;
                        moreDetailsContainer.style.backgroundColor = 'rgb(51,10,105)';

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
                                    console.error('Server Error Delete Message');
                                });
                        });
                        listItem.appendChild(deleteForm);
                    } else {
                        console.error('.status not 204', response.status);
                    }
                })
                .catch((error) => {
                    listItem.className = 'chat-msg received-msg';
                    const computedStyle = getComputedStyle(listItem);
                    moreDetailsContainer.style.left = `${parseFloat(computedStyle.width) + 50}px`;
                    moreDetailsContainer.style.backgroundColor = 'rgb(155,74,206)';
                    console.error('Error Checking canDelete', error);
                })
        });

        const oldMessagesList = document.getElementById('messagesList');

        if (oldMessagesList) {
            console.log('oldMessagesList', oldMessagesList);
            oldMessagesList.remove();
        }

        messagesContainer.insertBefore(messagesList, formPreventDefaultPOST);

        console.log('messagesList', messagesList);
    });

    socket.on('receiveStopRemoteAudio', (audioIdToStop) => {
        console.log('receiveStopRemoteAudio', audioIdToStop);

        const allRemoteAudio = document.getElementsByClassName('remoteAudio');

        for (let remoteAudio of allRemoteAudio) {
            let remoteAudioStream = remoteAudio.srcObject;

            if (remoteAudioStream.id == audioIdToStop) {
                console.log('Stopping remoteAudioStream', remoteAudio);

                remoteAudioStream.getTracks().forEach(track => track.stop());
                remoteAudioStream = null;

                remoteAudio.style.display = 'none';

                const parentNode = remoteAudio.parentNode;

                parentNode.remove();
            }
        }
    })
    
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

                const parentNode = remoteVideo.parentNode;

                parentNode.remove();
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

    socket.on('receivedNewDirectMessage', (receivedNewDirectMessageObj) => {
        const sentTo = receivedNewDirectMessageObj.sentTo;
        const receivedDirectMessage = receivedNewDirectMessageObj.message;
        console.log('receivedDirectMessage', receivedDirectMessage);
        console.log('currentlyAvailableUsers', currentlyAvailableUsers);
        axios.get('/currentUserEmail')
            .then((response) => {
                if (response.data == sentTo) {
                    const receivedDirectMessageSentBy = receivedDirectMessage.sentBy;
                    console.log(receivedDirectMessageSentBy);
                    console.log('Received a direct message!');
                    console.log('currentlyAvailableUsers[receivedDirectMessageSentBy]', currentlyAvailableUsers[receivedDirectMessageSentBy]);
                    currentlyAvailableUsers[receivedDirectMessageSentBy].sentMessages.push(receivedDirectMessage);

                    const sendDirectMessageContainer = document.getElementById('sendDirectMessageContainer');

                    if (sendDirectMessageContainer) {
                        console.log('sendDirectMessageContainer', sendDirectMessageContainer);
                        const DmUl = sendDirectMessageContainer.querySelector('ul');
                        const sentMessageLi = document.createElement('li');

                        sentMessageLi.dataset.messageId = receivedDirectMessage._id;
                        sentMessageLi.innerHTML = `<p style="color: #333; font-weight: bold;">Sent To You ${receivedDirectMessage.message} | ${formatDateShort(receivedDirectMessage.sentOn)}</p>`;
                        sentMessageLi.className = 'received-direct-message';

                        DmUl.appendChild(sentMessageLi);
                    }
                }
            })
            .catch((error) => {
                console.log("error checking current user's email", error);
            })
    });

    socket.on('deleteReceivedDirectMessage', (senderAndMessageId) => {
        const sentFrom = senderAndMessageId.sentFrom;
        const messageId = senderAndMessageId.messageId;
        const indexToRemove = currentlyAvailableUsers[sentFrom].sentMessages.findIndex(message => message._id == messageId);

        currentlyAvailableUsers[sentFrom].sentMessages.splice(indexToRemove, 1);
        
        const sendDirectMessageContainer = document.getElementById('sendDirectMessageContainer');

        if (sendDirectMessageContainer) {
            console.log('sendDirectMessageContainer', sendDirectMessageContainer);
            const DmUl = sendDirectMessageContainer.querySelector('ul');

            const liToRemove = DmUl.querySelector(`li[data-message-id="${messageId}"]`);

            liToRemove.remove();
        }
    });
    
    socket.emit('getNewMessages');
    
    peer.on('call', (call) => {
        console.log('Incoming Call');
        console.log('Call Metadata', call.metadata);
        const callerPeerId = call.metadata.peerId;
        const callerUserName = call.metadata.userNameOfSender;
        const callerVisualizerSrc = call.metadata.senderVisualizerSrc;

        call.answer();

        call.on('stream', (stream) => {
            console.log('caller', callerUserName);
            console.log('callerPeerId', callerPeerId);
            
            if (stream.getVideoTracks().length > 0) {
                console.log('Video Stream Received');

                const remoteVideosContainer = document.getElementById('remoteVideosContainer');
                const remoteVideoContainer = document.createElement('div');
    
                remoteVideoContainer.dataset.placeholderWidth = `${281.469 * 2}px`;
                remoteVideoContainer.dataset.placeholderHeight = `${197.31 * 2}px`;
                remoteVideoContainer.className = 'remoteVideoContainer';
                remoteVideoContainer.style.width = `min-content`;
                remoteVideoContainer.style.height = `min-content`;
                remoteVideoContainer.style.position = 'absolute';
                remoteVideoContainer.style.zIndex = '101';
                remoteVideosContainer.appendChild(remoteVideoContainer);
                remoteVideoContainer.id = `remoteVideo-${remoteVideosContainer.childElementCount}`;
    
                const remoteVideo = document.createElement('video');
                remoteVideo.className = 'remoteVideo';
                remoteVideo.autoplay = true;
                remoteVideo.muted = true;
                remoteVideo.srcObject = stream;
                remoteVideo.style.width = '100%';
                remoteVideo.style.height = '100%';
                remoteVideo.style.display = 'none';
    
                remoteVideoContainer.appendChild(remoteVideo);
    
                const remoteVideoButton = document.createElement('button');
                remoteVideoButton.className = 'misc-btns';
                remoteVideoButton.textContent = `${callerUserName} is live! | View Stream`;
                remoteVideoContainer.appendChild(remoteVideoButton);
    
                const removeRemoteVideoButton = document.createElement('button');
                removeRemoteVideoButton.className = 'misc-btns';
                removeRemoteVideoButton.textContent = `Stop Watching ${callerUserName}'s Stream`;
                
                const resizeRemoteVideoBtn = document.createElement('button');
                resizeRemoteVideoBtn.textContent = 'Current Size | Small';
                resizeRemoteVideoBtn.id = `remoteVideo-${remoteVideosContainer.childElementCount}-resizeBtn`;
                resizeRemoteVideoBtn.style.display = 'none';
                resizeRemoteVideoBtn.style.pointerEvents = 'none';
                remoteVideoContainer.appendChild(resizeRemoteVideoBtn);
            
                remoteVideoContainer.style.width = 'min-content';
                remoteVideoContainer.style.height = 'min-content';
            
                resizeRemoteVideoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
            
                    if (remoteVideo.style.display != 'none') {
                        console.log('srcObject Found');
                        const computedStyle = window.getComputedStyle(remoteVideoContainer);
                        let currentWidth = parseFloat(computedStyle.width);
                        let currentHeight = parseFloat(computedStyle.height);
            
                        const currentBtnText = resizeRemoteVideoBtn.textContent;
            
                        if (currentBtnText == 'Current Size | Small') {
                            currentWidth *= 2;
                            currentHeight *= 2;
                        
                            remoteVideoContainer.style.width = `${currentWidth}px`;
                            remoteVideoContainer.style.height = `${currentHeight}px`;
            
                            resizeRemoteVideoBtn.textContent = 'Current Size | Medium';
            
                        } else if (currentBtnText == 'Current Size | Medium') {
                            currentWidth *= 1.25;
                            currentHeight *= 1.25;
                        
                            remoteVideoContainer.style.width = `${currentWidth}px`;
                            remoteVideoContainer.style.height = `${currentHeight}px`;
            
                            resizeRemoteVideoBtn.textContent = 'Current Size | Large';
            
                        } else if (currentBtnText == 'Current Size | Large') {
            
                            currentWidth = startingWidth;
                            currentHeight = startingHeight;
                            
                            remoteVideoContainer.style.width = `${currentWidth}px`;
                            remoteVideoContainer.style.height = `${currentHeight}px`;
            
                            resizeRemoteVideoBtn.textContent = 'Current Size | Small';
                        }
                    } else {
                        console.log('srcObject Not Found');
                    }
                });
    
                remoteVideoButton.addEventListener('click', () => {
                    remoteVideoContainer.style.width = remoteVideoContainer.dataset.placeholderWidth;
                    remoteVideoContainer.style.height = remoteVideoContainer.dataset.placeholderHeight;
    
                    remoteVideo.style.display = 'block';
                    remoteVideo.style.pointerEvents = 'auto';
                    resizeRemoteVideoBtn.style.display = 'block';
                    resizeRemoteVideoBtn.style.pointerEvents = 'auto';
    
                    remoteVideoContainer.appendChild(removeRemoteVideoButton);
                    remoteVideoButton.remove();
                });
    
                removeRemoteVideoButton.addEventListener('click', () => {
                    const computedStyle = window.getComputedStyle(remoteVideo);
                    let currentWidth = parseFloat(computedStyle.width);
                    let currentHeight = parseFloat(computedStyle.height);
    
                    remoteVideo.style.display = 'none';
                    remoteVideo.style.pointerEvents = 'none';
                    remoteVideoContainer.dataset.placeholderWidth = `${currentWidth}px`;
                    remoteVideoContainer.dataset.placeholderHeight = `${currentHeight}px`;
    
                    remoteVideoContainer.appendChild(remoteVideoButton);
    
                    remoteVideoContainer.style.width = 'min-content';
                    remoteVideoContainer.style.height = 'min-content';
    
                    const remoteVideoContainerComputedStyle = window.getComputedStyle(remoteVideoContainer);
                    const remoteVideoContainerCurrentWidth = parseFloat(remoteVideoContainerComputedStyle.width);
                    const remoteVideoContainerCurrentHeight = parseFloat(remoteVideoContainerComputedStyle.height);
    
                    remoteVideoContainer.style.top = `${remoteVideoContainer.children * 30 + remoteVideoContainerCurrentHeight}px`;
                    remoteVideoContainer.style.left = `30px`;
    
                    resizeRemoteVideoBtn.style.display = 'none';
                    resizeRemoteVideoBtn.style.pointerEvents = 'auto';
    
                    removeRemoteVideoButton.remove();
                });

            } else if (stream.getAudioTracks().length > 0) {
                console.log('Audio Stream Received');

                const remoteAudioStreamsContainer = document.getElementById('remoteAudioStreams');
                const remoteAudioStreamContainer = document.createElement('div');
                remoteAudioStreamContainer.className = 'remoteAudioStreamContainer';
                remoteAudioStreamContainer.style.position = 'absolute';

                remoteAudioStreamsContainer.appendChild(remoteAudioStreamContainer);

                const remoteAudioVisualizer = document.createElement('img');
                remoteAudioVisualizer.className = 'remoteAudioVisualizer';
                remoteAudioVisualizer.src = callerVisualizerSrc;
                remoteAudioVisualizer.width = 125;
                remoteAudioVisualizer.height = 125;
                remoteAudioVisualizer.style.borderRadius = '50%';
                remoteAudioVisualizer.style.pointerEvents = 'none';

                remoteAudioStreamContainer.appendChild(remoteAudioVisualizer);

                const remoteAudio = document.createElement('audio');
                remoteAudio.className = 'remoteAudio';
                remoteAudio.autoplay = true;
                remoteAudio.srcObject = stream;

                remoteAudioStreamContainer.appendChild(remoteAudio);

                const volumeSliderContainer = document.createElement('div');
                volumeSliderContainer.className = 'volumeSliderContainer';

                remoteAudioStreamContainer.appendChild(volumeSliderContainer);

                const volumeSlider = document.createElement('input');
                volumeSlider.className = 'volumeSlider';
                volumeSlider.type = 'number';
                volumeSlider.name = 'volumeSlider';
                volumeSlider.min = '0';
                volumeSlider.max = '1';
                volumeSlider.step = '0.05';
                volumeSlider.value = remoteAudio.volume.toFixed(2);

                const muteRemoteAudioBtn = document.createElement('button');

                muteRemoteAudioBtn.className = 'muteRemoteAudioBtn';
                muteRemoteAudioBtn.textContent = 'Mute Audio';
                muteRemoteAudioBtn.dataset.previousVolume = '0';

                muteRemoteAudioBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('muteRemoteAudioBtn CLICKED');
                    const currentBtnText = muteRemoteAudioBtn.textContent;
                    console.log('currentBtnText', currentBtnText);

                    if (currentBtnText == 'Mute Audio') {
                        const currentVolume = remoteAudio.volume;
                        remoteAudio.volume = 0;
                        muteRemoteAudioBtn.dataset.previousVolume = currentVolume;
                        muteRemoteAudioBtn.textContent = 'Unmute Audio';
                    }

                    if (currentBtnText == 'Unmute Audio') {
                        remoteAudio.volume = muteRemoteAudioBtn.dataset.previousVolume;
                        muteRemoteAudioBtn.dataset.previousVolume = '0';
                        muteRemoteAudioBtn.textContent = 'Mute Audio';
                    }
                });

                volumeSliderContainer.appendChild(muteRemoteAudioBtn);

                volumeSlider.addEventListener('input', () => {
                    remoteAudio.volume = volumeSlider.value;
                    muteRemoteAudioBtn.dataset.previousVolume = volumeSlider.value;
                });

                volumeSlider.setAttribute('inputmode', 'numeric');
                volumeSlider.setAttribute('pattern', '[0-9]*');
                volumeSlider.setAttribute('title', 'Please enter a numeric value.');

                volumeSliderContainer.appendChild(volumeSlider);

                const volumeSliderLabel = document.createElement('label');
                volumeSliderLabel.className = 'volumeSliderLabel';
                volumeSliderLabel.htmlFor = 'volumeSlider';
                volumeSliderLabel.style.color = 'white';
                volumeSliderLabel.style.textAlign = 'center';
                volumeSliderLabel.textContent = 'Volume';

                volumeSliderContainer.appendChild(volumeSliderLabel);
                let hasClicked = false;

                document.addEventListener('mousedown', () => {
                    if (hasClicked) return;
                    hasClicked = true;

                    const audioContext = new (window.AudioContext)();
                    const sourceNode = audioContext.createMediaStreamSource(remoteAudio.srcObject);
                    
                    const analyser = audioContext.createAnalyser();
                    sourceNode.connect(analyser);
    
                    analyser.fftSize = 2048;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
    
                    function isLocalAudioPlaying() {
                        analyser.getByteFrequencyData(dataArray);
                        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    
                        const threshold = 10;
    
                        return average > threshold;
                    }
    
                    setInterval(() => {
                        if (isLocalAudioPlaying()) {
                            remoteAudioVisualizer.style.border = '5px solid green';
                        } else {
                            remoteAudioVisualizer.style.border = 'none';
                        }
                    }, 100);
                });

                runMakeElementDraggableScript(remoteAudioStreamContainer);

                function runMakeElementDraggableScript(htmlElement) {
                    let isDragging = false;
                    let offsetX, offsetY;
                
                    htmlElement.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        offsetX = e.clientX - htmlElement.getBoundingClientRect().left;
                        offsetY = e.clientY - htmlElement.getBoundingClientRect().top;
                        htmlElement.style.cursor = 'grabbing';
                    });
                
                    document.addEventListener('mousemove', (e) => {
                        if (!isDragging) return;
                
                        const x = e.clientX - offsetX;
                        const y = e.clientY - offsetY;
                
                        htmlElement.style.left = `${x}px`;
                        htmlElement.style.top = `${y}px`;
                    });
                
                    document.addEventListener('mouseup', () => {
                        isDragging = false;
                        htmlElement.style.cursor = 'grab';
                    });
                }
                
            } else {
                console.log('No video or audio tracks');
            }

        });
    });

    window.addEventListener('beforeunload', (event) => {
        if (peerId) {
            socket.emit('peerDisconnected', peerId);
            peer.destroy();
            socket.disconnect();
        }
    });

    document.getElementById('startAudioCall').addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            const localAudioVisualizer = document.getElementById('localAudioVisualizer');
            const localAudioContainer = document.getElementById('localAudioContainer');
            localAudioContainer.style.display = 'block';
            localAudioContainer.style.pointerEvents = 'auto';
            document.getElementById('startAudioCall').style.display = 'none';
            document.getElementById('stopAudioCall').style.display = 'block';
            runDragVideosScript('localAudioContainer');

            audioStream = stream;
            const localAudio = document.getElementById('localAudio');
            localAudio.srcObject = audioStream;

            audioStream.getVideoTracks()[0].onended = () => {
                stopAudioCall();
            };

            if (remotePeerIds.length > 0) {
                startAudioCall();
            }

            const audioContext = new (window.AudioContext)();
            const sourceNode = audioContext.createMediaStreamSource(localAudio.srcObject);
            
            const analyser = audioContext.createAnalyser();
            sourceNode.connect(analyser);

            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function isLocalAudioPlaying() {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

                const threshold = 10;

                return average > threshold;
            }

            setInterval(() => {
                if (isLocalAudioPlaying()) {
                    localAudioVisualizer.style.border = '5px solid green';
                } else {
                    localAudioVisualizer.style.border = 'none';
                }
            }, 100);

        })
        .catch((error) => {
            console.error('Error Accessing User Audio: ', error);
        });
    });
    
    document.getElementById('startScreenShare').addEventListener('click', () => {
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
                screenStream = stream;

                const resizeLocalScreenBtn = document.getElementById('resize-localScreen-btn');
                const localScreenContainer = document.getElementById('localScreenContainer');
                const hideLocalScreenBtn = document.getElementById('hide-localScreen-btn');

                resizeLocalScreenBtn.style.display = 'block';
                hideLocalScreenBtn.style.display = 'block';
                localScreenContainer.style.pointerEvents = 'auto';

                hideLocalScreenBtn.addEventListener('click', () => {
                    localScreenContainer.style.display = 'none';
                    localScreenContainer.style.pointerEvents = 'none';
                });
                
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

    document.getElementById('stopAudioCall').addEventListener('click', () => {
        stopAudioCall();
    });

    function stopAudioCall() {
        socket.emit('sendRemoteAudioStopped', audioStream.id);
        audioStream.getTracks().forEach(track => track.stop());

        audioStream = null;

        const localAudioContainer = document.getElementById('localAudioContainer');
        document.getElementById('startAudioCall').style.display = 'block';
        document.getElementById('stopAudioCall').style.display = 'none';
        localAudioContainer.style.display = 'none';
        localAudioContainer.style.pointerEvents = 'none';
    }
    
    function stopScreenShare() {
        const resizeLocalScreenBtn = document.getElementById('resize-localScreen-btn');
        const localScreenContainer = document.getElementById('localScreenContainer');
        const hideLocalScreenBtn = document.getElementById('hide-localScreen-btn');

        resizeLocalScreenBtn.style.display = 'none';
        hideLocalScreenBtn.style.display = 'none';
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
        const localAudioVisualizer = document.getElementById('localAudioVisualizer');
        const src = localAudioVisualizer.src;

        for (id of remotePeerIds) {
            const userName = userNameOfSender;
            console.log('userNameOfSender', userName);

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender: userName, senderVisualizerSrc: src },
            };

            console.log('callOptions', callOptions);

            console.log(`(shareScreen) Sending screenStream ${screenStream} to remotePeerId ${id}`);
            const call = peer.call(id, screenStream, callOptions);
        }
    }

    function startAudioCall() {
        console.log('startAudioCall Called');
        const localAudioVisualizer = document.getElementById('localAudioVisualizer');
        const src = localAudioVisualizer.src;

        for (id of remotePeerIds) {
            const userName = userNameOfSender;
            console.log('userNameOfSender', userName);

            const callOptions = {
                metadata: { peerId: peerId, userNameOfSender: userName, senderVisualizerSrc: src },
            };

            console.log('callOptions', callOptions);

            console.log(`(shareScreen) Sending screenStream ${screenStream} to remotePeerId ${id}`);
            const call = peer.call(id, audioStream, callOptions);
        }
    }
}

mainScript();
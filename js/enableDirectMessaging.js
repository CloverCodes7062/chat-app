function enableDirectMessaging() {
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

    const directMessageContainer = document.getElementById('directMessageContainer');
    directMessageContainer.style.padding = '15px';

    const closeDirectMessagesContainerBtn = document.createElement('button');
    closeDirectMessagesContainerBtn.textContent = 'Close';
    closeDirectMessagesContainerBtn.style.position = 'absolute';
    closeDirectMessagesContainerBtn.style.top = '2px';
    closeDirectMessagesContainerBtn.style.left = '2px';
    closeDirectMessagesContainerBtn.style.borderRadius = '10px';

    closeDirectMessagesContainerBtn.addEventListener('click', (e) => {
        e.preventDefault();

        if (directMessageContainer) {
            directMessageContainer.classList.toggle('showDirectMessageContainer');
        }
    });

    directMessageContainer.appendChild(closeDirectMessagesContainerBtn);

    const openDirectMessagesContainer = document.getElementById('openDirectMessagesContainer');
    openDirectMessagesContainer.addEventListener('click', (e) => {
        e.preventDefault();

        const navList = document.querySelector('.nav-list');
        navList.classList.toggle('show');
        directMessageContainer.classList.toggle('showDirectMessageContainer');
    });

    const ul = document.createElement('ul');
    ul.style.margin = '0'
    ul.style.padding = '0';
    ul.style.listStyleType = 'none';
    ul.style.display = 'flex';
    ul.style.flexDirection = 'column';
    ul.style.alignItems = 'center';
    ul.style.justifyContent = 'center';
    ul.style.gap = '15px';

    axios.get('/availableUsers')
        .then((response) => {
            const availableUsers = response.data.data;
            availableUsers.forEach((user) => {

                currentlyAvailableUsers[user.email] = user;

                const uint8Array = new Uint8Array(user.profilePicture.data.data);
                const base64StringProfilePicture = btoa(String.fromCharCode.apply(null, uint8Array));
                
                const li = document.createElement('li');
                li.innerHTML = 
                `<p 
                style="color: #333; text-align: 
                center; font-weight: bold;">
                ${user.email}
                </p>`

                const pInsideLi = li.querySelector('p');

                pInsideLi.addEventListener('click', () => {
                    const oldSendDirectMessageContainer = document.getElementById('sendDirectMessageContainer');

                    if (oldSendDirectMessageContainer) {
                        oldSendDirectMessageContainer.remove();
                    }

                    const sendDirectMessageContainer = document.createElement('div');
                    sendDirectMessageContainer.id = 'sendDirectMessageContainer';
                    sendDirectMessageContainer.style.padding = '20px';
                    sendDirectMessageContainer.style.backgroundColor = '#fff';
                    sendDirectMessageContainer.style.borderRadius = '20px';
                    sendDirectMessageContainer.style.position = 'fixed';
                    sendDirectMessageContainer.style.zIndex = '1500';
                    sendDirectMessageContainer.style.top = '2vh';
                    sendDirectMessageContainer.style.right = '24vw';
                    sendDirectMessageContainer.style.height = '54vh'
                    sendDirectMessageContainer.style.width = '400px';
                    sendDirectMessageContainer.style.overflowY = 'auto';

                    sendDirectMessageContainer.addEventListener('mouseleave', () => {
                        sendDirectMessageContainer.className = "animate__animated animate__fadeOut";

                        setTimeout(() => {
                            sendDirectMessageContainer.remove();
                        }, 600);
                    });

                    const allMessagesUl = document.createElement('ul');
                    allMessagesUl.style.margin = '0';
                    allMessagesUl.style.padding = '0';
                    allMessagesUl.style.listStyleType = 'none';
                    allMessagesUl.style.display = 'flex';
                    allMessagesUl.style.flexDirection = 'column';
                    allMessagesUl.style.alignItems = 'center';
                    allMessagesUl.style.justifyContent = 'center';
                    allMessagesUl.style.gap = '15px';

                    currentlyAvailableUsers[user.email].receivedMessages.forEach((receivedMessage) => {
                        console.log(receivedMessage);

                        const uint8ArrayReceivedMsg = new Uint8Array(receivedMessage.profilePicture.data.data);
                        const base64StringReceivedMsg = btoa(String.fromCharCode.apply(null, uint8ArrayReceivedMsg));

                        const receivedMessageLi = document.createElement('li');
                        
                        receivedMessageLi.dataset.messageId = receivedMessage._id;
                        receivedMessageLi.innerHTML = 
                        `
                        <img
                        src="data:${receivedMessage.profilePicture.contentType};base64,${base64StringReceivedMsg}" 
                        width="50" 
                        height="50" 
                        style="border-radius: 50%; pointer-events: none;"
                        >
                        <p class="dm-p-message" style="color: #fff;">${receivedMessage.message}</p>
                        <p class="dm-p-time" style="color: #fff;">${formatDateShort(new Date(receivedMessage.sentOn))}</p>
                        `;

                        receivedMessageLi.className = 'sent-direct-message';

                        const deleteForm = document.createElement('form');
                        deleteForm.action = `/deleteDirectMessage?id=${receivedMessage._id}&sentTo=${user.email}&_method=DELETE`;
                        deleteForm.method = 'POST';

                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'Delete';
                        deleteBtn.addEventListener('click', (e) => {
                                    e.preventDefault();

                                    const indexToRemove = currentlyAvailableUsers[user.email].receivedMessages.findIndex(message => message._id == receivedMessage._id);
                                    currentlyAvailableUsers[user.email].receivedMessages.splice(indexToRemove, 1);

                                    axios.delete(`/deleteDirectMessage?id=${receivedMessage._id}&sentTo=${user.email}&_method=DELETE`)
                                        .then(() => {
                                            console.log('DELETED DIRECT MSG');
                                        })
                                        .catch((error) => {
                                            console.error(error);
                                        })
                                    
                                    receivedMessageLi.remove();
                                });
                        deleteForm.appendChild(deleteBtn);

                        receivedMessageLi.appendChild(deleteForm);

                        allMessagesUl.appendChild(receivedMessageLi);
                    });

                    currentlyAvailableUsers[user.email].sentMessages.forEach((sentMessage) => {
                        console.log(sentMessage);

                        const uint8ArraySentMsg = new Uint8Array(sentMessage.profilePicture.data.data);
                        const base64StringSentMsg = btoa(String.fromCharCode.apply(null, uint8ArraySentMsg));

                        const sentMessageLi = document.createElement('li');

                        sentMessageLi.dataset.messageId = sentMessage._id;
                        sentMessageLi.innerHTML = 
                        `
                        <img
                        src="data:${sentMessage.profilePicture.contentType};base64,${base64StringSentMsg}" 
                        width="50" 
                        height="50" 
                        style="border-radius: 50%; pointer-events: none;"
                        >
                        <p class="dm-p-message" style="color: #fff;">${sentMessage.message}</p>
                        <p class="dm-p-time" style="color: #fff;">${formatDateShort(new Date(sentMessage.sentOn))}</p>
                        `;
                        sentMessageLi.className = 'received-direct-message';

                        allMessagesUl.appendChild(sentMessageLi);
                    });

                    sendDirectMessageContainer.innerHTML =
                    `
                    <div id="DmProfilePicNameDiv">
                        <img
                            src="data:${user.profilePicture.contentType};base64,${base64StringProfilePicture}" 
                            width="50" 
                            height="50" 
                            style="border-radius: 50%; pointer-events: none;"
                        >
                        <p style="text-align: center; color: #333; font-weight: bold;">${user.name}</p>
                    </div>
                    <form action="/sendDirectMessage?sendingTo=${user.email}" method="POST" style="display: flex; flex-direction: column; gap: 10px;">
                            <div id="sendDirectMsgDiv">
                                <input name="message" type="text" placeholder="Enter a Message" required>
                                <button type="submit" style="background-color: #fff; border-radius: 10px;">
                                    <i class="bx bxs-send" style="color: #333; font-size: 24px; background-color: transparent !important; border-radius: 10px;"></i>
                                </button>
                            </div>
                    </form>`;

                    const buttonInsideForm = sendDirectMessageContainer.querySelector('button');
                    const inputInsideForm = sendDirectMessageContainer.querySelector('input');

                    buttonInsideForm.addEventListener('click', (e) => {
                        e.preventDefault();

                        axios.post(`/sendDirectMessage?sendingTo=${user.email}`, { message: inputInsideForm.value })
                            .then((res) => {
                                console.log('res.data', res.data);
                                currentlyAvailableUsers[user.email].receivedMessages.push(res.data);
                                const resMessage = res.data.message;
                                const resMessageId = res.data._id;

                                const uint8ArrayResMsg = new Uint8Array(res.data.profilePicture.data.data);
                                const base64StringResMsg = btoa(String.fromCharCode.apply(null, uint8ArrayResMsg));

                                const receivedMessageClientLi = document.createElement('li');
                                receivedMessageClientLi.dataset.messageId = resMessageId;
                                receivedMessageClientLi.innerHTML = 
                                `
                                <img
                                    src="data:${res.data.profilePicture.contentType};base64,${base64StringResMsg}" 
                                    width="50" 
                                    height="50" 
                                    style="border-radius: 50%; pointer-events: none;"
                                >
                                <p class="dm-p-message" style="color: #fff;">${resMessage}</p>
                                <p class="dm-p-time" style="color: #fff;">${formatDateShort(new Date())}</p>
                                `;

                                receivedMessageClientLi.className = 'sent-direct-message';
                                inputInsideForm.value = '';

                                const deleteForm = document.createElement('form');
                                deleteForm.action = `/deleteDirectMessage?id=${resMessageId}&sentTo=${user.email}&_method=DELETE`;
                                deleteForm.method = 'POST';

                                const deleteBtn = document.createElement('button');
                                deleteForm.appendChild(deleteBtn);

                                deleteBtn.textContent = 'Delete';
                                deleteBtn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    
                                    const indexToRemove = currentlyAvailableUsers[user.email].receivedMessages.findIndex(message => message._id == resMessageId);
                                    currentlyAvailableUsers[user.email].receivedMessages.splice(indexToRemove, 1);

                                    axios.delete(`/deleteDirectMessage?id=${resMessageId}&sentTo=${user.email}&_method=DELETE`)
                                        .then(() => {
                                            console.log('DELETED DIRECT MSG');
                                        })
                                        .catch((error) => {
                                            console.error(error);
                                        })
                                    
                                    receivedMessageClientLi.remove();
                                });

                                receivedMessageClientLi.appendChild(deleteForm);
                                allMessagesUl.appendChild(receivedMessageClientLi);
                            })
                            .catch((error) => {
                                console.log(error);
                            })
                    });

                    const formInsideSendDirectContainer = sendDirectMessageContainer.querySelector('form');


                    console.log(allMessagesUl);

                    const allLiElements = Array.from(allMessagesUl.getElementsByTagName('li'));

                    allLiElements.sort((li1, li2) => {
                        const date1 = new Date(li1.querySelector('.dm-p-time').textContent);
                        const date2 = new Date(li2.querySelector('.dm-p-time').textContent);

                        return date1 - date2;
                    });

                    allMessagesUl.innerHTML = '';

                    allLiElements.forEach(li => allMessagesUl.appendChild(li));

                    sendDirectMessageContainer.insertBefore(allMessagesUl, formInsideSendDirectContainer);

                    directMessageContainer.appendChild(sendDirectMessageContainer);
                });
                ul.append(li);
            });

        })
        .catch((err) => console.log('Error GET /availableUsers', err));

    directMessageContainer.appendChild(ul);
}

enableDirectMessaging();
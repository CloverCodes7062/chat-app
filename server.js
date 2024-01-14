import dotenv from 'dotenv';
import express, { response } from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { initialize as initializePassport } from '../chat-app/passport-config.js';
import flash from 'express-flash';
import session from 'express-session';
import methodOverride from 'method-override';
import mongoose from 'mongoose';
import http, { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const privateKey = fs.readFileSync('localhost-key.pem', 'utf8');
const certificate = fs.readFileSync('localhost.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
const server = https.createServer(credentials, app);
const io = new Server(server);

const agent = new https.Agent({
    rejectUnauthorized: false,
});

initializePassport(
    passport, 
    async (email) => await User.findOne({ email: email }),
    async (id) => await User.findOne({ _id: id })
);

mongoose.connect(process.env.MONGODB_URI);

const messageSchema = new mongoose.Schema({
    sentOn: Date,
    sentBy: String,
    name: String,
    message: String,
    profilePicture: { data: Buffer, contentType: String },
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    profilePicture: { data: Buffer, contentType: String },
    directMessages: [
        {
            email : String,
            receivedMessages: [messageSchema],
            sentMessages: [messageSchema],
        }
    ]
});

const User = mongoose.model('User', userSchema);
const Messages = mongoose.model('Messages', messageSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.set('view-engine', 'ejs');

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.get('/', checkAuthenticated, async (req, res) => {
    const user = await req.user;
    
    res.render('index.ejs', { name: user.name, profilePicture: user.profilePicture });
});

app.post('/', checkAuthenticated, async (req, res) => {
    try {
        const reqMessage = req.body.message;
        const user = await req.user;
    
        console.log('user', user.email);
    
        const message = new Messages({
            sentOn: new Date(),
            sentBy: user.email,
            name: user.name,
            message: reqMessage,
            profilePicture: user.profilePicture,
        });
    
        if (message) {
            await message.save()
                .then(() => {
                    console.log('Message Saved to DB');
                })
                .catch((e) => console.error('Error', e));    
        } else {
            console.log('No Message');
        }
        
        io.emit('newMessage', message); 

        res.status(200).json({ success: true, message: 'Message Saved To DB' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error Saving Message to DB' });
    }
});

app.post('/sendDirectMessage', async (req, res) => {
    console.log("/sendDirectMessage POST received");

    try {
        const reqMessage = req.body.message;
        const reqSendingTo = req.query.sendingTo;

        const user = await req.user;
        const mongooseUser = await User.findOne({ email: user.email });

        const message = new Messages({
            sentOn: new Date(),
            sentBy: user.email,
            name: user.name,
            message: reqMessage,
            profilePicture: user.profilePicture,
        });

        for (const directMessageUser of mongooseUser.directMessages) {
            if (directMessageUser.email == reqSendingTo) {

                directMessageUser.sentMessages.push(message);
                console.log('directMessageUser', directMessageUser);

                await mongooseUser.save();

                const sendingToUser = await User.findOne({ email: reqSendingTo });

                for (const sendingDirectMessageUser of sendingToUser.directMessages) {
                    if (sendingDirectMessageUser.email == user.email) {
                        sendingDirectMessageUser.receivedMessages.push(message);
                        console.log('sendingDirectMessageUser', sendingDirectMessageUser);

                        await sendingToUser.save();
                    }
                }
            }
        }

        res.status(200).json({ success: true, message: 'Successfully sent message to recipent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message to recipent' });
    }
});

app.get('/availableUsers', async (req, res) => {
    const user = await req.user;

    const users = await User.find().exec();
    const userEmailList = [];

    for (const currentUser of users) {
        if (currentUser.email != user.email) {
            userEmailList.push({
                profilePicture: currentUser.profilePicture,
                name: currentUser.name,
                email: currentUser.email,
                receivedMessages: currentUser.directMessages
                    .filter(sender => sender.email == user.email)
                    .map(sender => sender.receivedMessages)
                    .flat(),
                sentMessages: currentUser.directMessages
                    .filter(sender => sender.email == user.email)
                    .map(sender => sender.sentMessages)
                    .flat(),
            });    
        }
        
    }

    console.log(userEmailList);

    res.send(JSON.stringify({ data: userEmailList }));
});

app.delete('/delete-message', checkAuthenticated, async (req, res) => {
    const messageId = req.query.id;

    io.emit('deleteMessageFromDOM', messageId);

    try {
        await Messages.findByIdAndDelete(messageId);
        console.log('Message deleted from DB');
        res.status(204).send();
    } catch(error) {
        console.error('Error Deleting Message (/delete-message)', error);
        res.status(500).send();
    }
});

app.get('/canDelete', async (req, res) => {
    const user = await req.user;
    const messageId = req.query.id;

    console.log('user.email', user.email);

    const messages = await Messages.find().exec();

    for (const msg of messages) {
        if (msg.sentBy == user.email && msg.id == messageId) {
            console.log('canDelete OK return 204');
            res.status(204).send();
        }
    }

    res.status(500).send();
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: 'login',
    failureFlash: true,
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs');
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const imageResponse = await axios.get(`https://localhost:3000/generateDefaultImg?initial=${req.body.name.charAt(0)}`, {
            httpsAgent: agent,
            responseType: 'arraybuffer',
        });

        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                profilePicture: { data: imageResponse.data, contentType: 'image/jpeg'}
            });
            await user.save();
            res.redirect('/login');
        } catch (error) {
            console.error('Error creating user ', error);
            res.redirect('/register');
        }

    } catch (error) {
        console.error('Error generating defaultImg', error);
    }
});

app.delete('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});

app.get('/generateDefaultImg', (req, res) => {
    console.log('/generateDefaultImg CALLED');

    const initial = req.query.initial;

    const width = 125;
    const height = 125;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '62px Arial';
    ctx.fillStyle = 'white';

    const text = initial.toUpperCase();
    const textWidth = ctx.measureText(text).width;
    const x = (width - textWidth) / 2;
    const y = height / 2 + 20;

    ctx.fillText(text, x, y);

    const buffer = canvas.toBuffer('image/jpeg');

    res.contentType('image/jpeg');
    res.end(buffer);
});

app.get('/viewProfile', checkAuthenticated, async (req, res) => {
    const user = await req.user;

    res.render('viewProfile.ejs', { name: user.name });
});

app.post('/viewProfile', upload.single('profileImage'), async (req, res) => {
    console.log('POST to /viewProfile received');

    const user = await req.user;

    const newName = req.body.name || null;
    const newEmail = req.body.email || null;
    const newPassword = req.body.password || null;
    const newProfilePicture = req.file || null;

    let hasNameChanged = false;
    let hasEmailChanged = false;
    let hasPasswordChanged = false;
    let hasProfilePictureChanged = false;
    let newProfilePictureObj;

    if (newName != null) {
        console.log(`Name Change Detected, changing user ${user.name}'s name`);

        await User.findOneAndUpdate({ email: user.email }, { name: newName });

        hasNameChanged = true;
    }

    if (newPassword != null) {
        console.log(`Password Change Detected, changing user ${user.name}'s password `);

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await User.findOneAndUpdate({ email: user.email }, { password: hashedPassword });

        hasPasswordChanged = true;
    }

    if (newProfilePicture != null) {
        console.log(`Profile Picture Change Detected, changing user ${user.name}'s profilePicture`);

        newProfilePictureObj = { data: newProfilePicture.buffer, contentType: 'image/jpeg' };

        await User.findOneAndUpdate({ email: user.email }, { profilePicture: newProfilePictureObj });

        hasProfilePictureChanged = true;
    }

    if (newName != null && newProfilePicture == null) {
        const imageResponse = await axios.get(`https://localhost:3000/generateDefaultImg?initial=${req.body.name.charAt(0)}`, {
            httpsAgent: agent,
            responseType: 'arraybuffer',
        });

        await User.findOneAndUpdate({ email: user.email }, { profilePicture: { data: imageResponse.data, contentType: 'image/jpeg'} });

        newProfilePictureObj = { data: imageResponse.data, contentType: 'image/jpeg'};
        hasProfilePictureChanged = true;
    }

    if (newEmail != null) {
        console.log(`Email Change Detected, changing user ${user.name}'s email`);

        await User.findOneAndUpdate({ email: user.email }, { email: newEmail });

        hasEmailChanged = true;
    }

    const messages = await Messages.find().exec();

    for (const message of messages) {
        if (message.sentBy == user.email) {
            if (hasNameChanged) {
                message.name = newName;
            }

            if (hasEmailChanged) {
                message.sentBy = newEmail;
            }

            if (hasProfilePictureChanged) {
                message.profilePicture = newProfilePictureObj;
            }

            message.save();
        }
    }

    req.logOut(() => {
        res.redirect('/login');
    });
});

app.get('/testRoute', async (req, res) => {
    console.log('/testroute GET Received');

    const user = await req.user;

    const users = await User.find().exec();
    const mongooseUser = await User.findOne({ email: user.email });
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    return res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }

    next()
}

io.on('connection', (socket) => {
    console.log('A User Connected')

    socket.on('broadcastPeerId', (peerId) => {
        socket.broadcast.emit('receivePeerId', peerId);
    });

    socket.on('sendBackPeerId', (peerId) => {
        socket.broadcast.emit('recieveSentBackPeerId', peerId);
    })

    socket.on('getNewMessages', async () => {
        console.log('Get New Messages Called');
        const messages = await Messages.find().exec()
        .then(messages => messages.map(message => { 
            return { 
                sentBy: message.sentBy, sentOn: message.sentOn, message: message.message, id: message._id.toString(), name: message.name, sentByPicture: message.profilePicture 
            }
        }));
    
        io.emit('resetChatMessages', messages);
    })

    socket.on('sendStopRemoteStream', (streamId) => {
        console.log('receieved streamId', streamId);
        
        socket.broadcast.emit('receiveStopRemoteStream', streamId);
    })

    socket.on('peerDisconnected', (peerId) => {
        console.log('Peer Disconnected', peerId);
        socket.broadcast.emit('remotePeerDisconnected', peerId);
    })

    socket.on('sendRemoteAudioStopped', (audioId) => {
        console.log('received AudioId', audioId);
        
        socket.broadcast.emit('receiveStopRemoteAudio', audioId);
    })
})

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
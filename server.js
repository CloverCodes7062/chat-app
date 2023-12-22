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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

initializePassport(
    passport, 
    async (email) => await User.findOne({ email: email }),
    async (id) => await User.findOne({ _id: id })
);

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const messageSchema = new mongoose.Schema({
    sentOn: Date,
    sentBy: String,
    name: String,
    message: String,
});

const User = mongoose.model('User', userSchema);
const Messages = mongoose.model('Messages', messageSchema);

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

    res.render('index.ejs', { name: user.name });
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

    const messages = await Messages.find().exec()
    .then(messages => messages.map(message => { 
        return { sentBy: message.sentBy, sentOn: message.sentOn, message: message.message, id: message._id, name: message.name }
    }));
});

app.get('/canDelete', async (req, res) => {
    const user = await req.user;
    const messageId = req.query.id;
    console.log(user.email);

    Messages.findById(messageId)
        .then((message) => {
            console.log('message.sentBy', message.sentBy);
            if (user.email == message.sentBy) {
                console.log('canDelete OK return 204');
                res.status(204).send();
            } else {
                res.status(500).send();
            }
        })
        .catch((error) => {
            console.log('Server Error Checking if canDelete', error);
            res.status(500).send();
        });
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
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });
        await user.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Error creating user ', error);
        res.redirect('/register');
    }
});

app.delete('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) { return next(err); }
        res.redirect('/login');
    });
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
            return { sentBy: message.sentBy, sentOn: message.sentOn, message: message.message, id: message._id, name: message.name }
        }));
    
        io.emit('resetChatMessages', messages);
    })

    socket.on('sendStopRemoteStream', (streamId) => {
        console.log('receieved streamId', streamId);
        
        socket.broadcast.emit('receiveStopRemoteStream', streamId);
    })
})

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
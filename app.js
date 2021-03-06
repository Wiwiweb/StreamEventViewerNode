const http = require('http');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const twitchStrategy = require("passport-twitch").Strategy;
const socket = require('socket.io');

const globals = require('./lib/globals');
const home = require('./lib/home');
const streamer = require('./lib/streamer');
const websockets = require('./lib/websockets');

const SESSION_SECRET = process.env.SESSION_SECRET || 'DjTOYIaTRbKpnF5j6Qu715B6lhUyMRyh';

const app = express();

app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(session({secret: SESSION_SECRET}));
app.use(passport.initialize());
app.use(passport.session());

// Authentication
passport.use(new twitchStrategy({
        clientID: globals.TWITCH_CLIENT_ID,
        clientSecret: globals.TWITCH_CLIENT_SECRET,
        callbackURL: `http://${globals.HOSTNAME}/login/callback`,
        scope: "user_read"
    },
    function(accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

app.use(express.static('public'));

app.get('/', home);

app.get('/login', passport.authenticate('twitch'));

app.get('/login/callback', passport.authenticate('twitch', {
        successRedirect: '/',
        failureRedirect: '/'
    }
));

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/streamer', ensureAuthenticated, streamer);

// Twitch webhook subscription validation
app.get('/webhook/follow/:channelName', function(req, res) {
    console.log('Webhook validation');
    console.dir(req.query);
    if (req.query['hub.challenge']) {
        res.status(200).send(req.query['hub.challenge'])
    } else {
        res.sendStatus(200);
    }
});

// Twitch webhook new event
app.post('/webhook/follow/:channelName', function(req, res) {
    streamer.addEvent(req.params['channelName'], req.body, io);
    res.sendStatus(200)
});

app.use(function(req, res) {
    res.status(404).render('error', {
        message: 'Not Found'
    });
});

const server = http.createServer(app);
const io = socket(server);

// Set socket connections
websockets(io);

server.listen(globals.PORT, function() {
    console.log(`Server running at http://${globals.HOSTNAME}/`);
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).render('error', {
        message: 'Unauthorized'
    });
}

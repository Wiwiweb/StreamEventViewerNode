const http = require('http');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const twitchStrategy = require("passport-twitch").Strategy;

const globals = require('./globals');
const home = require('./home');
const streamer = require('./streamer');

const SESSION_SECRET = process.env.SESSION_SECRET || 'DjTOYIaTRbKpnF5j6Qu715B6lhUyMRyh';

const app = express();

app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(session({secret: SESSION_SECRET}));
app.use(passport.initialize());
app.use(passport.session());

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

// app.get('/streamer', ensureAuthenticated, streamer); // TODO renable authentication
app.get('/streamer', streamer);

// Twitch webhook subscription validation
app.get('/webhook/follow/:channel_name', function(req, res) {
    console.log('Webhook validation');
    console.dir(req.query);
    if (req.query['hub.challenge']) {
        res.status(200).send(req.query['hub.challenge'])
    } else {
        res.sendStatus(200);
    }
});

// Twitch webhook new event
app.post('/webhook/follow/:channel_name', function(req, res) {
    streamer.addEvent(req.params['channel_name'], req.body);
    res.sendStatus(200)
});

app.use(function(req, res) {
    res.status(404).render('error', {
        message: 'Not Found'
    });
});

server = http.createServer(app);

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

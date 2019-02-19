const http = require('http');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const twitchStrategy = require("passport-twitch").Strategy;

const home = require('./home');

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';
const SESSION_SECRET = process.env.SESSION_SECRET || 'DjTOYIaTRbKpnF5j6Qu715B6lhUyMRyh';
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const app = express();

app.set('view engine', 'pug');

app.use(session({secret: SESSION_SECRET}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new twitchStrategy({
        clientID: TWITCH_CLIENT_ID,
        clientSecret: TWITCH_CLIENT_SECRET,
        callbackURL: `http://${HOSTNAME}:${PORT}/login/callback`,
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

app.get('/streamer', ensureAuthenticated, function(req, res) {
    res.render('streamer');
});

app.use(function(req, res) {
    res.status(404).render('error', {
        message: 'Not Found',
        error: {}
    });
});

server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).render('error', {
        message: 'Unauthorized',
        error: {}
    });
}

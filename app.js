const http = require('http');

const hostname = 'localhost';
const port = 3000;

const express = require('express');
const app = express();
app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.render('home');
});

app.get('/about', function(req, res) {
    res.render('streamer');
});

app.use(function(req, res) {
    res.status(404).render('error', {
        message: 'Not Found',
        error: {}
    });
});

server = http.createServer(app);

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function home(req, res) {
    if (req.isAuthenticated()) {
        res.render('home_logged_in', {username: req.user.displayName});
    }
    else {
        res.render('home_logged_out');
    }
}

module.exports = home;

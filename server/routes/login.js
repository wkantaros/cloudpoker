const router = require('express').Router();
const path = require('path');

// Login page for host
router.route('/').get((req, res) => {
    // console.log(path.join(__dirname, '/../../login/login.html'));
    // res.sendFile(path.join(__dirname, '/../../login/login.html'));
    res.render('pages/login');
});

module.exports = router;
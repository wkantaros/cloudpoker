const router = require('express').Router();
const path = require('path');

// Login page for host
router.route('/').get((req, res) => {
    res.render('pages/login');
});

module.exports = router;
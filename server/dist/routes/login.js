"use strict";

var router = require('express').Router();

var path = require('path'); // Login page for host


router.route('/').get(function (req, res) {
  res.render('pages/login');
});
module.exports = router;
const express = require('express');
const utilController = require('../controllers/utilController');

const router = express.Router();

router.post('/', utilController.createUtil);

module.exports = router;

const express = require('express');
const userController = require('../controllers/userController');
const edocController = require('../controllers/edocController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/:id', edocController.getEdoc);

// Protects all routes after this middleware
router.use(authController.protect);
router.get('/uid/:uid', edocController.getAllUserEdoc);

router.post('/', edocController.createEdoc);

router
  .route('/:id')
  .patch(edocController.updateEdoc)
  .delete(edocController.deleteEdoc);

module.exports = router;

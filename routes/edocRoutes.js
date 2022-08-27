const express = require('express');
const userController = require('../controllers/userController');
const edocController = require('../controllers/edocController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/:id', edocController.getEdoc);

router.get('/', edocController.getAllUserEdoc);

// Protects all routes after this middleware
router.use(authController.protect);

router.post('/', edocController.createEdoc);

router
  .route('/:id')
  .patch(edocController.updateEdoc)
  .delete(edocController.deleteEdoc);

module.exports = router;

const express = require('express');
// const validate = require('../../middlewares/validate');
// const authValidation = require('../../validations/auth.validation');
// const authController = require('../../controllers/auth.controller');
// const auth = require('../../middlewares/auth');
const optionController = require('../../controllers/option.controller');

const router = express.Router();

router.post('/insertLiveData',  optionController.insertLiveData);

router.post('/insertData',  optionController.insertData);
router.post('/getData',  optionController.getData);


module.exports = router;
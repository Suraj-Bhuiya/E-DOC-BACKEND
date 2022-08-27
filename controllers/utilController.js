const Util = require('../models/utilModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.createUtil = factory.createOne(Util);

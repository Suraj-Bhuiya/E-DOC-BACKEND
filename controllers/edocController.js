const Edoc = require('../models/edocModel');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getEdoc = factory.getOne(Edoc);

exports.getAllEdoc = factory.getAll(Edoc);

exports.updateEdoc = factory.updateOne(Edoc);

exports.deleteEdoc = factory.deleteOne(Edoc);

exports.getAllUserEdoc = catchAsync(async (req, res, next) => {
  const uid = req.query.uid;

  const user = await User.findOne({ uid: uid });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',

    data: {
      user,
    },
  });
});

exports.createEdoc = factory.createOne(Edoc);

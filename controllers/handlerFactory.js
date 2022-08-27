const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const User = require('./../models/userModel');
const Edoc = require('./../models/edocModel');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }

    if (Model === Edoc) {
      const user = await User.findById(req.query.user);

      if (!user) {
        return next(new AppError('No User found with that ID', 404));
      }

      const edocs = user.edocs.filter((id) =>
        id != req.params.id ? true : false
      );

      await User.findByIdAndUpdate(
        req.user._id,
        { edocs: edocs },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    res.status(200).json({
      status: 'success',
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    if (Model === Edoc) {
      const user = await User.findById(req.body.userId);

      if (!user) {
        return next(new AppError('No User found with that ID', 404));
      }

      const allEdocs = [...user.edocs, doc._id];

      await User.findByIdAndUpdate(
        req.user._id,
        { edocs: allEdocs },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    res.status(201).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (popOptions) query = query.populate(popOptions);

    const doc = await query;
    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //TO allow for nested get reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const docs = await features.query;
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        docs,
      },
    });
  });

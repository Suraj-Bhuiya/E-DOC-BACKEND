const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel');
const Util = require('../models/utilModel');
const jwt = require('jsonwebtoken');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRESIN + 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // res.cookie('jwt', token, cookieOptions);

  //Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.singup = catchAsync(async (req, res) => {
  const utilDoc = await Util.find();
  console.log(utilDoc);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    phoneNo: req.body.phoneNo,
    bio: req.body.bio,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    userType: req.body.userType,
    uid: `U${utilDoc[0].uidCount}`,
  });

  const UtilUpdated = await Util.findByIdAndUpdate(utilDoc[0]._id, {
    uidCount: utilDoc[0].uidCount + 1,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please proivde a email and a password', 400));
  }
  //2) cheack if the user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3)if everything is ok send the token

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1)Get Token and ch3eck if it exists
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  //2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) check if the user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exist', 401));
  }
  //4) if user change password after the jwt is issued
  if (currentUser.changesPasswordAfter(decoded.iat)) {
    return next(new AppError('Password Changed! Please login again', 401));
  }

  //GRNT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //2) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //3) check if the user exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4) if user change password after the jwt is issued
      if (currentUser.changesPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a logged in user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perfrom this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) GET user based ont he posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }

  //2)generate token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //3)Send it to email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetpassword/${resetToken}`;

  // const message = `Forgot Your password? Submit a PATCH request with your new password \n ${resetURL}`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset Token',
    //   message,
    // });

    // await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an Error sending the email. Try again later', 500)
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)get user based on the token
  const hasedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hasedToken,
    passwordResetExpires: { $gte: Date.now() },
  });

  //2)if the token has not expired and there is auser , set the password
  if (!user) {
    return next(new AppError('Token is Invalid or Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3)update changedPasswordAt property for the current user
  //--Done vai pre save middleware
  //4)Log the user in,send JWt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)get user from the collection
  const user = await User.findById(req.user.id).select('+password');
  //2) check the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError('There is no user or the current password is incorrect', 401)
    );
  }
  //3)if the password is correct Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4) log the user in send jwt
  createSendToken(user, 200, res);
});

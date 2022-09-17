const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'User must have a unique ID'],
  },
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  phoneNo: {
    type: String,
  },
  bio: {
    type: String,
  },
  photo: {
    type: String,
  },
  profession: {
    type: String,
  },

  userType: {
    type: String,
    enum: ['user', 'verifier', 'admin'],
    default: 'user',
  },
  edocs: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Edoc',
    },
  ],
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //only works on save and create
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  } else {
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
  }
});

UserSchema.pre(/^find/, function (next) {
  //this point to the current query
  this.find({ active: { $ne: false } });
  next();
});

UserSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'edocs',
    select: 'name  url createdAt',
  });

  next();
});

UserSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

UserSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

UserSchema.methods.changesPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }

  //false means not changed
  return false;
};

UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;

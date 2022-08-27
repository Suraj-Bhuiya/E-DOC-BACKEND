const mongoose = require('mongoose');

const utilSchema = new mongoose.Schema({
  uidCount: {
    type: Number,
    default: 0,
  },
});

const Util = mongoose.model('Util', utilSchema);

module.exports = Util;

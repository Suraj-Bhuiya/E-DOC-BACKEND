const mongoose = require('mongoose');

const edocSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A E-Doc must have a name'],
  },
  url: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// edocSchema.pre(/^find/, function(next) {

// })

const Edoc = mongoose.model('Edoc', edocSchema);

module.exports = Edoc;

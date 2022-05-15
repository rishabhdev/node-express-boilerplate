const mongoose = require('mongoose');

const { toJSON } = require('./plugins');
const { tokenTypes } = require('../config/tokens');

const optionSchema = mongoose.Schema(
  {
    data: {
      type: Array,
      required: false,
      index: false,
    },
    liveData: {
      type: Object,
      required: false,
      index: false
    }
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
optionSchema.plugin(toJSON);

/**
 * @typedef optionSchema
 */
const Option = mongoose.model('Option', optionSchema);

module.exports = Option;

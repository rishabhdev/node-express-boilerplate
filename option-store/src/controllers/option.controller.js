const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { optionService } = require('../services');

const insertData = catchAsync(async (req, res) => {
  const insertedData = await optionService.insertData(req.body);
  res.status(httpStatus.CREATED).send({ success: true });
});

const getData = catchAsync(async (req, res) => {
  const data = await optionService.getData(req.body);
  res.status(httpStatus.CREATED).send({ success: true, data });
});

module.exports = {
  insertData,
  getData
};

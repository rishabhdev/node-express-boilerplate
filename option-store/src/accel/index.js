var apidata = require('pix-apidata');
const moment = require('moment');
const axios = require('axios').default;
// const dotenv = require('dotenv');
const _ = require('lodash');

// dotenv.config({ path: path.join(__dirname, '../../.env') });

var strikes = require('./strikes');

const apiKey = "kk";
const apiServer = "apidata.accelpix.in";

const state = {
  values: {},
  get: (key) => state.values[key],
  set: (key, value) => state.values[key] = value,
  addToBuffer: (data) => {
    const buffer = state.get('buffer') || [];
    state.set('buffer', [...buffer, data]);
  },
  emptyBuffer: () => {
    state.set('buffer', []);
  }
}

const processBuffer = async () => {
  const buffer = state.get('buffer');
  const groupedBuffer = _.groupBy(buffer, 'ticker');
  const values = _.values(groupedBuffer);
  const dataToSave = _.map(values, (data) => {
    const quantity = _.sumBy(data, 'qty');
    const lastItem = _.last(data);
    const saveData = { ...lastItem, quantity };
    if (lastItem.type === 'option') {
      return {...saveData, greeks: state.get(saveData.ticker), niftyPrice: state.get('niftyLatest') };
    }
    return saveData;
  });
  state.emptyBuffer();

  console.log('dataToSave', dataToSave)
  if (dataToSave.length) {
    await axios.post('http://localhost:3000/v1/options/insertLiveData', { data: _.map(dataToSave, (_data) => ({ liveData: _data })) });
  }

  // save dataToSave
};
// await axios.post('http://localhost:3000/v1/options/insertData', { data: cleaned })


const processNifty = (data) => {
  state.set('niftyLatest', data.price);
  const modifiedData = { ...data, type: 'index', symbol: 'NIFTY', timestamp: Date.now() };
  state.addToBuffer(modifiedData);
}

const processOption = (data) => {
  const modifiedData = { ...data, type: 'option', symbol: 'NIFTY', timestamp: Date.now() };
  state.addToBuffer(modifiedData);
}

const processGreek = (data) => {
  state.set(data.ticker, data);
}

apidata.callbacks.onTrade(t => {
  if (t.ticker === 'NIFTY') {
    processNifty(t);
  } else if (t.ticker) {
    processOption(t);
  }
  console.log(t);
});

apidata.callbacks.onGreeks(greek => {
  console.log(greek);
  processGreek(greek);
});

const subscribeForOptions = async () => {
  const nifty = state.get('niftyLatest');
  if (nifty) {
    const newStrikes = strikes.getStrikes(nifty);
    const oldStrikes = state.get('strikes');
    const enteringStrikes = _.differenceBy(newStrikes, oldStrikes || [], 'symbol');
    const leavingStrikes = _.differenceBy(oldStrikes, newStrikes || [], 'symbol');
    if (enteringStrikes.length) {
      await apidata.stream.subscribeAll(enteringStrikes);
      await apidata.stream.unsubscribeAll(leavingStrikes);
      await apidata.stream.subscribeGreeks(enteringStrikes);
      await apidata.stream.unsubscribeGreeks(leavingStrikes);
    }
  }
}

const subscribeForFutures = async () => {

}

apidata.initialize(apiKey, apiServer)
  .then(async () => {
    await apidata.stream.subscribeAll(['NIFTY']);

    // const strikesToSubscribe = _.map(strikes, (strike) => strike.symbol);
    // await apidata.stream.subscribeGreeks(["NIFTY2220318500CE"])
    // let eod = await apidata.history.getEod('NIFTY 50', '20201001', '20201030')
    // console.log(eod);
  })



  setInterval(() => {
    processBuffer();
    subscribeForOptions();
  }, 1000*30);
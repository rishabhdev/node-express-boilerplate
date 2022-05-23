var apidata = require('pix-apidata');
const moment = require('moment');
const axios = require('axios').default;
const _ = require('lodash');

// Need to figure out script to run daily
// Send strike price also in option data
// capture iv for max, avg, last

var strikes = require('./strikes');

const apiKey = "NGk3a2NxbttJTxaO2aWh+raDXLk=";
const apiServer = "apidata.accelpix.in";

const state = {
  values: {},
  get: (key) => state.values[key],
  set: (key, value) => state.values[key] = value,
  addToBuffer: (data = {}) => {
    const time = state.get(`${data.ticker}-time`);
    // console.log(time, data.time)
    if (time === data.time) return;

    const buffer = state.get('buffer') || [];
    state.set('buffer', [...buffer, data]);
    state.set(`${data.ticker}-time`, data.time);

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
    const k = await axios.post('http://localhost:3000/v1/options/insertLiveData', { data: _.map(dataToSave, (_data) => ({ liveData: _data })) });
    console.log('k', k);
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
  const generatedStrikes = state.get('generatedStrikes');
  const strike = _.find(generatedStrikes, { symbol: data.ticker });

  const modifiedData = { ...data, type: 'option', strike: strike?.strike, expiry: strike?.expiry, symbol: 'NIFTY', timestamp: Date.now() };
  state.addToBuffer(modifiedData);
}

const processFuture = (data) => {
  const modifiedData = { ...data, type: 'future', symbol: 'NIFTY', timestamp: Date.now() };
  state.addToBuffer(modifiedData);
}

const processGreek = (data) => {
  state.set(data.ticker, data);
}

apidata.callbacks.onTrade(t => {
  if (t.ticker === 'NIFTY 50') {
    processNifty(t);
  } else if (t.ticker === 'NIFTY-1') {
    processFuture(t);
  } else {
    processOption(t);
  }
  // console.log(t);
});

apidata.callbacks.onGreeks(greek => {
  processGreek(greek);
});

const subscribeForOptions = async () => {
  const nifty = state.get('niftyLatest');
  if (nifty) {
    const generatedStrikes = strikes.getOptionSymbols(nifty);
    state.set('generatedStrikes', generatedStrikes);

    const newStrikes = _.map(generatedStrikes, 'symbol');
    const oldStrikes = state.get('strikes');
    const enteringStrikes = _.difference(newStrikes, oldStrikes || []);
    const leavingStrikes = _.difference(oldStrikes, newStrikes || []);
    console.log({ enteringStrikes, leavingStrikes });
    if (enteringStrikes.length) {
      await apidata.stream.subscribeAll(enteringStrikes);
      // await apidata.stream.unsubscribeAll(leavingStrikes);
      await apidata.stream.subscribeGreeks(enteringStrikes);
      // await apidata.stream.unsubscribeGreeks(leavingStrikes);
    }

    if (leavingStrikes.length) {
      await apidata.stream.unsubscribeAll(leavingStrikes);
      // await apidata.stream?.unsubscribeGreeks(leavingStrikes);
    }
    state.set('strikes', newStrikes);

  }
}

const subscribeForFutures = async () => {

}

apidata.initialize(apiKey, apiServer)
  .then(async () => {
    console.log('initialized');
    await apidata.stream.subscribeAll(['NIFTY 50', 'NIFTY-1']);

    // const strikesToSubscribe = _.map(strikes, (strike) => strike.symbol);
    // await apidata.stream.subscribeGreeks(["NIFTY2220318500CE"])
    // let eod = await apidata.history.getEod('NIFTY 50', '20201001', '20201030')
    // console.log(eod);
  })



  setInterval(async () => {
    await processBuffer();
    await subscribeForOptions();
  }, 1000*30);
var apidata = require('pix-apidata');
const axios = require('axios').default;
const _ = require('lodash');

const bs = require('./blackAndScholes');

// Need to figure out script to run daily
// Send strike price also in option data
// capture iv for max, avg, last
// Thursday issue: this expiry ignored
// Calculate avg quantity tick wise- this might indicate big player or small player - 
// VWAP
// ENdof day for all
// dont ignore 50 in score calculation
var strikes = require('./strikes');

const apiKey = "NGk3a2NxbttJTxaO2aWh+raDXLk=";
const apiServer = "apidata.accelpix.in";

const state = {
  values: {},
  get: (key) => state.values[key],
  set: (key, value) => state.values[key] = value,
  addToBuffer: (data = {}) => {
    const time = state.get(`${data.ticker}-time`);
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
    const tickCount = _.size(data);
    const avgQuantityPerTick = quantity/tickCount;
    const lastItem = _.last(data);
    const volumeWeigtedTotalPrice = _.sumBy(data, (item) => {
      const price = _.get(item, 'price', 0);
      const volume = _.get(item, 'volume', 0);
      return price*volume;
    });;
    const totalVolume = _.sumBy(data, 'volume');
    const vWap = volumeWeigtedTotalPrice/totalVolume;
    const saveData = { ...lastItem, quantity, tickCount, avgQuantityPerTick, vWap };
    if (lastItem.type === 'option') {
      saveData.greeks = state.get(saveData.ticker);
      saveData.niftyPrice = state.get('niftyLatest');
      const t = bs.yearsFromExpiry(saveData?.expiry);
      const niftyPrice = saveData.niftyPrice;
      const callPut = bs.getCallPut(saveData.ticker);
      const o = saveData.price;
      const iv = bs.getIv(niftyPrice, saveData?.strike, t, o, callPut);
      saveData.calculatedIv = iv;
    } else if (lastItem.type === 'future') {
      saveData.niftyPrice = state.get('niftyLatest');
    }

    return saveData;
  });
  state.emptyBuffer();

  console.log('dataToSave', dataToSave)
  if (dataToSave.length) {
    const k = await axios.post('http://localhost:3000/v1/options/insertLiveData', { data: _.map(dataToSave, (_data) => ({ liveData: _data })) });
  }
};

const processNifty = (data) => {
  state.set('niftyLatest', data.price);
  const modifiedData = { ...data, type: 'index', symbol: 'NIFTY', timestamp: Date.now() };
  state.addToBuffer(modifiedData);
}



const processOption = (data) => {
  const generatedStrikes = state.get('generatedStrikes');
  const strike = _.find(generatedStrikes, { symbol: data.ticker });
  
  const modifiedData = { 
    ...data, 
    type: 'option', 
    strike: strike?.strike, 
    expiry: strike?.expiry, 
    symbol: 'NIFTY', 
    timestamp: Date.now(),
    greeks: state.get(data.ticker),
    niftyPrice: state.get('niftyLatest')
  };

  // const endOfDaySummary = 
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
  })



  setInterval(async () => {
    await processBuffer();
    await subscribeForOptions();
  }, 1000*30);
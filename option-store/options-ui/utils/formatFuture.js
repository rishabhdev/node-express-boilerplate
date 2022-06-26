// futureData, indexData
import _ from 'lodash';
import moment from 'moment';

// moment(item.createdAt).utcOffset('+05:30').format("HH:mm:ss")
export const formatFuture = ({ futureData, indexData }) => {
  futureData = futureData.map((item) => ({ ...item, createdAt: moment(item.createdAt).utcOffset('+05:30').format("HH:mm:ss") }))
  indexData = indexData.map((item) => ({ ...item, createdAt: moment(item.createdAt).utcOffset('+05:30').format("HH:mm:ss") }))

  const futureTimeVsPrice = _.keyBy(futureData, 'createdAt');
  const indexTimeVsPrice = _.keyBy(indexData, 'createdAt');
  const timeList = _.keys(futureTimeVsPrice).sort();
  console.log({ futureTimeVsPrice, indexTimeVsPrice, timeList })
  const formattedFutureData = _.map(timeList, (time) => {
    const future = futureTimeVsPrice[time];
    const index = indexTimeVsPrice[time] || {};
    const indexPrice = index.liveData?.price || future.liveData.price;
    return {
      ...future,
      niftyPrice: indexPrice,
      premium: (future.liveData.price - indexPrice)
    };
  });
  return formattedFutureData;
};

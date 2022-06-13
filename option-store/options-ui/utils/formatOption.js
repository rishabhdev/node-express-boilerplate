import _ from 'lodash';

export const formatData = (apiData) => {
  const insideData = _.get(apiData, 'data.data');
  const grouped = _.groupBy(insideData, (datum) => {
    const ticker = _.get(datum, 'liveData.ticker', '');
    const type = ticker.slice(-2);
    return type;
  });

  _.forEach(grouped, (optionTypeData, optionType) => {
    const groupedByStrike = _.groupBy(optionTypeData, 'liveData.strike');
    _.forEach(groupedByStrike, (strikeData, strike) => {
      groupedByStrike[strike] = _.keyBy(strikeData, 'liveData.time')
    });
    grouped[optionType] = groupedByStrike;
  });

  return grouped;
  // const labels = _.keys(grouped);

}
import { useEffect } from 'react';
import moment from 'moment';
import angelone from '../utils/angelOne.json';

const Arbitrage = () => {
  useEffect(() => {
    const angelOneFiltered = angelone.filter((item) => {
      return item.instrumenttype === 'FUTSTK' && moment(item.expiry).isSame(moment(), 'month');
    })
    window.angelOneFiltered = angelOneFiltered;
  }, []);
  return (
    <div>
      Arbitrage
    </div>
  )
};

export default Arbitrage;
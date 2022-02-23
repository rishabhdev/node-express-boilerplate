// const puppeteer = require('puppeteer');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios').default;
const moment = require('moment');
let lastTimeStamp = 0;

const openPage = async (browser) => {
  console.log('openPage')
  const currentTime = moment(new Date()).utc().utcOffset("+05:30")
  const hours = currentTime.hours();
  const minutes = currentTime.minutes();
  const weekDay = currentTime.day();
  if (weekDay === 'Saturday' || weekDay === 'Sunday') {
    console.log("Market Closed on weekend", currentTime.format("YYYY-MM-DD HH:mm:ss"))
    return;
  }
  if (((hours*60 + minutes) <= (9*60 + 15.1)) || ((hours*60 + minutes) >= (15*60 + 30))) {
      console.log('market closed outside working hours', currentTime.format("YYYY-MM-DD HH:mm:ss"))
      return;
  }

  const page = await browser.newPage();
  await page.goto('https://www.nseindia.com/option-chain');
  await page.screenshot({ path: 'example.png' });

  page.on('response', async (response) => {  
    if (response.url() == "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY"){
        console.log('XHR response received'); 
        const respData = await response.json(); 
        const timeStamp = respData.records.timestamp;
        if (timeStamp === lastTimeStamp){
          console.log('warning: same data recieved, ignoring', timeStamp)
          return;
        }
    
        const filtered = respData.filtered.data;
        const cleaned = filtered.filter(item => {
          if (Math.abs(item.CE.underlyingValue - item.CE.strikePrice) < 500) {
            return true;
          }
        })
        console.log('cleaned', cleaned)
        await axios.post('http://localhost:3000/v1/options/insertData', { data: cleaned })
        lastTimeStamp = timeStamp;
        page.close();
    }
  });

  setTimeout(() => {
    if (!page.isClosed()) {
      page.close();
      console.log("Warning: Response not recieved before timeout");
    }
  }, 59*1000)
}

(async () => {
  puppeteer.use(StealthPlugin());
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
  const browser = await puppeteer.launch();
  setInterval(() => openPage(browser), 60*1.2*1000);
})();
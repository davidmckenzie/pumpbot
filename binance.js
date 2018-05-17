require('console-stamp')(console, {
  pattern: 'HH:MM:ss.l',
  colors: {
      stamp: 'grey',
      label: 'grey',
      metadata: 'green'
  }
});
const binance = require('node-binance-api');
const readline = require('readline');
let _ = require('lodash');
var parseArgs = require('minimist');
let parsedArgs = parseArgs(process.argv.slice(2));
let file;

if(parsedArgs['f']) {
  file = "./config."+parsedArgs['f'];
} else {
  file = "./config";
}

let config = require(file);

/**********************************
* VARIABLES
***********************************/
let isExchangeInfoLoaded = false;
let isPricesLoaded = false;
let isPreloaded = false;

let prices = {
  binance: {}
};
var buyOrderPoll;
var sellPoll;
var sellOrderPoll;
var shares;
var balance;
let disable_prompt = config.disable_prompt;
let apiKey = config.api_key || '';
let apiSecret = config.api_secret || '';
let desired_return = config.desired_return;
let include_fees = config.include_fees || false;
let stop_loss;
let currency = config.currency || 'BTC';
let fake_buy = config.fake_buy || false;
const flags = {type: 'MARKET', newOrderRespType: 'FULL'};

if(parsedArgs['k']) {
  apiKey = parsedArgs['k'];
}
if(parsedArgs['s']) {
  apiSecret = parsedArgs['s'];
}
if(parsedArgs['h']) {
  desired_return = parsedArgs['h'];
}
if(parsedArgs['l']) {
  stop_loss = parsedArgs['l'];
}
if(parsedArgs['y']) {
  disable_prompt = true;
}
if(parsedArgs['c']) {
  currency = parsedArgs['c'];
}

if(apiKey && apiSecret) {
  binance.options({
    'APIKEY': apiKey,
    'APISECRET': apiSecret,
    useServerTime: true,
    test: fake_buy
  });
} else {
  exit('Could not read API keys, check config');
}

if(parsedArgs['_'].length == 0 || parsedArgs['help']) {
  console.log(`Usage: node binance.js <coin> [options]`);
  console.log(`\nOptions: (options override config.js)\n`);
  console.log(`  -k <api_key>         API Key`);
  console.log(`  -s <api_secret>      API Secret`);
  console.log(`  -f <filename>        Specify an alternative configuration file (defaults to config.js)`);
  console.log(`  -h <desired_return>  Desired exit percentage in decimal format (e.g. 0.2 for 20%)`);
  console.log(`  -l <stop_loss>       Desired stop loss percentage in decimal format (e.g. 0.2 for 20%)`);
  console.log(`  -y                   Skip the buy confirmation prompt and buy immediately`);
  console.log(`  --help               Display this message`);
  console.log(`\nExample Usage:\n`);
  console.log(`Buy VTC using a config file named 'config.trading.js' and sell when 20% gain reached, or when loss is 5%:\n`);
  console.log(`  node binance.js vtc -f trading -h 0.2 -l 0.05`);
  console.log(`\nBuy Bitbean with no stop loss and no confirmation prompt, only selling when 150% gains are reached:\n`);
  console.log(`  node binance.js -h 1.5 -y bitb`);
  exit();
}

const coin = parsedArgs['_'].join('').toUpperCase() + currency.toUpperCase();
binance.exchangeInfo((error, info) => {
  console.log(info.rateLimits);
  let coinInfo = info.symbols.find(function (obj) { return obj.symbol == coin; });
  // console.log(coinInfo);
  let priceFilter = coinInfo.filters.find(function (obj) { return obj.filterType == 'PRICE_FILTER'; });
  let lotFilter = coinInfo.filters.find(function (obj) { return obj.filterType == 'LOT_SIZE'; });
  var stepSize = lotFilter.stepSize;

  binance.depth(coin, (error, depth, symbol) => {
    if(error) exit(error);
    binance.balance((error, balances) => {
      if(error) exit(error);
      console.log("ETH balance: ", balances.ETH.available);
      console.log("BTC balance: ", balances.BTC.available);
      if (!config.investment_percentage || config.investment_percentage == 'ALL') {
        balance = balances[currency.toUpperCase()].available;
      } else {
        balance = balances[currency.toUpperCase()].available * config.investment_percentage;
      }
      console.log(`Using ${balance} out of ${balances[currency.toUpperCase()].available} ${currency.toUpperCase()}`);

      let askCount = 1;
      let askShares = 0.0;
      let askBalance = balance;
      let coinPrice = 0.0;
      _.each(depth.asks, (quantity, price) => {
        // calculate price for order
        if (askBalance > 0) {
          if (askCount == 1) {
            console.log(`Ask price of ${coin}: ${price}`);
          }
          if ((quantity * price) < balance) {
            askShares += quantity;
            askBalance -= (quantity * price);
            askCount++;
            console.log(`Buying ${quantity} at ${price}`);
          } else {
            askShares += askBalance / price;
            coinPrice = price;
            console.log(`Buying ${askBalance / price} at ${price}`);
            askBalance = 0;
            console.log(`Order would fill ${askCount} orders`);
            console.log(`Total shares: ${askShares}`);
            console.log(`Max price: ${coinPrice}`);
            console.log(`Average price: ${balance / askShares}`);
          }
        }
      });

      console.log('\n\nSetting inflation...');
      let avgPrice = balance / askShares;
      coinPrice = coinPrice + (coinPrice * config.market_buy_inflation);
      shares = askShares - (askShares * config.market_buy_inflation);
      // this may not work - not sure if binance allows orders to fill the book like that, may need more testing
      console.log(`Will submit market buy for ${shares} at average price ${avgPrice} for a total of ${shares * avgPrice}`)
      // coinPrice = parseFloat(ticker.askPrice) + (parseFloat(ticker.askPrice) * config.market_buy_inflation);
      // shares = balance / coinPrice;
      if (fake_buy)
        shares += 100;
      shares = binance.roundStep(shares, stepSize);

      if (stop_loss) {
        console.log(`\n\nChecking stop loss...`);
        let bidCount = 1;
        let purchasedVolume = shares;
        let stopSum = 0.0;
        _.each(depth.bids, (quantity, price) => {
          // test stop loss
          if (purchasedVolume > 0) {
            if (bidCount == 1) {
              console.log(`Bid price of ${coin}: ${price}`);
            }
            if (quantity < purchasedVolume) {
              stopSum += (quantity * price);
              purchasedVolume -= quantity;
              console.log(`Selling ${quantity} at ${price}. Remaining: ${purchasedVolume}`);
              bidCount++;
            } else {
              stopSum += (purchasedVolume * price);
              console.log(`Selling ${purchasedVolume} at ${price}. Remaining: 0`);
              purchasedVolume = 0;
              // console.log(`stopSum: ${stopSum} shares: ${shares} avgPrice: ${avgPrice}`)
              let avgGain = ((stopSum / (shares * avgPrice)) - 1) * 100;
              // console.log(avgGain);
              if (include_fees) {
                avgGain = avgGain - 0.1;
              } 
              console.log(`Simulated immediate gain: ${avgGain.toFixed(2)}%`);
              if(avgGain < (stop_loss * -100)) {
                exit(`CANCELLING ORDER - STOP LOSS WOULD TRIGGER IMMEDIATELY AT ${sellPrice}`);
              } else {
                console.log(`Continuing...`)
              }
            }
          }
        });
      }

      console.log(`\n\nMarket buying ${shares} of ${coin}`);
      binance.marketBuy(coin, shares, flags, (error, response) => {
        if(error) exit(error.body);
        console.log("Market Buy response", response);
        console.log("order id: " + response.orderId);
        var filledPrice = 0.0;
        var fillTotal = 0.0;
        if (response.fills) {
          _.each(response.fills, (fill) => {
            fillTotal += fill.price * fill.qty;
          });
          filledPrice = fillTotal / shares;
        } else {
          filledPrice = avgPrice;
        }
        console.log('Fill price: ' + filledPrice);
        if (response.orderId || fake_buy) {
          // start the price check loop
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(true);
          process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
              process.exit();
            } else if (key.ctrl && key.name === 's') {
              console.log('PANIC BUTTON DETECTED, SELLING IMMEDIATELY');
              console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
              sellLow(coin,shares,filledPrice);
            }
          });
          sellPoll = setInterval(sell, 1000, coin, shares, filledPrice);
        }
      });
    });
  });
});


function sell(coin, shares, filledPrice) {
  let average_price = 0.0;
  let total_price = 0.0;
  let total_volume = 0.0;
  let count = 1;
  let sellPrice = 0.0;
  let purchasedVolume = shares;
  let gainSum = 0.0;
  let stopPrice = 0.0;
  // console.log(`polling for ${desired_return * 100}% return`);
  binance.depth(coin, (error, depth, symbol) => {
    _.each(depth.bids, (quantity, price) => {
      // console.log(quantity, price);
      if (count == 1) {
        sellPrice = price;
        console.log(`Current bid on ${coin}: ${price}`);
      }
      if (quantity < purchasedVolume) {
        gainSum += (quantity * price);
        purchasedVolume -= quantity;
        count++;
        // console.log(count);
      } else {
        // console.log('finish at count '+count);
        gainSum += (purchasedVolume * price);
        let avgGain = ((gainSum / (shares * filledPrice)) - 1) * 100;
        // let avgGain = (gainSum/count) * 100;
        if (include_fees) {
          avgGain = avgGain - 0.1;
        } 
        console.log(`total gain on trade (${count} fills reqd): ${avgGain.toFixed(2)}%`);
        // sell based on percentage
        if (stop_loss) {
          if(avgGain < (stop_loss * -100)) {
            console.log(`STOP LOSS TRIGGERED, MARKET SELLING AT ${sellPrice}`);
            binance.marketSell(coin, shares, flags, (error, response) => {
              if(error) exit(`something went wrong with marketSell: ${error}`);
              clearInterval(sellPoll);
              exit(response);
            });
            return false;
          }
        }
        if(avgGain >= (desired_return * 100)) {
          console.log(`MARKET SELLING AT ${sellPrice}`);
          binance.marketSell(coin, shares, flags, (error, response) => {
            if(error) exit(`something went wrong with marketSell: ${error}`);
            clearInterval(sellPoll);
            exit(response);
          });
          return false;
        } else {
          console.log(`GAIN DOES NOT PASS ${desired_return * 100}%, NOT SELLING`);
          return false;
        }
      }
    });
  });
}

/**
* sellLow - sells immediately at market rate
**/

function sellLow(coin, shares, filledPrice) {
  clearInterval(sellPoll);
  binance.bookTickers(coin, (error, ticker) => {
    console.log(`MARKET SELLING AT ${ticker.bidPrice}`);
    binance.marketSell(coin, shares, flags, (error, response) => {
      if(error) exit(`something went wrong with marketSell: ${error}`);
      let sellPrice;
      let sellTotal = 0.0;
      if (response.fills) {
        _.each(response.fills, (fill) => {
          sellTotal += fill.price * fill.qty;
        });
        sellPrice = sellTotal / shares;
      } else {
        sellPrice = ticker.bidPrice;
      }
      let sellSum = ((shares * sellPrice) / (filledPrice * shares) - 1) * 100;
      console.log(sellSum);
      console.log(`total gain on trade: ${sellSum.toFixed(2)}%`);
      exit(response);
    });
  });
}

function exit(message) {
  if(message) {
    console.log(message);
  }
  process.exit();
}

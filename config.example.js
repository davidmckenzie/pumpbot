let config = {
  // API KEY
  api_key: '', // api key for binance API
  api_secret: '', // api secret for binance API
  investment_percentage: .5, //how much of your current binance wallet do you want to invest
  market_buy_inflation: .1, //set the market buy to currentPrice + inflation percentage
  auto_sell: true, //automatically sell when the desired_return is triggered
  desired_return: .1, //percentage return expected when initiating a sell
  fake_buy: true //fake buy call to test the flow of the application
};

module.exports = config;

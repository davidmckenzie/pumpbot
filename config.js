let config = {
  // READ ONLY KEY
  api_key: 'gdfgd', // api key for bittrex API
  api_secret: '', // api secret for bittrex API
  // TRADE KEY
  // api_key: '',
  // api_secret: '',
  investment_percentage: .5, //how much of your current bittrex wallet do you want to invest
  no_buy_threshold_percentage: .3, //fail the buy if this percentage threshold has passed
  no_buy_threshold_time: 2, //time history (in minutes, max 10) to fail the buy if threshold is passed
  market_buy_inflation: .2, //set the market buy to currentPrice + inflation percentage
  disable_prompt: false, //bypass the 'are you sure?' before submitting the buy
  auto_sell: true, //automatically sell when the desired_return is triggered
  desired_return: .2, //percentage return expected when initiating a sell
  fake_buy: true, //fake buy call to test the flow of the application
};

module.exports = config;

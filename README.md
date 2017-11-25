# Pumpbot

This bot is used to snipe purchases off bittrex by using a command-line script and configuration

## Getting Started

### Prerequisites

Nodejs (6.11.2 at least)
NPM (3.10.10 at least)

https://nodejs.org/en/download/
The LTS version of node will come with NPM, it should be all you need

### Get your API Keys
You should make sure get two api keys for this bot

One should have View-Only rights, and the other should be your live trading key.
You can follow [this](https://coinigy.freshdesk.com/support/solutions/articles/1000087495-how-do-i-find-my-api-key-on-bittrex-com-) to get your api keys.

You have 2 options for using the api keys...
1. You can input it with the console each time you use the bot
```
node pumpbot.js -k YourAPIKey -s YourAPISecret <coin>
```
2. You can hardcode it into the application in pumpbot.js
```javascript
if(apiKey && apiSecret) {
  bittrex.options({
    'apikey' : apiKey,
    'apisecret' : apiSecret,
  });
} else {
  /**
  * read-only key
  **/
  bittrex.options({
    'apikey' : '',
    'apisecret' : '',
  });

  /**
  * trade/read key
  **/
  // bittrex.options({
  //   'apikey' : '',
  //   'apisecret' : '',
  // });
```

Either option I highly recommend you make use of the API whitelist feature in bittrex

### Setting Up the Configuration

There are a few configurations that you will need to understand and change to satisfy your needs from the bot.
config.js holds all the configuration (except for the api keys)

```javascript
  investment_percentage: .5, //how much of your current bittrex wallet do you want to invest
  no_buy_threshold_percentage: .2, //fail the buy if this percentage threshold has passed
  no_buy_threshold_time: 3, //time history (in minutes, max 10) to fail the buy if threshold is passed
  market_buy_inflation: .15, //set the market buy to currentPrice + inflation percentage
  disable_prompt: false, //bypass the 'are you sure?' before submitting the buy
  auto_sell: true, //automatically sell when the desired_return is triggered
  desired_return: .2, //percentage return expected when initiating a sell
  fake_buy: true, //fake buy call to test the flow of the application
```
**Any percentage configuration is set with decimals (i.e. .1 = 10%, .2 = 20% etc). If you set these using whole numbers, it will consider them over 100%** 

**IT IS EXTREMELY IMPORTANT THAT YOU UNDERSTAND WHAT THESE CONFIGURATION OPTIONS DO BEFORE USING THE BOT FOR LIVE TRADES**
**IF YOU ARE UNSURE OF A SETTING, DO NOT ATTEMPT TO TEST IT WITH A LIVE TRADE**

## Running the Bot

### Testing the Bot
To test the bot and perform a fake trade, you should make sure a few configuration settings are set

```
fake_buy: true
```
This will ensure that a live trade will not be made, it will make a fake trade at market value.

Make sure you have the api key using your View-Only key and not the Trade key

```javascript
  /**
  * read-only key
  **/
  bittrex.options({
    'apikey' : '',
    'apisecret' : '',
  });

  /**
  * trade/read key
  **/
  // bittrex.options({
  //   'apikey' : '',
  //   'apisecret' : '',
  // });
```
### Making a Live Trade

To use the bot in a live setting, make sure a few configuration settings are set

```
fake_buy: false
```
This will instruct the bot to make a live trade on bittrex


Make sure you have the api key using your Trade key

```javascript
  /**
  * read-only key
  **/
  // bittrex.options({
  //   'apikey' : '',
  //   'apisecret' : '',
  // });

  /**
  * trade/read key
  **/
  bittrex.options({
    'apikey' : '',
    'apisecret' : '',
  });
```
When you run this script and tell the bot to purchase a coin, it will make a live trade on bittrex.

### Selling
This bot can be configured to automatically sell after your purchase has been made
```
  auto_sell: true, //automatically sell when the desired_return is triggered
  desired_return: .5, //percentage return expected when initiating a sell
```
After the buy, the bot will monitor for updates in the price until a profit of the desired_return is hit. If it does not hit this point, it will not sell.
I would not recommend relying on the selling mechanism of this bot. I recommend you set the auto_sell and the desired_return to a reasonable amount and then rely on manually selling your position on bittrex

## Warning
**Use this at your own risk. I am not responsible for any outcomes of the use of this bot**
**If you do not fully understand the configuration or limitations of the bot, do not use it**

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


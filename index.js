const TelegramApi = require('node-telegram-bot-api');
const axios = require('axios');
const {gameOptions, againOptions, menuBtn, menuOptions, chainOptionsBalance, chainOptionsTransfers, showMore, showMoreTransfers} = require('./options');
const {token, unmarshal_key} = require('./settings');
const bot = new TelegramApi(token, {polling: true});

const awaitWallet = {};
const awaitBalance = {};
const awaitTransfers = {};
const usersChain = {};
const usersWallet = {};
const userTokensArray = {};
const userTokensShown = {};
const userTransfersArray = {};
const userTransfersShown = {};
const addressRegex = /^0x([A-Fa-f0-9]{40})$/;

function openMenu(chatId){
  return bot.sendMessage(chatId, `
  Menu:\n--------------------------------\nChose option:\n- View the balance of tokens in the following networks: ETH, BSC and MATIC;\n- View tokens transfer history in the following networks: ETH, BSC and MATIC; `, menuOptions);
}

function choseChain(chatId, action){
  if(action == "balance"){
    return bot.sendMessage(chatId, `🟩 View the balance of tokens\n--------------------------------\nSelect network:\n--------------------------------`, chainOptionsBalance);
  } 
  else if(action == "transfers"){
    return bot.sendMessage(chatId, `🟩 View tokens transfer history\n--------------------------------\nSelect network:\n--------------------------------`, chainOptionsTransfers);
  }
}

async function inputWallet(chatId, chain){
  await bot.sendMessage(chatId, `
  Write ${chain.split("_")[0].substr(1).toUpperCase()} address :\n--------------------------------`);
}

async function getBalance(chatId, address, chain){
  const url = `https://stg-api.unmarshal.io/v1/${chain}/address/${address}/assets?auth_key=${unmarshal_key}`;
  let resp = await axios.get(url).catch(function (error) {
    if (error.response) {
      return bot.sendMessage(chatId, `An unknown error has occurred. ${error.response.data}`, menuBtn);
    }
  });

  let data = resp.data; 
  let tokens = [];

  for(var i=0; i<data.length; i++){
    if(data[i].contract_ticker_symbol){
      tokens.push({
        "token_ticker" : data[i].contract_ticker_symbol,
        "balance": data[i].balance / 10 ** data[i].contract_decimals,
        "balance_usd" : data[i].quote,
        "price" : data[i].quote_rate
      });
    }
  }

  let listToMsgFirst10 = tokens.map(function(token, index) {
    return `*\[${index+1}\] ${token.token_ticker}*\n*Balance:* ${token.balance}\n*Price:* ${token.price.toFixed(5)} $\n*Balance USD:* ${token.balance_usd.toFixed(5)} $\n------------------------------------------------------\n`;
  });

  userTokensArray[chatId] = JSON.parse(JSON.stringify(listToMsgFirst10));
  userTokensShown[chatId] = 10;
  
  if(listToMsgFirst10.length){
    let totalUsd = tokens.reduce(function(a,b){
      return {balance_usd: a.balance_usd + b.balance_usd};
    });
    
    if(listToMsgFirst10.length > 10){
      await bot.sendMessage(chatId, `You have: ${listToMsgFirst10.length} tokens.\nTotal USD balance: \n ${totalUsd.balance_usd.toFixed(5)} $\n\n--------------------------------\n${listToMsgFirst10.slice(0,10).join("")}`, {parse_mode: 'Markdown'});
      await bot.sendMessage(chatId, `${listToMsgFirst10.length - 10} more tokens not shown`, showMore);
    }
    else{
      await bot.sendMessage(chatId, `You have: ${listToMsgFirst10.length} tokens.\nTotal USD balance: \n ${totalUsd.balance_usd.toFixed(5)} $\n\n--------------------------------\n${listToMsgFirst10.slice(0,10).join("")}`, {reply_markup: JSON.stringify({ inline_keyboard: [ [{text: 'Menu', callback_data: '/menu'}], ] }), parse_mode: 'Markdown'});
    }
  }
  else{
    await bot.sendMessage(chatId, `No tokens !`, menuBtn, {parse_mode: 'Markdown'});
  }
}

async function getTransfers(chatId, address, chain){
  const url = `https://stg-api.unmarshal.io/v1/${chain}/address/${address}/transactions?page=1&pageSize=100&auth_key=${unmarshal_key}`;
  let resp = await axios.get(url).catch(function (error) {
    if (error.response) {
      return bot.sendMessage(chatId, `An unknown error has occurred. ${error.response.data}`, menuBtn);
    }
  });

  let data = resp.data; 
  let transfers = [];

  if(data.transactions){

    let explorerLink;
    if(chain == "ethereum"){
      explorerLink = "https://etherscan.io/tx";
    } else if(chain == "bsc"){
      explorerLink = "https://bscscan.com/tx";
    } else if(chain == "matic"){
      explorerLink = "https://polygonscan.com/tx";
    }

    for(var i=0; i<data.transactions.length; i++){
      if(data.transactions[i].id){
          let datetime = new Date(data.transactions[i].date*1000);
          let datetime_format = datetime.getDate()+ "/"+(datetime.getMonth()+1)+ "/"+datetime.getFullYear()+ " "+datetime.getHours()+ ":"+datetime.getMinutes()+ ":"+datetime.getSeconds();
          
          let type;
          if(data.transactions[i].type == "receive"){
            type = `<b>🟩 Receive</b>`
          } else if(data.transactions[i].type == "send"){
            type = `<b>🟥 Send</b>`
          } else {
            type = `<b>⚒ ${data.transactions[i].type}</b>`
          }

          transfers.push({
            "hash" : `<a href='${explorerLink}/${data.transactions[i].id}'>${data.transactions[i].id.substring(0, 9)}...${data.transactions[i].id.substring(54)}</a>`,
            "from": data.transactions[i].from,
            "to": data.transactions[i].to,
            "date": datetime_format,
            "type" : type,
            "description" : data.transactions[i].description
          });
      }
    }

    let listTransfersToMsgFirst5 = transfers.map(function(transfer, index) {
      return `<b>\[${index+1}\]</b>\n${transfer.type.toUpperCase()}\n<b>Date:</b> ${transfer.date}\n<b>Hash:</b> ${transfer.hash}\n<b>From:</b> ${transfer.from}\n<b>To:</b> ${transfer.to}\n<b>Description:</b> ${transfer.description}\n-------------------------------------------------------------------------------------------------\n`;
    });

    userTransfersArray[chatId] = JSON.parse(JSON.stringify(listTransfersToMsgFirst5));
    userTransfersShown[chatId] = 5;
    
    if(listTransfersToMsgFirst5.length){
      if(listTransfersToMsgFirst5.length > 5){
        await bot.sendMessage(chatId, `Latest 100 transfers:\n--------------------------------\n${listTransfersToMsgFirst5.slice(0,5).join("")}`, {parse_mode: 'HTML'});
        await bot.sendMessage(chatId, `${listTransfersToMsgFirst5.length - 5} more transfers not shown`, showMoreTransfers);
      }
      else{
        await bot.sendMessage(chatId, `Latest 100 transfers:\n--------------------------------\n${listTransfersToMsgFirst5.slice(0,5).join("")}`, {reply_markup: JSON.stringify({ inline_keyboard: [ [{text: 'Menu', callback_data: '/menu'}], ] }), parse_mode: 'HTML'});
      }
    }
    else{
      await bot.sendMessage(chatId, `No transfers !`, menuBtn, {parse_mode: 'Markdown'});
    }
  }

  else{
    await bot.sendMessage(chatId, `No transfers !`, menuBtn, {parse_mode: 'Markdown'});
  }

}

async function showMoreTransfersFunction(chatId, address, chain){  
  if(!userTransfersArray[chatId] || !userTransfersShown[chatId]){
    return bot.sendMessage(chatId, 'An unknown error has occurred!', menuBtn);
  }


  if(userTransfersShown[chatId] >= userTransfersArray[chatId].length){
    return bot.sendMessage(chatId, 'Nothing more to show', menuBtn);
  }


  let startIndex = parseInt(userTransfersShown[chatId]);
  userTransfersShown[chatId] = parseInt(userTransfersShown[chatId]) + 5;
  let leftToShow = userTransfersArray[chatId].length - parseInt(userTransfersShown[chatId]);

  if(leftToShow > 0){
    await bot.sendMessage(chatId,  `${userTransfersArray[chatId].slice(startIndex, startIndex+5).join("")}`, {parse_mode: 'HTML'});
    await bot.sendMessage(chatId, `${leftToShow} more transfers not shown`, showMoreTransfers);
  } 
  else{
    await bot.sendMessage(chatId,  `${userTransfersArray[chatId].slice(startIndex, startIndex+5).join("")}`, {reply_markup: JSON.stringify({ inline_keyboard: [ [{text: 'Menu', callback_data: '/menu'}], ] }), parse_mode: 'HTML'});
  }
}

async function showMoreBalanceFunction(chatId, address, chain){  
  if(!userTokensArray[chatId] || !userTokensShown[chatId]){
    return bot.sendMessage(chatId, 'An unknown error has occurred!', menuBtn);
  }

  if(userTokensShown[chatId] >= userTokensArray[chatId].length){
    return bot.sendMessage(chatId, 'Nothing more to show', menuBtn);
  }

  let startIndex = parseInt(userTokensShown[chatId]);
  userTokensShown[chatId] = parseInt(userTokensShown[chatId]) + 10;
  let leftToShow = userTokensArray[chatId].length - parseInt(userTokensShown[chatId]);

  if(leftToShow > 0){
    await bot.sendMessage(chatId,  `${userTokensArray[chatId].slice(startIndex, startIndex+10).join("")}`, {parse_mode: 'Markdown'});
    await bot.sendMessage(chatId, `${leftToShow} more tokens not shown`, showMore);
  } 
  else{
    await bot.sendMessage(chatId,  `${userTokensArray[chatId].slice(startIndex, startIndex+10).join("")}`, {reply_markup: JSON.stringify({ inline_keyboard: [ [{text: 'Menu', callback_data: '/menu'}], ] }), parse_mode: 'Markdown'});
  }
}

const start = async () => {
    bot.setMyCommands([
        {command: '/start', description: 'Welcome message'},
        {command: '/menu', description: 'Bot menu options'},
    ])

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;

        try {
            if (text === '/start') {
                awaitWallet[chatId] = false;
                return bot.sendMessage(chatId, `Hi, ${msg.from.first_name} !\nWelcome to Unmarshal Wallet Tracker Bot!\n\nClick on button below or use /menu command to see all my functions`, menuBtn);
            }
            if (text === '/menu') {
                awaitWallet[chatId] = false;
                awaitBalance[chatId] = false;
                awaitTransfers[chatId] = false;
                return openMenu(chatId);
            }

            if(awaitWallet[chatId] && usersChain[chatId] && awaitBalance[chatId]){
              if(!(addressRegex.test(text.trim()))){
                return bot.sendMessage(chatId, `Incorrect wallet address. Try again or go back /menu`, menuBtn);
              } 
              else{
                usersWallet[chatId] = text.trim();
                awaitWallet[chatId] = false;
                await bot.sendMessage(chatId, `Wait, please...`);
                return getBalance(chatId, text.trim(), usersChain[chatId]);
              }
            }

            if(awaitWallet[chatId] && usersChain[chatId] && awaitTransfers[chatId]){
              if(!(addressRegex.test(text.trim()))){
                return bot.sendMessage(chatId, `Incorrect wallet address. Try again or go back /menu`, menuBtn);
              } 
              else{
                usersWallet[chatId] = text.trim();
                awaitTransfers[chatId] = false;
                await bot.sendMessage(chatId, `Wait, please...`);
                return getTransfers(chatId, text.trim(), usersChain[chatId]);
              }
            }

            return bot.sendMessage(chatId, `I don't understand you !`, menuBtn);

        } catch (e) {
            return bot.sendMessage(chatId, 'An unknown error has occurred!');
        }

    })

    bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === '/again') {
            return startGame(chatId)
        }

        if (data === '/menu') {
            return openMenu(chatId);
        }

        if (data === '/balance') {
            awaitWallet[chatId] = false;
            awaitBalance[chatId] = false;
            awaitTransfers[chatId] = false;
            usersChain[chatId] = false;
            return choseChain(chatId, "balance");
        }

        if (data === '/transfers') {
            awaitWallet[chatId] = false;
            awaitBalance[chatId] = false;
            awaitTransfers[chatId] = false;
            usersChain[chatId] = false;
            return choseChain(chatId, "transfers");
        }

        if (data === '/ethereum_balance' || data === '/bsc_balance' || data === '/matic_balance') {
            usersChain[chatId] = data.split("_")[0].substr(1);
            awaitWallet[chatId] = true;
            awaitBalance[chatId] = true;
            awaitTransfers[chatId] = false;

            inputWallet(chatId, data);
        }

        if (data === '/ethereum_transfers' || data === '/bsc_transfers' || data === '/matic_transfers') {
            usersChain[chatId] = data.split("_")[0].substr(1);
            awaitWallet[chatId] = true;
            awaitBalance[chatId] = false;
            awaitTransfers[chatId] = true;

            inputWallet(chatId, data);  
        }

        if (data === '/showMore') {
            return showMoreBalanceFunction(chatId, usersWallet[chatId], usersChain[chatId]);
        }

        if (data === '/showMoreTransfers') {
            return showMoreTransfersFunction(chatId, usersWallet[chatId], usersChain[chatId]);
        }
    })
}

start()
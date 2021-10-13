import enum
import logging
import operator
import os
import sys
import prettytable as pt
import requests
from telegram import ParseMode
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger()

# Constants
URL = "https://api.unmarshal.com"
authKey = os.getenv("UNMARSHAL_API_KEY")
mode = os.getenv("MODE")
token = os.getenv("TOKEN")


class Chain(enum.Enum):
    bsc = "bsc"
    ethereum = "eth"


if mode == "dev":
    def run(updater):
        updater.start_polling()
elif mode == "prod":
    def run(updater):
        port = int(os.environ.get("PORT", "8443"))
        heroku_app_name = os.environ.get("HEROKU_APP_NAME")
        updater.start_webhook(listen="0.0.0.0",
                              port=port,
                              url_path=token)
        updater.bot.set_webhook("https://{}.herokuapp.com/{}".format(heroku_app_name, token))
else:
    logger.error("No MODE specified!")
    sys.exit(1)


def start(update, context):
    update.message.reply_text(
        "Hi! I'm Unmarshal Bot. You can get all your crypto-currency info from me!\n\n" + "Commands:\n" +
        "/assets <address> <chain>: For top 5 token holdings of the user by value\n"
        "/last <address> <chain>: For the last 5 transactions of the user\n\n"
        "I only support eth and bsc chains as of now!")


def assets(update, context):
    address, chain, valid = resolve_input(update)
    if not valid:
        return
    api = "/v1/{}/address/{}/assets".format(chain.name, address)
    r = requests.get(url=URL + api, params={"auth_key": authKey})
    response = r.json()
    if len(response) == 0:
        update.message.reply_text("The address does not hold any assets!")
    response.sort(key=operator.itemgetter("quote"), reverse=True)
    table = pt.PrettyTable(['Token', 'Balance', 'Price', '24hr % change'])
    table.align['Token'] = 'l'
    table.align['Balance'] = 'r'
    table.align['Price'] = 'r'
    table.align['24hr % change'] = 'r'
    upto = min(len(response), 5)
    for i in range(0, upto):
        balance = response[i]["balance"]
        decimal = response[i]["contract_decimals"]
        table.add_row([response[i]["contract_ticker_symbol"],
                       f'{balance[0:len(balance) - decimal] + "." + balance[len(balance) - decimal:5]}',
                       f'{response[i]["quote_rate"]}', f'{response[i]["quote_pct_change_24h"]}'])
    update.message.reply_text(f'<pre>{table}</pre>', parse_mode=ParseMode.HTML)


def resolve_input(update):
    valid = True
    inp = str(update.message.text).split(" ")
    if len(inp) < 3:
        update.message.reply_text("Sorry, you have not entered an address or chain!")
        valid = False
    address = inp[1]
    chain = Chain.ethereum
    try:
        chain = Chain(inp[2])
    except ValueError:
        update.message.reply_text("Sorry, you have entered a chain I do not support yet!")
        valid = False
    return address, chain, valid


def last(update, context):
    address, chain, valid = resolve_input(update)
    if not valid:
        return
    api = "/v1/{}/address/{}/transactions?page=1&pageSize=5".format(chain.name, address)
    r = requests.get(url=URL + api, params={"auth_key": authKey, "page": 1, "pageSize": 5})
    response = r.json()["transactions"]
    table = pt.PrettyTable(['Tx Hash', 'Description', 'Status'])
    table.align['Token'] = 'l'
    table.align['Description'] = 'r'
    table.align['Status'] = 'r'
    upto = min(len(response), 5)
    for i in range(0, upto):
        table.add_row([response[i]["id"], response[i]["description"], response[i]["status"]])
    update.message.reply_text(f'<pre>{table}</pre>', parse_mode=ParseMode.HTML)


def invalid(update, context):
    update.message.reply_text("Sorry, I dont understand what you mean. Try /start or /help")


def error(update, context):
    logger.warning('Update caused error "%s"', context.error)


def main():
    updater = Updater(token, use_context=True)
    dp = updater.dispatcher

    # commands
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("help", start))
    dp.add_handler(CommandHandler("assets", assets))
    dp.add_handler(CommandHandler("last", last))
    dp.add_handler(MessageHandler(Filters.text, invalid))

    # log all errors
    dp.add_error_handler(error)

    # Start the Bot
    run(updater)


if __name__ == '__main__':
    main()

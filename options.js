module.exports = {
     gameOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: '1', callback_data: '1'}, {text: '2', callback_data: '2'}, {text: '3', callback_data: '3'}],
                [{text: '4', callback_data: '4'}, {text: '5', callback_data: '5'}, {text: '6', callback_data: '6'}],
                [{text: '7', callback_data: '7'}, {text: '8', callback_data: '8'}, {text: '9', callback_data: '9'}],
                [{text: '0', callback_data: '0'}],
            ]
        })
    },

    againOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Играть еще раз', callback_data: '/again'}],
            ]
        })
    },

    menuBtn: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Menu', callback_data: '/menu'}],
            ]
        })
    },

    menuOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Wallet tokens balance', callback_data: '/balance'}],
                [{text: 'Token transfers history', callback_data: '/transfers'}],
            ]
        })
    },

    chainOptionsBalance: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Ethereum', callback_data: '/ethereum_balance'}, {text: 'BSC', callback_data: '/bsc_balance'}],
                [{text: 'Matic / Polygon', callback_data: '/matic_balance'}],
                [{text: 'Back to Menu', callback_data: '/menu'}]
            ]
        })
    },

    chainOptionsTransfers: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Ethereum', callback_data: '/ethereum_transfers'}, {text: 'BSC', callback_data: '/bsc_transfers'}],
                [{text: 'Matic / Polygon', callback_data: '/matic_transfers'}],
                [{text: 'Back to Menu', callback_data: '/menu'}]
            ]
        })
    },

    showMore: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Show more tokens', callback_data: '/showMore'}],
                [{text: 'Menu', callback_data: '/menu'}]
            ]
        })
    },

    showMoreTransfers: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Show more transfers', callback_data: '/showMoreTransfers'}],
                [{text: 'Menu', callback_data: '/menu'}]
            ]
        })
    },
}
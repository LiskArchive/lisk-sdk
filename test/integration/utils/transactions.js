'use strict';

var lisk = require('lisk-js');

module.exports = {

	generateValidTransaction: function () {
		var gAccountPassphrase = 'wagon stock borrow episode laundry kitten salute link globe zero feed marble';
		var randomAddress = lisk.crypto.getAddress(lisk.crypto.getKeys(Math.random().toString(36).substring(7)).publicKey);

		return lisk.transaction.createTransaction(randomAddress, 1, gAccountPassphrase);
	}
};

'use strict';

var randomstring = require('randomstring');
var lisk = require('lisk-js');
var constants = require('../../../helpers/constants');
var accounts = require('./accounts');

var random = {};

// Returns a random index for an array
random.randomizeSelection = function (length) {
	return Math.floor(Math.random() * length);
};

// Returns a random number between min (inclusive) and max (exclusive)
random.randomNumber = function (min, max) {
	return	Math.floor(Math.random() * (max - min) + min);
};

// Returns the expected fee for the given amount with data property
random.expectedFeeForTransactionWithData = function () {
	return parseInt(constants.fees.send) + parseInt(constants.fees.data);
};

// Returns a random username of 16 characters
random.randomUsername = function () {
	var randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = randomstring.generate({
		length: 15,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random delegate name of 20 characters
random.randomDelegateName = function () {
	var randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = randomstring.generate({
		length: 19,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random capitialized username of 16 characters
random.randomCapitalUsername = function () {
	var randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'uppercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = randomstring.generate({
		length: 16,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random application name of 32 characteres
random.randomApplicationName = function () {
	var custom = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	return randomstring.generate({
		length: random.randomNumber(5, 32),
		charset: custom
	});
};

// Test random application
random.randomApplication = function () {
	return {
		category: random.randomNumber(0, 9),
		name: random.randomApplicationName(),
		description: 'Blockchain based home monitoring tool',
		tags: 'monitoring temperature power sidechain',
		type: random.randomNumber(0, 2),
		link: 'https://' + random.randomApplicationName() + '.zip',
		icon: 'https://raw.githubusercontent.com/MaxKK/blockDataDapp/master/icon.png'
	};
};

// Test applications
random.guestbookDapp = random.randomApplication();
random.blockDataDapp = random.randomApplication();

// Returns a basic random account
random.randomAccount = function () {
	var account = {
		balance: '0'
	};
	account.password = random.randomPassword();
	account.secondPassword = random.randomPassword();
	account.username = random.randomDelegateName();
	account.publicKey = lisk.crypto.getKeys(account.password).publicKey;
	account.address = lisk.crypto.getAddress(account.publicKey);
	account.secondPublicKey = lisk.crypto.getKeys(account.secondPassword).publicKey;

	return account;
};

// Returns an random basic transaction to send 1 LSK from genesis account to a random account
random.randomTransaction = function (offset) {
	var randomAccount = random.randomAccount();
	return lisk.transaction.createTransaction(randomAccount.address, 1, accounts.gAccount.password, offset);
};

// Returns a random password
random.randomPassword = function () {
	return Math.random().toString(36).substring(7);
};

// Returns a random property from the given object
random.randomProperty = function (obj, needKey) {
	var keys = Object.keys(obj);

	if (!needKey) {
		return obj[keys[keys.length * Math.random() << 0]];
	} else {
		return keys[keys.length * Math.random() << 0];
	}
};

// Returns random LSK amount
random.randomLISK = function () {
	return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
};

module.exports = random;

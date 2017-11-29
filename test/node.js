'use strict';

// Root object
var node = {};

var Promise = require('bluebird');
var rewire  = require('rewire');
var sinon   = require('sinon');
var strftime = require('strftime').utc();

// Application specific
var slots     = require('../helpers/slots.js');
var swaggerHelper = require('../helpers/swagger');

// Requires
node.bignum = require('../helpers/bignum.js');
node.config = require('./data/config.json');
node.constants = require('../helpers/constants.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.transactionTypes = require('../helpers/transactionTypes.js');
node._ = require('lodash');
node.async = require('async');
node.popsicle = require('popsicle');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();
node.lisk = require('lisk-js');
node.supertest = require('supertest');
node.Promise = require('bluebird');
node.randomString = require('randomstring');

var jobsQueue = require('../helpers/jobsQueue.js');

node.config.root = process.cwd();

require('colors');

// Node configuration
node.baseUrl = 'http://' + node.config.address + ':' + node.config.httpPort;
node.api = node.supertest(node.baseUrl);

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = node.config.version; // Node version
node.nonce = node.randomString.generate(16);

// Transaction fees
node.fees = {
	voteFee: node.constants.fees.vote,
	transactionFee: node.constants.fees.send,
	secondPasswordFee: node.constants.fees.secondSignature,
	delegateRegistrationFee: node.constants.fees.delegate,
	multisignatureRegistrationFee: node.constants.fees.multisignature,
	dappRegistrationFee: node.constants.fees.dappRegistration,
	dappDepositFee: node.constants.fees.dappDeposit,
	dappWithdrawalFee: node.constants.fees.dappWithdrawal,
	dataFee: node.constants.fees.data
};

// Existing delegate account
node.eAccount = {
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	password: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100'
};

// Genesis account, initially holding 100M total supply
node.gAccount = {
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	password: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000',
	encryptedSecret: 'ddbb37d465228d52a78ad13555e609750ec30e8f5912a1b8fbdb091f50e269cbcc3875dad032115e828976f0c7f5ed71ce925e16974233152149e902b48cec51d93c2e40a6c95de75c1c5a2c369e6d24',
	key: 'elephant tree paris dragon chair galaxy',
};

node.swaggerDef = swaggerHelper.getSwaggerSpec();

node._.mixin({
	/**
	 * Lodash mixin to sort collection case-insensitively.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	dbSort: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return node._.clone(arr).sort(function (a, b ) {
			// If first element is empty push it downard
			if(!node._.isEmpty(a) && node._.isEmpty(b)) { return sortFactor * -1; }

			// If second element is empty pull it upward
			if(node._.isEmpty(a) && !node._.isEmpty(b)) { return sortFactor * 1; }

			// If both are empty keep same order
			if(node._.isEmpty(a) && node._.isEmpty(b)) { return sortFactor * 0; }

			// Convert to lower case and remove special characters
			var s1lower = a.toLowerCase().replace(/[^a-z0-9]/g, '');
			var s2lower = b.toLowerCase().replace(/[^a-z0-9]/g, '');

			return s1lower.localeCompare(s2lower) * sortFactor;
		});
	},

	/**
	 * Lodash mixin to check occurrence of a value in end of of array.
	 * @param {Array} arr - Array to be checked.
	 * @param {*} valueCheck - Value to check for.
	 * @return {boolean}
	 */
	appearsInLast: function (arr, valueCheck) {
		// Get list of indexes of desired value
		var indices = node._.compact(arr.map(function (data, index) {
			if (data === valueCheck ) { return index; }
		}));

			// If last occurrence appears at the end of array
		if (indices[indices.length - 1] === arr.length - 1 &&
			// If first and last occurrence appears without any gaps
			indices.length === (indices[indices.length - 1] - indices[0] + 1)) {
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Lodash mixin to sort integer array correctly. Node default sort method sort them by ASCII codes.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	sortNumbers: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return arr.sort(function (a, b) {
			return (a - b) * sortFactor;
		});
	}
}, {chain: false});

// Random LSK amount
node.LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1;

// Returns a random property from the given object
node.randomProperty = function (obj, needKey) {
	var keys = Object.keys(obj);

	if (!needKey) {
		return obj[keys[keys.length * Math.random() << 0]];
	} else {
		return keys[keys.length * Math.random() << 0];
	}
};

// Returns random LSK amount
node.randomLISK = function () {
	return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
};

// Returns current block height
node.getHeight = function (cb) {
	var request = node.popsicle.get(node.baseUrl + '/api/node/status');

	request.use(node.popsicle.plugins.parse(['json']));

	request.then(function (res) {
		if (res.status !== 200) {
			return setImmediate(cb, ['Received bad response code', res.status, res.url].join(' '));
		} else {
			return setImmediate(cb, null, res.body.data.height);
		}
	});

	request.catch(function (err) {
		return setImmediate(cb, err);
	});
};

// Returns a random index for an array
node.randomizeSelection = function (length) {
	return Math.floor(Math.random() * length);
};

// Returns a random number between min (inclusive) and max (exclusive)
node.randomNumber = function (min, max) {
	return	Math.floor(Math.random() * (max - min) + min);
};

// Returns the expected fee for the given amount
node.expectedFee = function (amount) {
	return parseInt(node.fees.transactionFee);
};

// Returns the expected fee for the given amount with data property
node.expectedFeeForTransactionWithData = function (amount) {
	return parseInt(node.fees.transactionFee) + parseInt(node.fees.dataFee);
};

// Returns a random username of 16 characters
node.randomUsername = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 15,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random delegate name of 20 characters
node.randomDelegateName = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 19,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random capitialized username of 16 characters
node.randomCapitalUsername = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'uppercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 15,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random application name of 32 characteres
node.randomApplicationName = function () {
	var custom = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	return node.randomString.generate({
		length: node.randomNumber(5, 32),
		charset: custom
	});
};

// Test random application
node.randomApplication = function () {
	var application = {
		category: node.randomNumber(0, 9),
		name: node.randomApplicationName(),
		description: 'Blockchain based home monitoring tool',
		tags: 'monitoring temperature power sidechain',
		type: node.randomNumber(0, 2),
		link: 'https://' + node.randomApplicationName() + '.zip',
		icon: 'https://raw.githubusercontent.com/MaxKK/blockDataDapp/master/icon.png'
	};

	return application;
};

// Test applications
node.guestbookDapp = node.randomApplication();
node.blockDataDapp = node.randomApplication();

// Returns a basic random account
node.randomAccount = function () {
	var account = {
		balance: '0'
	};

	account.password = node.randomPassword();
	account.secondPassword = node.randomPassword();
	account.username = node.randomDelegateName();
	account.publicKey = node.lisk.crypto.getKeys(account.password).publicKey;
	account.address = node.lisk.crypto.getAddress(account.publicKey);
	account.secondPublicKey = node.lisk.crypto.getKeys(account.secondPassword).publicKey;

	return account;
};

// Returns an random basic transaction to send 1 LSK from genesis account to a random account
node.randomTransaction = function (offset) {
	var randomAccount = node.randomAccount();

	return node.lisk.transaction.createTransaction(randomAccount.address, 1, node.gAccount.password, offset);
};

// Returns a random password
node.randomPassword = function () {
	return Math.random().toString(36).substring(7);
};

// Exports
module.exports = node;

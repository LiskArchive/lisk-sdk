'use strict';

// Requires
var _ = require('lodash');
var expect = require('chai').expect;
var chai = require('chai');
var lisk = require('./lisk-js');
var supertest = require('supertest');
var async = require('async');
var request = require('request');

var bignum = require('../helpers/bignum.js');
var DappCategory = require('../helpers/dappCategories.js');
var DappType = require('../helpers/dappTypes.js');
var TxTypes = require('../helpers/transactionTypes.js');

// Node configuration
var config = require('../config.json');
var baseUrl = 'http://' + config.address + ':' + config.port;
var api = supertest(baseUrl + '/api');
var peer = supertest(baseUrl + '/peer');
var constants = require('../helpers/constants.js');

var normalizer = 100000000; // Use this to convert LISK amount to normal value
var blockTime = 10000; // Block time in miliseconds
var blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
var version = '0.0.0'; // Node version

// Transaction fees
var Fees = {
	voteFee: constants.fees.vote,
	transactionFee: constants.fees.send,
	secondPasswordFee: constants.fees.secondsignature,
	delegateRegistrationFee: constants.fees.delegate,
	multisignatureRegistrationFee: constants.fees.multisignature,
	dappAddFee: constants.fees.dapp
};

// Test application
var guestbookDapp = {
	icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
	link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip'
};

// Existing delegate account
var Eaccount = {
	'address': '10881167371402274308L',
	'publicKey': 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	'password': 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	'balance': '0',
	'delegateName': 'genesis_100'
};

// Genesis account, initially holding 100M total supply
var Gaccount = {
	'address': '16313739661670634666L',
	'publicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	'password': 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	'balance': '10000000000000000'
};

// Random LSK amount
var LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1;

// Returns a random delegate name
function randomDelegateName () {
	var size = randomNumber(1, 20); // Min. delegate name size is 1, Max. delegate name is 20
	var delegateName = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size; i++) {
		delegateName += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return delegateName;
}

// Returns a random property from the given object
function randomProperty (obj, needKey) {
	var keys = Object.keys(obj);

	if (!needKey) {
		return obj[keys[keys.length * Math.random() << 0]];
	} else {
		return keys[keys.length * Math.random() << 0];
	}
}

// Returns random LSK amount
function randomLISK () {
	return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
}

// Returns current block height
function getHeight (cb) {
	request({
		type: 'GET',
		url: baseUrl + '/api/blocks/getHeight',
		json: true
	}, function (err, resp, body) {
		if (err || resp.statusCode !== 200) {
			return cb(err || 'Status code is not 200 (getHeight)');
		} else {
			return cb(null, body.height);
		}
	});
}

function onNewBlock (cb) {
	getHeight(function (err, height) {
		// console.log('Height: ' + height);
		if (err) {
			return cb(err);
		} else {
			waitForNewBlock(height, cb);
		}
	});
}

// Wait until a new block has been created
function waitForNewBlock (height, cb) {
	var actualHeight = height;
	var counter = 1;

	async.doWhilst(
		function (cb) {
			request({
				type: 'GET',
				url: baseUrl + '/api/blocks/getHeight',
				json: true
			}, function (err, resp, body) {
				if (err || resp.statusCode !== 200) {
					return cb(err || 'Got incorrect status');
				}

				if (height + 2 === body.height) {
					height = body.height;
				}

				console.log('	Waiting for block:', 'Height:', height, 'Second:', counter++);
				setTimeout(cb, 1000);
			});
		},
		function () {
			return actualHeight === height;
		},
		function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, height);
			}
		}
	);
}

// Adds peers to local node
function addPeers (numOfPeers, cb) {
	var operatingSystems = ['win32','win64','ubuntu','debian', 'centos'];
	var ports = [4000, 5000, 7000, 8000];

	var os,version,port;

	var i = 0;
	async.whilst(function () {
		return i < numOfPeers;
	}, function (next) {
		os = operatingSystems[randomizeSelection(operatingSystems.length)];
		version = config.version;
		port = ports[randomizeSelection(ports.length)];

		request({
			type: 'GET',
			url: baseUrl + '/peer/height',
			json: true,
			headers: {
				'version': version,
				'port': port,
				'nethash': config.nethash,
				'os': os
			}
		}, function (err, resp, body) {
			if (err || resp.statusCode !== 200) {
				return next(err || 'Status code is not 200 (getHeight)');
			} else {
				i++;
				next();
			}
		});
	}, function (err) {
		return cb(err);
	});
}

// Returns a random index for an array
function randomizeSelection (length) {
	return Math.floor(Math.random() * length);
}

// Returns a random number between min (inclusive) and max (exclusive)
function randomNumber (min, max) {
	return	Math.floor(Math.random() * (max - min) + min);
}

// Returns the expected fee for the given amount
function expectedFee (amount) {
	return parseInt(Fees.transactionFee);
}

// Returns a random username
function randomUsername () {
	var size = randomNumber(1,16); // Min. username size is 1, Max. username size is 16
	var username = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size; i++) {
		username += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return username;
}

// Returns a random capitialized username
function randomCapitalUsername () {
	var size = randomNumber(1, 16); // Min. username size is 1, Max. username size is 16
	var username = 'A';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size - 1; i++) {
		username += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return username;
}

// Returns a basic random account
function randomAccount () {
	var account = {
		'balance': '0'
	};

	account.password = randomPassword();
	account.secondPassword = randomPassword();
	account.username = randomDelegateName();
	account.publicKey = lisk.crypto.getKeys(account.password).publicKey;
	account.address = lisk.crypto.getAddress(account.publicKey);

	return account;
}

// Returns an extended random account
function randomTxAccount () {
	return _.defaults(randomAccount(), {
		sentAmount:'',
		paidFee: '',
		totalPaidFee: '',
		transactions: []
	});
}

// Returns a random password
function randomPassword () {
	return Math.random().toString(36).substring(7);
}

// Get the given path
function get (path, done) {
	api.get(path)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

// Post to the given path
function post (path, params, done) {
	api.post(path)
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

// Put to the given path
function put (path, params, done) {
	api.put(path)
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

// Exports
module.exports = {
	addPeers: addPeers,
	api: api,
	bignum: bignum,
	blockTime: blockTime,
	blockTimePlus: blockTimePlus,
	chai: chai,
	config: config,
	DappCategory: DappCategory,
	DappType: DappType,
	Eaccount: Eaccount,
	expect: expect,
	expectedFee: expectedFee,
	Fees: Fees,
	Gaccount: Gaccount,
	get: get,
	getHeight: getHeight,
	guestbookDapp: guestbookDapp,
	lisk : lisk,
	LISK: LISK,
	normalizer: normalizer,
	onNewBlock: onNewBlock,
	peer: peer,
	post: post,
	put: put,
	randomAccount: randomAccount,
	randomCapitalUsername: randomCapitalUsername,
	randomDelegateName: randomDelegateName,
	randomLISK: randomLISK,
	randomNumber: randomNumber,
	randomPassword: randomPassword,
	randomProperty: randomProperty,
	randomTxAccount: randomTxAccount,
	randomUsername: randomUsername,
	supertest: supertest,
	TxTypes: TxTypes,
	version: version,
	waitForNewBlock: waitForNewBlock
};

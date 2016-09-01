'use strict';

// Root object
var node = {};

// Requires
node._ = require('lodash');
node.async = require('async');
node.request = require('request');
node.expect = require('chai').expect;
node.chai = require('chai');
node.lisk = require('./lisk-js');
node.supertest = require('supertest');

node.bignum = require('../helpers/bignum.js');
node.config = require('../config.json');
node.constants = require('../helpers/constants.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.txTypes = require('../helpers/transactionTypes.js');

// Node configuration
node.baseUrl = 'http://' + node.config.address + ':' + node.config.port;
node.api = node.supertest(node.baseUrl + '/api');
node.peer = node.supertest(node.baseUrl + '/peer');

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = '0.0.0'; // Node version

// Transaction fees
node.fees = {
	voteFee: node.constants.fees.vote,
	transactionFee: node.constants.fees.send,
	secondPasswordFee: node.constants.fees.secondsignature,
	delegateRegistrationFee: node.constants.fees.delegate,
	multisignatureRegistrationFee: node.constants.fees.multisignature,
	dappAddFee: node.constants.fees.dapp
};

// Test application
node.guestbookDapp = {
	icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
	link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip'
};

// Existing delegate account
node.eAccount = {
	'address': '10881167371402274308L',
	'publicKey': 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	'password': 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	'balance': '0',
	'delegateName': 'genesis_100'
};

// Genesis account, initially holding 100M total supply
node.gAccount = {
	'address': '16313739661670634666L',
	'publicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	'password': 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	'balance': '10000000000000000'
};

// Random LSK amount
node.LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1;

// Returns a random delegate name
node.randomDelegateName = function () {
	var size = node.randomNumber(1, 20); // Min. delegate name size is 1, Max. delegate name is 20
	var delegateName = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size; i++) {
		delegateName += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return delegateName;
};

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
	node.request({
		type: 'GET',
		url: node.baseUrl + '/api/blocks/getHeight',
		json: true
	}, function (err, resp, body) {
		if (err || resp.statusCode !== 200) {
			return cb(err || 'Status code is not 200 (getHeight)');
		} else {
			return cb(null, body.height);
		}
	});
};

// Upon detecting a new block, do something
node.onNewBlock = function (cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			node.waitForNewBlock(height, cb);
		}
	});
};

// Waits for a new block to be created
node.waitForNewBlock = function (height, cb) {
	var actualHeight = height;
	var counter = 1;

	node.async.doWhilst(
		function (cb) {
			node.request({
				type: 'GET',
				url: node.baseUrl + '/api/blocks/getHeight',
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
};

// Adds peers to local node
node.addPeers = function (numOfPeers, cb) {
	var operatingSystems = ['win32','win64','ubuntu','debian', 'centos'];
	var ports = [4000, 5000, 7000, 8000];

	var os,version,port;

	var i = 0;
	node.async.whilst(function () {
		return i < numOfPeers;
	}, function (next) {
		os = operatingSystems[node.randomizeSelection(operatingSystems.length)];
		version = node.config.version;
		port = ports[node.randomizeSelection(ports.length)];

		node.request({
			type: 'GET',
			url: node.baseUrl + '/peer/height',
			json: true,
			headers: {
				'version': version,
				'port': port,
				'nethash': node.config.nethash,
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

// Returns a random username
node.randomUsername = function () {
	var size = node.randomNumber(1, 16); // Min. username size is 1, Max. username size is 16
	var username = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size; i++) {
		username += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return username;
};

// Returns a random capitialized username
node.randomCapitalUsername = function () {
	var size = node.randomNumber(1, 16); // Min. username size is 1, Max. username size is 16
	var username = 'A';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.';

	for (var i = 0; i < size - 1; i++) {
		username += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return username;
};

// Returns a basic random account
node.randomAccount = function () {
	var account = {
		'balance': '0'
	};

	account.password = node.randomPassword();
	account.secondPassword = node.randomPassword();
	account.username = node.randomDelegateName();
	account.publicKey = node.lisk.crypto.getKeys(account.password).publicKey;
	account.address = node.lisk.crypto.getAddress(account.publicKey);

	return account;
};

// Returns an extended random account
node.randomTxAccount = function () {
	return node._.defaults(node.randomAccount(), {
		sentAmount:'',
		paidFee: '',
		totalPaidFee: '',
		transactions: []
	});
};

// Returns a random password
node.randomPassword = function () {
	return Math.random().toString(36).substring(7);
};

// Get the given path
node.get = function (path, done) {
	node.api.get(path)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
};

// Post to the given path
node.post = function (path, params, done) {
	node.api.post(path)
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
};

// Put to the given path
node.put = function (path, params, done) {
	node.api.put(path)
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
};

// Exports
module.exports = node;

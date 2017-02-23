'use strict';

// Root object
var node = {};

// Requires
node.bignum = require('../helpers/bignum.js');
node.config = require('../config.json');
node.constants = require('../helpers/constants.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.txTypes = require('../helpers/transactionTypes.js');

node._ = require('lodash');
node.async = require('async');
node.popsicle = require('popsicle');
node.expect = require('chai').expect;
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.lisk = require('./lisk-js');
node.supertest = require('supertest');
require('colors');

// Node configuration
node.baseUrl = 'http://' + node.config.address + ':' + node.config.port;
node.api = node.supertest(node.baseUrl);

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = node.config.version; // Node version

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
	balance: '10000000000000000'
};

// Optional logging
if (process.env.SILENT === 'true') {
	node.debug = function () {};
} else {
	node.debug = console.log;
}

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
	var request = node.popsicle.get(node.baseUrl + '/api/blocks/getHeight');

	request.use(node.popsicle.plugins.parse(['json']));

	request.then(function (res) {
		if (res.status !== 200) {
			return setImmediate(cb, ['Received bad response code', res.status, res.url].join(' '));
		} else {
			return setImmediate(cb, null, res.body.height);
		}
	});

	request.catch(function (err) {
		return setImmediate(cb, err);
	});
};

// Upon detecting a new block, do something
node.onNewBlock = function (cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			node.waitForNewBlock(height, 2, cb);
		}
	});
};

// Waits for (n) blocks to be created
node.waitForBlocks = function (blocksToWait, cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			node.waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Waits for a new block to be created
node.waitForNewBlock = function (height, blocksToWait, cb) {
	var actualHeight = height;
	var counter = 1;

	node.async.doWhilst(
		function (cb) {
			var request = node.popsicle.get(node.baseUrl + '/api/blocks/getHeight');

			request.use(node.popsicle.plugins.parse(['json']));

			request.then(function (res) {
				if (res.status !== 200) {
					return cb(['Received bad response code', res.status, res.url].join(' '));
				}

				if (height + blocksToWait === res.body.height) {
					height = res.body.height;
				}

				node.debug('	Waiting for block:'.grey, 'Height:'.grey, height, 'Second:'.grey, counter++);
				setTimeout(cb, 1000);
			});

			request.catch(function (err) {
				return cb(err);
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
node.addPeers = function (numOfPeers, ip, cb) {
	var operatingSystems = ['win32','win64','ubuntu','debian', 'centos'];
	var port = 4000;
	var os, version;
	var i = 0;

	node.async.whilst(function () {
		return i < numOfPeers;
	}, function (next) {
		os = operatingSystems[node.randomizeSelection(operatingSystems.length)];
		version = node.version;

		var request = node.popsicle.get({
			url: node.baseUrl + '/peer/height',
			headers: {
				broadhash: node.config.nethash,
				height: 1,
				nethash: node.config.nethash,
				os: os,
				ip: ip,
				port: port,
				version: version
			}
		});

		request.use(node.popsicle.plugins.parse(['json']));

		request.then(function (res) {
			if (res.status !== 200) {
				return next(['Received bad response code', res.status, res.url].join(' '));
			} else {
				i++;
				next();
			}
		});

		request.catch(function (err) {
			return next(err);
		});
	}, function (err) {
		// Wait for peer to be swept to db
		setTimeout(function () {
			return cb(err, {os: os, version: version, port: port});
		}, 3000);
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

// Returns a random application name
node.randomApplicationName = function () {
	var size = node.randomNumber(1, 32); // Min. username size is 1, Max. username size is 32
	var name = 'A';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < size - 1; i++) {
		name += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return name;
};

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

// Abstract request
function abstractRequest (options, done) {
	var request = node.api[options.verb.toLowerCase()](options.path);

	request.set('Accept', 'application/json');
	request.set('version', node.version);
	request.set('nethash', node.config.nethash);
	request.set('ip', '0.0.0.0');
	request.set('port', node.config.port);

	request.expect('Content-Type', /json/);
	request.expect(200);

	if (options.params) {
		request.send(options.params);
	}

	node.debug(['> Path:'.grey, options.verb.toUpperCase(), options.path].join(' '));

	if (done) {
		request.end(function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res.body));
			done(err, res);
		});
	} else {
		return request;
	}
}

// Get the given path
node.get = function (path, done) {
	return abstractRequest({ verb: 'GET', path: path, params: null }, done);
};

// Post to the given path
node.post = function (path, params, done) {
	return abstractRequest({ verb: 'POST', path: path, params: params }, done);
};

// Put to the given path
node.put = function (path, params, done) {
	return abstractRequest({ verb: 'PUT', path: path, params: params }, done);
};

before(function (done) {
	require('./common/globalBefore').waitUntilBlockchainReady(done);
});

// Exports
module.exports = node;

'use strict';

var test = require('../test');
var node = require('../node');

var lisk = require('lisk-js');

var constants = require('../../helpers/constants');

var waitFor = require('./utils/waitFor');
var waitForBlocks = node.Promise.promisify(waitFor.blocks);

var accountFixtures = require('../fixtures/accounts');

var http = {
	abstractRequest: function (options, done) {
		var request = test.api[options.verb.toLowerCase()](options.path);

		request.set('Accept', 'application/json');
		request.expect(function (response) {
			if (response.statusCode !== 204 && (!response.headers['content-type'] || response.headers['content-type'].indexOf('json') === -1)) {
				return new Error('Unexpected content-type!');
			}
		});

		if (options.params) {
			request.send(options.params);
		}

		var verb = options.verb.toUpperCase();
		test.debug(['> Path:'.grey, verb, options.path].join(' '));
		if (verb === 'POST' || verb === 'PUT') {
			test.debug(['> Data:'.grey, JSON.stringify(options.params)].join(' '));
		}

		if (done) {
			request.end(function (err, res) {
				test.debug('> Status:'.grey, JSON.stringify(res ? res.statusCode : ''));
				test.debug('> Response:'.grey, JSON.stringify(res ? res.body : err));
				done(err, res);
			});
		} else {
			return request;
		}
	},

	// Get the given path
	get: function (path, done) {
		return this.abstractRequest({ verb: 'GET', path: path, params: null }, done);
	},

	// Post to the given path
	post: function (path, params, done) {
		return this.abstractRequest({ verb: 'POST', path: path, params: params }, done);
	},

	// Put to the given path
	put: function (path, params, done) {
		return this.abstractRequest({ verb: 'PUT', path: path, params: params }, done);
	}
};

/**
 * A helper method to get path based on swagger
 *
 * @param {String} path - A path component
 * @returns {String} - Full path to that endpoint
 */
function swaggerPathFor (path) {
	return node.swaggerDef.basePath + path;
}

function paramsHelper (url, params) {
	if (typeof params != 'undefined' && params != null && Array.isArray(params) && params.length > 0) {
		// It is an defined array with at least one element
		var queryString = params.join('&');
		url += '?' + queryString;
	}
	return url;
}

function httpCallbackHelperWithStatus (cb, err, res) {
	if (err) {
		return cb(err);
	}
	cb(null, {
		status: res.status,
		body: res.body
	});
}

function httpCallbackHelper (cb, err, res) {
	if (err) {
		return cb(err);
	}
	cb(null, res.body);
}

function httpResponseCallbackHelper (cb, err, res) {
	if (err) {
		return cb(err);
	}
	cb(null, res);
}

function getTransactionById (transactionId, cb) {
	// Get transactionById uses the same /api/transactions endpoint, this is just a helper function
	http.get('/api/transactions?id=' + transactionId, httpResponseCallbackHelper.bind(null, cb));
}

function getTransactions (params, cb) {
	var url = '/api/transactions';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function getUnconfirmedTransaction (transaction, cb) {
	http.get('/api/transactions/unconfirmed/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
}

function getUnconfirmedTransactions (cb) {
	http.get('/api/transactions/unconfirmed', httpCallbackHelper.bind(null, cb));
}

function getQueuedTransaction (transaction, cb) {
	http.get('/api/transactions/queued/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
}

function getQueuedTransactions (cb) {
	http.get('/api/transactions/queued', httpCallbackHelper.bind(null, cb));
}

function getMultisignaturesTransaction (transaction, cb) {
	http.get('/api/transactions/multisignatures/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
}

function getMultisignaturesTransactions (cb) {
	http.get('/api/transactions/multisignatures', httpCallbackHelper.bind(null, cb));
}

function getPendingMultisignatures (params, cb) {
	var url = '/api/multisignatures/pending';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function sendTransaction (transaction, cb) {
	http.post('/api/transactions', {transactions: [transaction]}, httpResponseCallbackHelper.bind(null, cb));
}

function sendTransactions (transactions, cb) {
	http.post('/api/transactions', {transactions: transactions}, httpResponseCallbackHelper.bind(null, cb));
}

function creditAccount (address, amount, cb) {
	var transaction = lisk.transaction.createTransaction(address, amount, accountFixtures.genesis.password);
	sendTransaction(transaction, cb);
}

function getCount (param, cb) {
	http.get('/api/' + param + '/count', httpCallbackHelper.bind(null, cb));
}

function registerDelegate (account, cb) {
	var transaction = node.lisk.delegate.createDelegate(account.password, account.username);
	sendTransaction(transaction, cb);
}

function getForgingStatus (params, cb) {
	var url = '/api/delegates/forging';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getDelegates (params, cb) {
	var url = '/api/delegates';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getDelegateVoters (params, cb) {
	var url = '/api/delegates/voters';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getVoters (params, cb) {
	var url = '/api/voters';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function searchDelegates (params, cb) {
	var url = '/api/delegates/search';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function putForgingDelegate (params, cb) {
	http.put('/api/delegates/forging', params, httpCallbackHelper.bind(null, cb));
}

function getForgedByAccount (params, cb) {
	var url = '/api/delegates/forging/getForgedByAccount';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getForgers (params, cb) {
	var url = '/api/delegates/forgers';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getAccounts (params, cb) {
	http.get('/api/accounts?' + params, httpCallbackHelperWithStatus.bind(null, cb));
}

function getBlocks (params, cb) {
	var url = '/api/blocks';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function waitForConfirmations (transactions, limitHeight) {
	limitHeight = limitHeight || 15;

	function checkConfirmations (transactions) {
		return node.Promise.all(transactions.map(function (transactionId) {
			return getTransactionByIdPromise(transactionId);
		})).then(function (res) {
			return node.Promise.each(res, function (result) {
				if (result.body.transactions.length === 0) {
					throw Error('Transaction not confirmed');
				}
			});
		});
	}

	function waitUntilLimit (limit) {
		if(limit == 0) {
			throw new Error('Exceeded limit to wait for confirmations');
		}
		limit -= 1;

		return waitForBlocks(1)
			.then(function (){
				return checkConfirmations(transactions);
			})
			.catch(function () {
				return waitUntilLimit(limit);
			});
	}

	// Wait a maximum of limitHeight*25 confirmed transactions
	return waitUntilLimit(limitHeight);
}

/**
 * Validate if the validation response contains error for a specific param
 *
 * @param {object} res - Response object got from server
 * @param {string} param - Param name to check
 */
function expectSwaggerParamError (res, param) {
	res.body.message.should.be.eql('Validation errors');
	res.body.errors.map(function (p) { return p.name; }).should.contain(param);
}

/**
 * Create a signature object for POST /api/signatures endpoint
 *
 * @param {Object} transaction - Transaction object
 * @param {Object} signer - Signer object including public key and password
 * @return {{signature: string, transactionId: string, publicKey: string}}
 */
function createSignatureObject (transaction, signer) {
	return {
		transactionId: transaction.id,
		publicKey: signer.publicKey,
		signature: node.lisk.multisignature.signTransaction(transaction, signer.password)
	};
}

var getTransactionByIdPromise = node.Promise.promisify(getTransactionById);
var getTransactionsPromise = node.Promise.promisify(getTransactions);
var getQueuedTransactionPromise = node.Promise.promisify(getQueuedTransaction);
var getQueuedTransactionsPromise = node.Promise.promisify(getQueuedTransactions);
var getUnconfirmedTransactionPromise = node.Promise.promisify(getUnconfirmedTransaction);
var getUnconfirmedTransactionsPromise = node.Promise.promisify(getUnconfirmedTransactions);
var getMultisignaturesTransactionPromise = node.Promise.promisify(getMultisignaturesTransaction);
var getMultisignaturesTransactionsPromise = node.Promise.promisify(getMultisignaturesTransactions);
var getPendingMultisignaturesPromise = node.Promise.promisify(getPendingMultisignatures);
var creditAccountPromise = node.Promise.promisify(creditAccount);
var sendTransactionPromise = node.Promise.promisify(sendTransaction);
var sendTransactionsPromise = node.Promise.promisify(sendTransactions);
var getCountPromise = node.Promise.promisify(getCount);
var registerDelegatePromise = node.Promise.promisify(registerDelegate);
var getForgingStatusPromise = node.Promise.promisify(getForgingStatus);
var getDelegatesPromise = node.Promise.promisify(getDelegates);
var getDelegateVotersPromise = node.Promise.promisify(getDelegateVoters);
var getVotersPromise = node.Promise.promisify(getVoters);
var searchDelegatesPromise = node.Promise.promisify(searchDelegates);
var putForgingDelegatePromise = node.Promise.promisify(putForgingDelegate);
var getForgedByAccountPromise = node.Promise.promisify(getForgedByAccount);
var getForgersPromise = node.Promise.promisify(getForgers);
var getAccountsPromise = node.Promise.promisify(getAccounts);
var getBlocksPromise = node.Promise.promisify(getBlocks);

module.exports = {
	getTransactionByIdPromise: getTransactionByIdPromise,
	getTransactionsPromise: getTransactionsPromise,
	getUnconfirmedTransactionPromise: getUnconfirmedTransactionPromise,
	getUnconfirmedTransactionsPromise: getUnconfirmedTransactionsPromise,
	getQueuedTransactionPromise: getQueuedTransactionPromise,
	getQueuedTransactionsPromise: getQueuedTransactionsPromise,
	getMultisignaturesTransactionPromise: getMultisignaturesTransactionPromise,
	getMultisignaturesTransactionsPromise: getMultisignaturesTransactionsPromise,
	getPendingMultisignaturesPromise: getPendingMultisignaturesPromise,
	sendTransactionPromise: sendTransactionPromise,
	sendTransactionsPromise: sendTransactionsPromise,
	creditAccount: creditAccount,
	creditAccountPromise: creditAccountPromise,
	getCount: getCount,
	getCountPromise: getCountPromise,
	registerDelegatePromise: registerDelegatePromise,
	getForgingStatus: getForgingStatus,
	getForgingStatusPromise: getForgingStatusPromise,
	getDelegates: getDelegates,
	getDelegatesPromise: getDelegatesPromise,
	getVoters: getVoters,
	getDelegateVotersPromise: getDelegateVotersPromise,
	getVotersPromise: getVotersPromise,
	searchDelegatesPromise: searchDelegatesPromise,
	putForgingDelegatePromise: putForgingDelegatePromise,
	getForgedByAccountPromise: getForgedByAccountPromise,
	getForgersPromise: getForgersPromise,
	getAccounts: getAccounts,
	getAccountsPromise: getAccountsPromise,
	getBlocksPromise: getBlocksPromise,
	waitForConfirmations: waitForConfirmations,
	expectSwaggerParamError: expectSwaggerParamError,
	createSignatureObject: createSignatureObject
};

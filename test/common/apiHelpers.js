'use strict';

var lisk = require('lisk-js');

var node = require('../node');
var http = require('./httpCommunication');
var constants = require('../../helpers/constants');

var waitForBlocks = node.Promise.promisify(node.waitForBlocks);

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

function getTransaction (transaction, cb) {
	http.get('/api/transactions/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
}

function getTransactions (params, cb) {
	var url = '/api/transactions';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
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
	http.post('/api/transactions', {transaction: transaction}, httpCallbackHelper.bind(null, cb));
}

function sendSignature (signature, transaction, cb) {
	http.post('/api/signatures', {signature: {signature: signature, transaction: transaction.id}}, httpResponseCallbackHelper.bind(null, cb));
}

function creditAccount (address, amount, cb) {
	var transaction = lisk.transaction.createTransaction(address, amount, node.gAccount.password);
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
	var url = '/api/delegates/forging/status';
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

function getNextForgers (params, cb) {
	var url = '/api/delegates/getNextForgers';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getAccounts (params, cb) {
	http.get('/api/accounts?' + params, httpCallbackHelper.bind(null, cb));
}

function getPublicKey (address, cb) {
	http.get('/api/accounts/getPublicKey?address=' + address, httpCallbackHelper.bind(null, cb));
}

function getBalance (address, cb) {
	http.get('/api/accounts/getBalance?address=' + address, httpCallbackHelper.bind(null, cb));
}

function getBlocks (params, cb) {
	var url = '/api/blocks';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function waitForConfirmations (transactions, limitHeight) {
	limitHeight = limitHeight || 10;

	function checkConfirmations (transactions) {
		return node.Promise.map(transactions, function (transaction) {
			return getTransactionPromise(transaction);
		})
			.then(function (res) {
				return node.Promise.each(res, function (result) {
					if (result.success === false) {
						throw Error(result.error);
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

function getDapp (dapp_id, cb) {
	http.get('/api/dapps/get?id=' + dapp_id, httpCallbackHelper.bind(null, cb));
}

function getDapps (params, cb) {
	var url = '/api/dapps';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getDappsCategories (params, cb) {
	var url = '/api/dapps/categories';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
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

var getTransactionPromise = node.Promise.promisify(getTransaction);
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
var sendSignaturePromise = node.Promise.promisify(sendSignature);
var getCountPromise = node.Promise.promisify(getCount);
var registerDelegatePromise = node.Promise.promisify(registerDelegate);
var getForgingStatusPromise = node.Promise.promisify(getForgingStatus);
var getDelegatesPromise = node.Promise.promisify(getDelegates);
var getDelegateVotersPromise = node.Promise.promisify(getDelegateVoters);
var getVotersPromise = node.Promise.promisify(getVoters);
var searchDelegatesPromise = node.Promise.promisify(searchDelegates);
var putForgingDelegatePromise = node.Promise.promisify(putForgingDelegate);
var getForgedByAccountPromise = node.Promise.promisify(getForgedByAccount);
var getNextForgersPromise = node.Promise.promisify(getNextForgers);
var getAccountsPromise = node.Promise.promisify(getAccounts);
var getPublicKeyPromise = node.Promise.promisify(getPublicKey);
var getBalancePromise = node.Promise.promisify(getBalance);
var getBlocksPromise = node.Promise.promisify(getBlocks);
var getDappPromise = node.Promise.promisify(getDapp);
var getDappsPromise = node.Promise.promisify(getDapps);
var getDappsCategoriesPromise = node.Promise.promisify(getDappsCategories);

module.exports = {
	getTransactionPromise: getTransactionPromise,
	getTransactionsPromise: getTransactionsPromise,
	getUnconfirmedTransactionPromise: getUnconfirmedTransactionPromise,
	getUnconfirmedTransactionsPromise: getUnconfirmedTransactionsPromise,
	getQueuedTransactionPromise: getQueuedTransactionPromise,
	getQueuedTransactionsPromise: getQueuedTransactionsPromise,
	getMultisignaturesTransactionPromise: getMultisignaturesTransactionPromise,
	getMultisignaturesTransactionsPromise: getMultisignaturesTransactionsPromise,
	getPendingMultisignaturesPromise: getPendingMultisignaturesPromise,
	sendSignaturePromise: sendSignaturePromise,
	sendTransactionPromise: sendTransactionPromise,
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
	getNextForgersPromise: getNextForgersPromise,
	getAccounts: getAccounts,
	getAccountsPromise: getAccountsPromise,
	getPublicKey: getPublicKey,
	getBalancePromise: getBalancePromise,
	getBalance: getBalance,
	getPublicKeyPromise: getPublicKeyPromise,
	getBlocksPromise: getBlocksPromise,
	waitForConfirmations: waitForConfirmations,
	getDappPromise: getDappPromise,
	getDappsPromise: getDappsPromise,
	getDappsCategoriesPromise: getDappsCategoriesPromise,
	expectSwaggerParamError: expectSwaggerParamError
};

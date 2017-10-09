'use strict';

var lisk = require('lisk-js');

var node = require('../node');
var http = require('./httpCommunication');

function httpCallbackHelper (cb, err, res) {
	if (err) {
		return cb(err);
	}
	cb(null, res.body);
}

function getTransaction (transaction, cb) {
	http.get('/api/transactions/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
}

function getTransactions (params, cb) {
	http.get('/api/transactions?' +  params.join('&'), httpCallbackHelper.bind(null, cb));
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

function getPendingMultisignature (transaction, cb) {
	http.get('/api/multisignatures/pending?publicKey=' + transaction.senderPublicKey, httpCallbackHelper.bind(null, cb));
}

function sendTransaction (transaction, cb) {
	http.post('/api/transactions', {transaction: transaction}, httpCallbackHelper.bind(null, cb));
}

function sendSignature (signature, transaction, cb) {
	http.post('/api/signatures', {signature: {signature: signature, transaction: transaction.id}}, httpCallbackHelper.bind(null, cb));
}

function sendLISK (params, cb) {
	var transaction = lisk.transaction.createTransaction(params.address, params.amount, params.secret, params.secondSecret);
	sendTransaction(transaction, cb);
}

function creditAccount (address, amount, cb) {
	var transaction = lisk.transaction.createTransaction(address, amount, node.gAccount.password);
	sendTransaction(transaction, cb);
}

function getCount (cb) {
	http.get('/api/transactions/count', httpCallbackHelper.bind(null, cb));
}

var getTransactionPromise = node.Promise.promisify(getTransaction);
var getTransactionsPromise = node.Promise.promisify(getTransactions);
var getQueuedTransactionPromise = node.Promise.promisify(getQueuedTransaction);
var getQueuedTransactionsPromise = node.Promise.promisify(getQueuedTransactions);
var sendTransactionPromise = node.Promise.promisify(sendTransaction);
var getUnconfirmedTransactionPromise = node.Promise.promisify(getUnconfirmedTransaction);
var getUnconfirmedTransactionsPromise = node.Promise.promisify(getUnconfirmedTransactions);
var getMultisignaturesTransactionPromise = node.Promise.promisify(getMultisignaturesTransaction);
var getMultisignaturesTransactionsPromise = node.Promise.promisify(getMultisignaturesTransactions);
var getPendingMultisignaturePromise = node.Promise.promisify(getPendingMultisignature);
var creditAccountPromise = node.Promise.promisify(creditAccount);
var sendSignaturePromise = node.Promise.promisify(sendSignature);
var getCountPromise = node.Promise.promisify(getCount);

module.exports = {
	getTransaction: getTransaction,
	getTransactionPromise: getTransactionPromise,
	getTransactions: getTransactions,
	getTransactionsPromise: getTransactionsPromise,
	getUnconfirmedTransaction: getUnconfirmedTransaction,
	getUnconfirmedTransactionPromise: getUnconfirmedTransactionPromise,
	getUnconfirmedTransactions: getUnconfirmedTransactions,
	getUnconfirmedTransactionsPromise: getUnconfirmedTransactionsPromise,
	getQueuedTransaction: getQueuedTransaction,
	getQueuedTransactionPromise: getQueuedTransactionPromise,
	getQueuedTransactions: getQueuedTransactions,
	getQueuedTransactionsPromise: getQueuedTransactionsPromise,
	getMultisignaturesTransaction: getMultisignaturesTransaction,
	getMultisignaturesTransactionPromise: getMultisignaturesTransactionPromise,
	getMultisignaturesTransactions: getMultisignaturesTransactions,
	getMultisignaturesTransactionsPromise: getMultisignaturesTransactionsPromise,
	getPendingMultisignature: getPendingMultisignature,
	getPendingMultisignaturePromise: getPendingMultisignaturePromise,
	sendSignature: sendSignature,
	sendSignaturePromise: sendSignaturePromise,
	sendTransaction: sendTransaction,
	sendTransactionPromise: sendTransactionPromise,
	sendLISK: sendLISK,
	creditAccount: creditAccount,
	creditAccountPromise: creditAccountPromise,
	getCount: getCount,
	getCountPromise: getCountPromise
};

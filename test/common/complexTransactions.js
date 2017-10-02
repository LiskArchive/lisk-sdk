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

function getUnconfirmedTransaction (transaction, cb) {
	http.get('/api/transactions/unconfirmed/get?id=' + transaction, httpCallbackHelper.bind(null, cb));
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

var getTransactionPromise = node.Promise.promisify(getTransaction);
var sendTransactionPromise = node.Promise.promisify(sendTransaction);
var getUnconfirmedTransactionPromise = node.Promise.promisify(getUnconfirmedTransaction);
var getPendingMultisignaturePromise = node.Promise.promisify(getPendingMultisignature);
var creditAccountPromise = node.Promise.promisify(creditAccount);
var sendSignaturePromise = node.Promise.promisify(sendSignature);

module.exports = {
	getTransaction: getTransaction,
	getTransactionPromise: getTransactionPromise,
	getUnconfirmedTransaction: getUnconfirmedTransaction,
	getUnconfirmedTransactionPromise: getUnconfirmedTransactionPromise,
	getPendingMultisignature: getPendingMultisignature,
	getPendingMultisignaturePromise: getPendingMultisignaturePromise,
	sendSignature: sendSignature,
	sendSignaturePromise: sendSignaturePromise,
	sendTransaction: sendTransaction,
	sendTransactionPromise: sendTransactionPromise,
	sendLISK: sendLISK,
	creditAccount: creditAccount,
	creditAccountPromise: creditAccountPromise
};

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

function sendTransaction (transaction, cb) {
	http.post('/api/transactions', {transaction: transaction}, httpCallbackHelper.bind(null, cb));
}

function sendSignature (signature, transaction, cb) {
	http.post('/api/signatures', {signature: signature, transaction: transaction.id}, httpCallbackHelper.bind(null, cb));
}

function sendLISK (params, cb) {
	sendTransaction(lisk.transaction.createTransaction(params.address, params.amount, params.secret, params.secondSecret), cb);
}

module.exports = {
	getTransaction: getTransaction,
	getUnconfirmedTransaction: getUnconfirmedTransaction,
	sendSignature: sendSignature,
	sendTransaction: sendTransaction,
	sendLISK: sendLISK
};

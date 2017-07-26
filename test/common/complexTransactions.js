'use strict';

var lisk = require('lisk-js');
var http = require('./httpCommunication');

function sendTransaction (transaction, cb) {
	http.post('/api/transactions', { transaction: transaction }, function (err, res) {
		if (res.body.success) {
			return cb(null, res.body);
		}
		return cb(res.body);
	});
}

function sendSignature (signature, transaction, cb) {
	http.post('/api/signatures', { signature: signature, transaction: transaction.id }, function (err, res) {
		if (res.body.success) {
			return cb(null, res.body);
		}
		return cb(res.body);
	});
}

function sendLISK (params, cb) {
	sendTransaction(lisk.transaction.createTransaction(params.address, params.amount, params.secret, params.secondSecret), cb);
}

module.exports = {
	sendSignature: sendSignature,
	sendTransaction: sendTransaction,
	sendLISK: sendLISK
};

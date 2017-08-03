'use strict';

var lisk = require('lisk-js');

var node = require('../node.js');
var http = require('./httpCommunication');

function getTransaction (transaction, cb) {
	http.get('/api/transactions/get?id='+transaction, function (err, res) {
		if (err) {
			return cb(err);
		}
		node.expect(res.body).to.have.property('success');
		cb(null, res.body);
	});
}

function getUnconfirmedTransaction (transaction, cb) {
	http.get('/api/transactions/unconfirmed/get?id='+transaction, function (err, res) {
		if (err) {
			return cb(err);
		}
		node.expect(res.body).to.have.property('success');
		cb(null, res.body);
	});
}

function sendTransaction (transaction, cb) {
	http.post('/api/transactions', { transaction: transaction }, function (err, res) {
		if (err) {
			return cb(err);
		}
		return cb(null, res.body);
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
	getTransaction: getTransaction,
	getUnconfirmedTransaction: getUnconfirmedTransaction,
	sendSignature: sendSignature,
	sendTransaction: sendTransaction,
	sendLISK: sendLISK
};

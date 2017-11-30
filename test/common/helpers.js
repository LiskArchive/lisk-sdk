'use strict';

var stripTransactionsResults = function (results) {
	return {
		successFields:results.map(function (res) {
			return res.body.success;
		}),
		errorFields: results.map(function (res) {
			return res.body.error;
		}).filter(function (error) {
			return error;
		}),
		transactionsIds: results.map(function (res) {
			return res.body.transaction;
		}).filter(function (trs) {
			return trs;
		}).map(function (trs) {
			return trs.id;
		})
	};
};

var randomInt = function (min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = {
	stripTransactionsResults: stripTransactionsResults,
	randomInt: randomInt
};

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

module.exports = {
	stripTransactionsResults: stripTransactionsResults
};

module.exports = function getCommand(vorpal) {
	'use strict';

	const lisk = require('lisk-js').api();
	const tablify = require('../src/utils/tablify');

	function isAccountQuery (command) {

		lisk.sendRequest('accounts', {  address: command }, function (response) {

			let account = response.account;

			vorpal.log(tablify(account).toString());
		});

	}

	function isBlockQuery (command) {

		lisk.sendRequest('blocks/get', {  id: command }, function (response) {

			let block = response.block;

			vorpal.log(tablify(block).toString());
		});

	}

	function isTransactionQuery (command) {

		lisk.sendRequest('transactions/get', {  id: command }, function (response) {

			let transaction = response.transaction;

			vorpal.log(tablify(transaction).toString());
		});

	}

	function isDelegateQuery (command) {

		lisk.sendRequest('delegates/get', {  username: command }, function (response) {

			let delegate = response.delegate;

			vorpal.log(tablify(delegate).toString());
		});

	}

	vorpal
		.command('get <type> <input>')
		.description('Get information from <type> with parameter <input>')
		.action(function(userInput, callback) {

			var bigNumberWorkaround = this.commandWrapper.command.split(" ")[2];

			let getType = {
				'account': isAccountQuery(userInput.input),
				//'allDelegates': isAllDelegateQuery,
				'block': isBlockQuery(bigNumberWorkaround),
				'delegate': isDelegateQuery(userInput.input),
				'transaction': isTransactionQuery(bigNumberWorkaround)
			};

			getType[userInput.type];
			callback();
		});

};

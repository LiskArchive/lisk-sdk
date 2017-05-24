module.exports = function listCommand(vorpal) {
	'use strict';

	const lisk = require('lisk-js').api();
	const tablify = require('../src/utils/tablify');

	vorpal
		.command('list <type> [variadic...]')
		.description('Get information from <type> with parameter <input>')
		.action(function(userInput, callback) {

			var userInputs = userInput.input;
			var bigNumberWorkaround = this.commandWrapper.command.split(" ");
			bigNumberWorkaround.shift();
			bigNumberWorkaround.shift();

			function isAccountsQuery () {

				userInput.variadic.map(function (address) {

					lisk.sendRequest('delegates/get', {  address: address }, function (response) {

						let account = response.account;

						vorpal.log(tablify(account).toString());
					});

				});

			}

			function isBlocksQuery () {

				bigNumberWorkaround.map(function (blockId) {

					lisk.sendRequest('blocks/get', {  id: blockId }, function (response) {

						let block = response.block;

						vorpal.log(tablify(block).toString());
					});

				});

			}

			function isTransactionsQuery () {

				bigNumberWorkaround.map(function (transactionId) {

					lisk.sendRequest('transactions/get', {  id: transactionId }, function (response) {

						let transaction = response.transaction;

						vorpal.log(tablify(transaction).toString());
					});

				});

			}

			function isDelegatesQuery () {

				userInput.variadic.map(function (delegateId) {

					lisk.sendRequest('delegates/get', {  username: delegateId }, function (response) {

						let delegate = response.delegate;

						vorpal.log(tablify(delegate).toString());
					});

				});

			}

			let getType = {
				'accounts': isAccountsQuery,
				'blocks': isBlocksQuery,
				'delegates': isDelegatesQuery,
				'transactions': isTransactionsQuery
			};

			getType[userInput.type]();
			callback();
		});

};

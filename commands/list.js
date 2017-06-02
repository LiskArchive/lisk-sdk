module.exports = function listCommand(vorpal) {
	'use strict';

	const config = require('../config.json');
	const lisk = require('lisk-js').api(config.liskJS);
	const tablify = require('../src/utils/tablify');
	const util = require('util');

	function isAccountQuery (input) {

		return lisk.sendRequest('accounts', {  address: input });

	}

	function isBlockQuery (input) {

		return lisk.sendRequest('blocks/get', {  id: input });

	}

	function isTransactionQuery (input) {

		return lisk.sendRequest('transactions/get', {  id: input });

	}

	function isDelegateQuery (input) {

		return lisk.sendRequest('delegates/get', {  username: input });

	}

	function switchType (type) {
		return {
			'accounts': 'account',
			'addresses': 'address',
			'blocks': 'block',
			'delegates': 'delegate',
			'transactions': 'transaction'
		}[type];
	}

	vorpal
		.command('list <type> [variadic...]')
		.option('-j, --json', 'Sets output to json')
		.option('-t, --no-json', 'Sets output to text')
		.description('Get information from <type> with parameters [input, input, ...]')
		.autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
		.action(function(userInput) {

			let getType = {
				'addresses': isAccountQuery,
				'accounts': isAccountQuery,
				'blocks': isBlockQuery,
				'delegates': isDelegateQuery,
				'transactions': isTransactionQuery
			};

			let calls = userInput.variadic.map(function (input) {
				return getType[userInput.type](input);
			});


			 if(process.env.NODE_ENV === 'test') {

				 return Promise.all(calls);

			 } else {

				 if(userInput.options.json === true) {
					 return Promise.all(calls).then(result => {
						 result.map(executed => {
							 if(executed.error) {
								 vorpal.log(util.inspect(executed));
							 } else {
								 vorpal.log(util.inspect(executed[switchType(userInput.type)]));
							 }
						 });

						 return result;

					 });
				 } else {
					 return Promise.all(calls).then(result => {
						 result.map(executed => {
							 if(executed.error) {
								 vorpal.log(tablify(executed).toString());
							 } else {
								 vorpal.log(tablify(executed[switchType(userInput.type)]).toString());
							 }
						 });

						 return result;

					 });
				 }

			 }


		});

};

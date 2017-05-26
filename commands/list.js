module.exports = function listCommand(vorpal) {
	'use strict';

	const lisk = require('lisk-js').api();
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
		let returnType;
		switch (type) {
			case 'accounts':
			case 'addresses':
				returnType = 'account';
				break;
			case 'blocks':
				returnType = 'block';
				break;
			case 'delegates':
				returnType = 'delegate';
				break;
			case 'transactions':
				returnType = 'transaction';
				break;
		}
		return returnType;
	}

	vorpal
		.command('list <type> [variadic...]')
		.description('Get information from <type> with parameters [input, input, ...]')
		.autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
		.action(function(userInput) {



			var bigNumberWorkaround = this.commandWrapper.command.split(" ");
			bigNumberWorkaround.shift();
			bigNumberWorkaround.shift();

			let getType = {
				'addresses': isAccountQuery,
				'accounts': isAccountQuery,
				'blocks': isBlockQuery,
				'delegates': isDelegateQuery,
				'transactions': isTransactionQuery
			};

			let calls = bigNumberWorkaround.map(function (input) {
				let output = getType[userInput.type](input);
				return output;
			});


			 if(process.env.NODE_ENV === 'test') {

				 return Promise.all(calls);

			 } else {

				 //output = tablify(output).toString();

				 return Promise.all(calls).then(result => {
				 	result.map(executed => {
					    if(executed.error) {
						    vorpal.log(util.inspect(executed));
					    } else {
						    vorpal.log(util.inspect(executed[switchType(userInput.type)]));
					    }
				    });

				 });

			 }


		});

};

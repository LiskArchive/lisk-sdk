module.exports = function listCommand(vorpal) {
	'use strict';

	const config = require('../config.json');
	const lisk = require('lisk-js').api(config.liskJS);
	const tablify = require('../src/utils/tablify');
	const util = require('util');
	const query = require('../src/utils/query');

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

		.description('Get information from <type> with parameters [input, input, ...].  \n Types available: accounts, addresses, blocks, delegates, transactions \n E.g. list delegates lightcurve tosch \n E.g. list blocks 5510510593472232540 16450842638530591789')
		.autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
		.action(function(userInput) {
    
			let getType = {
				'addresses': query.isAccountQuery,
				'accounts': query.isAccountQuery,
				'blocks': query.isBlockQuery,
				'delegates': query.isDelegateQuery,
				'transactions': query.isTransactionQuery
			};

			let calls = userInput.variadic.map(function (input) {
				return getType[userInput.type](input);
			});



			if( (userInput.options.json === true || config.json === true) && userInput.options.json !== false) {
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

				}).catch((e) => {
					return e;
				});
			}


		});

};

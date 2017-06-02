module.exports = function getCommand (vorpal) {
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
			'account': 'account',
			'address': 'address',
			'block': 'block',
			'delegate': 'delegate',
			'transaction': 'transaction'
		}[type];
	}

	vorpal
		.command('get <type> <input>')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.js')
		.description('Get information from <type> with parameter <input>. \n Types available: account, adddress, block, delegate, transaction \n E.g. get delegate lightcurve \n e.g. get block 5510510593472232540')
		.autocomplete(['account', 'address', 'block', 'delegate', 'transaction'])
		.action(function(userInput) {

			let getType = {
				'account': isAccountQuery,
				'address': isAccountQuery,
				'block': isBlockQuery,
				'delegate': isDelegateQuery,
				'transaction': isTransactionQuery
			};

			let output = getType[userInput.type](userInput.input);

			if(process.env.NODE_ENV === 'test') {

				return output;

			} else {
        
				if( (userInput.options.json === true || config.json === true) && userInput.options.json !== false) {
					return output.then((result) => {
						if(result.error) {
							vorpal.log(util.inspect(result));
							return result;
						} else {
							vorpal.log(util.inspect(result[switchType(userInput.type)]));
							return result[switchType(userInput.type)];
						}
					});
				} else {
					return output.then((result) => {
						if(result.error) {
							vorpal.log(tablify(result).toString());
							return result;
						} else {
							vorpal.log(tablify(result[switchType(userInput.type)]).toString());
							return result[switchType(userInput.type)];
						}
					});
				}

			}

		});

};

import config from '../../config.json';
import tablify from '../utils/tablify';
import query from '../utils/query';

export default function getCommand(vorpal) {
	function switchType(type) {
		return {
			account: 'account',
			address: 'address',
			block: 'block',
			delegate: 'delegate',
			transaction: 'transaction',
		}[type];
	}

	vorpal
		.command('get <type> <input>')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.js')
		.description('Get information from <type> with parameter <input>. \n Types available: account, address, block, delegate, transaction \n E.g. get delegate lightcurve \n e.g. get block 5510510593472232540')
		.autocomplete(['account', 'address', 'block', 'delegate', 'transaction'])
		.action((userInput) => {

			const getType = {
				account: query.isAccountQuery.bind(query),
				address: query.isAccountQuery.bind(query),
				block: query.isBlockQuery.bind(query),
				delegate: query.isDelegateQuery.bind(query),
				transaction: query.isTransactionQuery.bind(query),
			};

			const output = getType[userInput.type](userInput.input);

			const shouldUseJsonOutput = (userInput.options.json === true || config.json === true)
								&& userInput.options.json !== false;

			if (shouldUseJsonOutput) {
				return output.then((result) => {
					if (result.error) {
						vorpal.log(JSON.stringify(result));
						return result;
					}
					vorpal.log(JSON.stringify(result[switchType(userInput.type)]));
					return result[switchType(userInput.type)];
				});
			}
			return output.then((result) => {
				if (result.error) {
					vorpal.log(tablify(result).toString());
					return result;
				}
				vorpal.log(tablify(result[switchType(userInput.type)]).toString());
				return result[switchType(userInput.type)];
			});
		});
};

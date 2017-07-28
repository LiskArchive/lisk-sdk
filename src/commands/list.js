import config from '../../config.json';
import tablify from '../utils/tablify';
import query from '../utils/query';

const getTableString = result => tablify(result).toString();

const printResult = (printFn, vorpal, type, result) => {
	const message = result.error ? result : result[type];
	vorpal.log(printFn(message));
};

const processResults = (shouldUseJsonOutput, vorpal, type, results) => {
	const printFn = shouldUseJsonOutput ? JSON.stringify : getTableString;
	results.forEach(printResult.bind(null, printFn, vorpal, type));
	return results;
};

const list = vorpal => ({ type, variadic, options }) => {
	const handlers = {
		addresses: query.isAccountQuery.bind(query),
		accounts: query.isAccountQuery.bind(query),
		blocks: query.isBlockQuery.bind(query),
		delegates: query.isDelegateQuery.bind(query),
		transactions: query.isTransactionQuery.bind(query),
	};

	const shouldUseJsonOutput = (options.json === true || config.json === true)
						&& options.json !== false;

	const calls = variadic.map(input => handlers[type](input));

	return Promise.all(calls)
		.then(processResults.bind(null, shouldUseJsonOutput, vorpal, type))
		.catch(e => e);
};

export default function listCommand(vorpal) {
	vorpal
		.command('list <type> <variadic...>')
		.option('-j, --json', 'Sets output to json')
		.option('-t, --no-json', 'Sets output to text')
		.description('Get information from <type> with parameters <input, input, ...>.  \n Types available: accounts, addresses, blocks, delegates, transactions \n E.g. list delegates lightcurve tosch \n E.g. list blocks 5510510593472232540 16450842638530591789')
		.autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
		.action(list(vorpal));
}

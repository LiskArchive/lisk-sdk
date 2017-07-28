import config from '../../config.json';
import tablify from '../utils/tablify';
import query from '../utils/query';

const getTableString = result => tablify(result).toString();

const printResult = (printFn, vorpal, type, result) => {
	const message = result.error ? result : result[type];
	vorpal.log(printFn(message));
};

const processResult = (shouldUseJsonOutput, vorpal, type, result) => {
	const printFn = shouldUseJsonOutput ? JSON.stringify : getTableString;
	printResult(printFn, vorpal, type, result);
	return result;
};

const get = vorpal => ({ options, type, input }) => {
	const handlers = {
		account: query.isAccountQuery.bind(query),
		address: query.isAccountQuery.bind(query),
		block: query.isBlockQuery.bind(query),
		delegate: query.isDelegateQuery.bind(query),
		transaction: query.isTransactionQuery.bind(query),
	};

	const shouldUseJsonOutput = (options.json === true || config.json === true)
		&& options.json !== false;

	return handlers[type](input)
		.then(processResult.bind(null, shouldUseJsonOutput, vorpal, type));
};

export default function getCommand(vorpal) {
	vorpal
		.command('get <type> <input>')
		.option('-j, --json', 'Sets output to json')
		.option('--no-json', 'Default: sets output to text. You can change this in the config.js')
		.description('Get information from <type> with parameter <input>. \n Types available: account, address, block, delegate, transaction \n E.g. get delegate lightcurve \n e.g. get block 5510510593472232540')
		.autocomplete(['account', 'address', 'block', 'delegate', 'transaction'])
		.action(get(vorpal));
}

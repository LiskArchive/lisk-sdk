import config from '../../config.json';
import query from '../utils/query';
import {
	getTableString,
	printResult,
} from '../utils/print';
import {
	COMMAND_TYPES,
	SINGULARS,
} from '../utils/constants';
import {
	deAlias,
	shouldUseJsonOutput,
} from '../utils/helpers';

const handlers = {
	addresses: address => query.isAccountQuery(address),
	accounts: accounts => query.isAccountQuery(accounts),
	blocks: blocks => query.isBlockQuery(blocks),
	delegates: delegates => query.isDelegateQuery(delegates),
	transactions: transactions => query.isTransactionQuery(transactions),
};

const processResults = (useJsonOutput, vorpal, type, results) => {
	const printFn = useJsonOutput ? JSON.stringify : getTableString;
	results.forEach(printResult.bind(null, printFn, vorpal, type));
	return results;
};

const list = vorpal => ({ type, variadic, options }) => {
	const singularType = SINGULARS[type];
	const useJsonOutput = shouldUseJsonOutput(config, options);

	const makeCalls = () => variadic.map(input => handlers[type](input));

	return COMMAND_TYPES.includes(singularType)
		? Promise.all(makeCalls())
			.then(processResults.bind(null, useJsonOutput, vorpal, deAlias(singularType)))
			.catch(e => e)
		: Promise.resolve(vorpal.log('Unsupported type.'));
};

export default function listCommand(vorpal) {
	vorpal
		.command('list <type> <variadic...>')
		.option('-j, --json', 'Sets output to json')
		.option('-t, --no-json', 'Sets output to text')
		.description('Get information from <type> with parameters <input, input, ...>.  \n Types available: accounts, addresses, blocks, delegates, transactions \n E.g. list delegates lightcurve tosch \n E.g. list blocks 5510510593472232540 16450842638530591789')
		.autocomplete(COMMAND_TYPES)
		.action(list(vorpal));
}

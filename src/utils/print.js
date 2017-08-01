import tablify from './tablify';

export const getTableString = result => tablify(result).toString();

export const printResult = (printFn, vorpal, type, result) => {
	const message = result.error ? result : result[type];
	vorpal.log(printFn(message));
};

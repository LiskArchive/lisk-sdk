import tablify from './tablify';

export const getTableString = result => tablify(result).toString();

export const printResult = (printFn, vorpal, result) => {
	vorpal.log(printFn(result));
};

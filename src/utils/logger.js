/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import chalk from 'chalk';

// TODO: Include commented placeholders when we support Node 8
const PLACEHOLDERS = [
	'%s',
	'%d',
	// '%i',
	// '%f',
	'%j',
	// '%o',
	// '%O',
];

const wrapLogFunction = (fn, colour) => (...args) => {
	const colourArg = arg => chalk[colour](arg);
	const isPlaceholderPresent = placeholder => args[0].includes(placeholder);
	return PLACEHOLDERS.some(isPlaceholderPresent)
		? fn(colourArg(args[0]), ...args.slice(1))
		: fn(...args.map(colourArg));
};

const logger = {
	warn: wrapLogFunction(console.warn, 'yellow'),
	error: wrapLogFunction(console.error, 'red'),
};

export default logger;

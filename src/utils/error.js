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

export class ValidationError extends Error {
	constructor(message) {
		super(message);
		this.message = chalk.red(message);
		this.name = 'ValidationError';
	}
}

const PLACEHOLDERS = [
	'%s',
	'%d',
	'%i',
	'%f',
	'%j',
	'%o',
	'%O',
];

const colourArg = (arg, colour) => chalk[colour](arg);
const colourArgs = (args, colour) => args.map(arg => chalk[colour](arg));

const wrapLogFunction = (fn, colour) => (...args) =>
	(PLACEHOLDERS.some(placeholder => args[0].includes(placeholder))
		? fn(colourArg(args[0], colour), ...args.slice(1))
		: fn(...colourArgs(args, colour)));

export const logWarning = wrapLogFunction(console.warn, 'yellow');
export const logError = wrapLogFunction(console.error, 'red');

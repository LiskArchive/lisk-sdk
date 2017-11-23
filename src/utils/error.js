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

export const logConfigurationWarningMessage = (path) => {
	const warning = `WARNING: Could not write to \`${path}\`. Your configuration will not be persisted.`;
	console.warn(chalk.yellow(warning));
	return null;
};

export const logFileSystemErrorMessage = (errorMessage) => {
	console.error(chalk.red(errorMessage));
	return null;
};

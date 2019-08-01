/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
// tslint:disable max-classes-per-file
import chalk from 'chalk';

export class FileSystemError extends Error {
	public constructor(message: string) {
		super(message);
		this.message = chalk.red(message);
		this.name = 'FileSystemError';
	}
}

export class ValidationError extends Error {
	public constructor(message: string) {
		super(message);
		this.message = chalk.red(message);
		this.name = 'ValidationError';
	}
}

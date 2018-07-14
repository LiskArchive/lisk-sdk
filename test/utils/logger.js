/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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

describe('logger utils', () => {
	let logger;
	beforeEach(() => {
		delete require.cache[require.resolve('../../src/utils/logger')];
		sandbox.stub(console, 'warn');
		sandbox.stub(console, 'error');
		// NOTE: This dynamic require is necessary because otherwise the log
		// function is created with a bound console method rather than the stub.
		// eslint-disable-next-line global-require
		logger = require('../../src/utils/logger').default;
		return Promise.resolve();
	});

	describe('#console.warn', () => {
		it('should log with yellow with 2 strings', () => {
			const args = ['Something to be warned about', 'Something else'];
			logger.warn(...args);
			const yellowArguments = args.map(arg => chalk.yellow(arg));
			return expect(console.warn).to.be.calledWithExactly(...yellowArguments);
		});

		it('should log with yellow with string with placeholder', () => {
			const args = ['Something to be %d', 1];
			logger.warn(...args);
			return expect(console.warn).to.be.calledWithExactly(
				chalk.yellow(args[0]),
				args[1],
			);
		});
	});

	describe('#console.error', () => {
		it('should log with red with 2 strings', () => {
			const args = ['Something to be warned about', 'Something else'];
			logger.error(...args);
			const redArguments = args.map(arg => chalk.red(arg));
			return expect(console.error).to.be.calledWithExactly(...redArguments);
		});

		it('should log with yellow with string with placeholder', () => {
			const args = ['Something to be %s and something', 'inserted'];
			logger.error(...args);
			return expect(console.error).to.be.calledWithExactly(
				chalk.red(args[0]),
				args[1],
			);
		});
	});
});

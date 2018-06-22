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
	let warnStub;
	let errorStub;

	beforeEach(() => {
		delete require.cache[require.resolve('../../src/utils/logger')];
		warnStub = sandbox.stub(console, 'warn');
		errorStub = sandbox.stub(console, 'error');
		return Promise.resolve();
	});

	describe('#console.warn', () => {
		it('should log with yellow with 2 strings', () => {
			const args = ['Something to be warned about', 'Something else'];
			// NOTE: This dynamic require is necessary because otherwise the log
			// function is created with a bound console method rather than the stub.
			// eslint-disable-next-line global-require
			const logger = require('../../src/utils/logger').default;
			logger.warn(...args);
			const yellowArguments = args.map(arg => chalk.yellow(arg));
			return expect(warnStub).to.be.calledWithExactly(...yellowArguments);
		});

		it('should log with yellow with string with place holder', () => {
			const args = ['Something to be %d', 1];
			// NOTE: This dynamic require is necessary because otherwise the log
			// function is created with a bound console method rather than the stub.
			// eslint-disable-next-line global-require
			const logger = require('../../src/utils/logger').default;
			logger.warn(...args);
			return expect(warnStub).to.be.calledWithExactly(
				chalk.yellow(args[0]),
				args[1],
			);
		});
	});

	describe('#console.error', () => {
		it('should log with red with 2 strings', () => {
			const args = ['Something to be warned about', 'Something else'];
			// NOTE: This dynamic require is necessary because otherwise the log
			// function is created with a bound console method rather than the stub.
			// eslint-disable-next-line global-require
			const logger = require('../../src/utils/logger').default;
			logger.error(...args);
			const redArguments = args.map(arg => chalk.red(arg));
			return expect(errorStub).to.be.calledWithExactly(...redArguments);
		});

		it('should log with yellow with string with place holder', () => {
			const args = ['Something to be %s and something', 'inserted'];
			// NOTE: This dynamic require is necessary because otherwise the log
			// function is created with a bound console method rather than the stub.
			// eslint-disable-next-line global-require
			const logger = require('../../src/utils/logger').default;
			logger.error(...args);
			return expect(errorStub).to.be.calledWithExactly(
				chalk.red(args[0]),
				args[1],
			);
		});
	});
});

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
import {
	shouldUseJSONOutput,
	shouldUsePrettyOutput,
} from '../../../src/utils/helpers';
import print from '../../../src/utils/print';
import tablify from '../../../src/utils/tablify';

export function loggerErrorIsCalledWithTheArguments() {
	const { testArguments } = this.test.ctx;
	// NOTE: This dynamic require is necessary because otherwise the log
	// function is created with a bound console method rather than the stub.
	// eslint-disable-next-line global-require
	const logger = require('../../../src/utils/logger').default;
	const returnValue = logger.error(...testArguments);
	this.test.ctx.returnValue = returnValue;
}

export function loggerWarnIsCalledWithTheArguments() {
	const { testArguments } = this.test.ctx;
	// NOTE: This dynamic require is necessary because otherwise the log
	// function is created with a bound console method rather than the stub.
	// eslint-disable-next-line global-require
	const logger = require('../../../src/utils/logger').default;
	const returnValue = logger.warn(...testArguments);
	this.test.ctx.returnValue = returnValue;
}

export function theResultIsPrinted() {
	const { vorpal, result, options } = this.test.ctx;
	this.test.ctx.returnValue = print(vorpal, options)(result);
}

export function theResultsArePrinted() {
	const { vorpal, results, options } = this.test.ctx;
	this.test.ctx.returnValue = print(vorpal, options)(results);
}

export function theResultIsPrintedUsingTheActiveCommandContext() {
	const { vorpal, result, options, activeCommand } = this.test.ctx;
	this.test.ctx.returnValue = print(vorpal, options).call(
		activeCommand,
		result,
	);
}

export function theObjectIsTablified() {
	const { testObject } = this.test.ctx;
	try {
		const returnValue = tablify(testObject);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = tablify.bind(null, testObject);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function theArrayIsTablified() {
	const { testArray } = this.test.ctx;
	const returnValue = tablify(testArray);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function shouldUseJSONOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUseJSONOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

export function shouldUsePrettyOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUsePrettyOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

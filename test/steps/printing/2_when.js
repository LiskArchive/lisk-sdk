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
import {
	shouldUseJSONOutput,
	shouldUsePrettyOutput,
} from '../../../src/utils/helpers';
import { printResult } from '../../../src/utils/print';
import tablify from '../../../src/utils/tablify';

export function logErrorIsCalledWithTheArguments() {
	const { testArguments } = this.test.ctx;
	// NOTE: This dynamic require is necessary because otherwise the log
	// function is created with a bound console method rather than the stub.
	// eslint-disable-next-line global-require
	const { logError } = require('../../../src/utils/print');
	const returnValue = logError(...testArguments);
	this.test.ctx.returnValue = returnValue;
}

export function logWarningIsCalledWithTheArguments() {
	const { testArguments } = this.test.ctx;
	// NOTE: This dynamic require is necessary because otherwise the log
	// function is created with a bound console method rather than the stub.
	// eslint-disable-next-line global-require
	const { logWarning } = require('../../../src/utils/print');
	const returnValue = logWarning(...testArguments);
	this.test.ctx.returnValue = returnValue;
}

export function theResultIsPrinted() {
	const { vorpal, result, options } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal, options)(result);
}

export function theResultIsPrintedUsingTheActiveCommandContext() {
	const { vorpal, result, options, activeCommand } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal, options).call(
		activeCommand,
		result,
	);
}

export function theObjectIsTablified() {
	const { testObject } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testObject);
}

export function theArrayIsTablified() {
	const { testArray } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testArray);
}

export function shouldUseJSONOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	try {
		const returnValue = shouldUseJSONOutput(config, options);
		this.test.ctx.returnValue = returnValue;
	} catch (error) {
		const testFunction = shouldUseJSONOutput.bind(null, config, options);
		this.test.ctx.testFunction = testFunction;
	}
}

export function shouldUsePrettyOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUsePrettyOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

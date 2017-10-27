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
	shouldUseJsonOutput,
	shouldUsePrettyOutput,
} from '../../../src/utils/helpers';
import { printResult } from '../../../src/utils/print';
import tablify from '../../../src/utils/tablify';
import {
	getQuotedStrings,
} from '../utils';

const tablifyToSpy = require('../../../src/utils/tablify');

export function theUserExecutesTheCommand() {
	const { vorpal, command } = this.test.ctx;
	sandbox.spy(tablifyToSpy, 'default');
	const returnValue = vorpal.exec(command);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function theUserExecutesTheCommandWithOptions() {
	const { vorpal, command } = this.test.ctx;
	sandbox.spy(JSON, 'stringify');
	this.test.ctx.commandOptions = getQuotedStrings(this.test.parent.title);
	const commandWithOptions = `${command} ${this.test.ctx.commandOptions.join(' ')}`;
	const returnValue = vorpal.exec(commandWithOptions);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function theResultIsPrinted() {
	const { vorpal, result, options } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal, options)(result);
}

export function theObjectIsTablified() {
	const { testObject } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testObject);
}

export function theArrayIsTablified() {
	const { testArray } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testArray);
}

export function shouldUseJsonOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUseJsonOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

export function shouldUsePrettyOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUsePrettyOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

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

export function thereIsAResultToPrint() {
	this.test.ctx.result = { lisk: 'Some prefix: \u001B[4mJS\u001B[0m' };
	this.test.ctx.resultWithoutANSICodes = { lisk: 'Some prefix: JS' };
}

export function jsonShouldBePrinted() {
	shouldUseJsonOutput.returns(true);
}

export function jsonShouldNotBePrinted() {
	shouldUseJsonOutput.returns(false);
}

export function outputShouldBePretty() {
	shouldUsePrettyOutput.returns(true);
}

export function outputShouldNotBePretty() {
	shouldUsePrettyOutput.returns(false);
}

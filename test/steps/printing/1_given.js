/*
 * LiskHQ/lisk-commander
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

export function thereIsAResultToPrint() {
	this.test.ctx.result = { lisk: 'Some prefix: \u001B[4mJS\u001B[0m' };
	this.test.ctx.resultWithoutANSICodes = { lisk: 'Some prefix: JS' };
}

export function thereAreResultsToPrint() {
	this.test.ctx.results = [
		{ lisk: 'Some prefix: \u001B[4mJS\u001B[0m' },
		{ lisk: 'Some suffix: \u001B[4mawsome\u001B[0m' },
	];
	this.test.ctx.resultsWithoutANSICodes = [
		{ lisk: 'Some prefix: JS' },
		{ lisk: 'Some suffix: awsome' },
	];
}

export function jsonShouldBePrinted() {
	shouldUseJSONOutput.returns(true);
}

export function jsonShouldNotBePrinted() {
	shouldUseJSONOutput.returns(false);
}

export function outputShouldBePretty() {
	shouldUsePrettyOutput.returns(true);
}

export function outputShouldNotBePretty() {
	shouldUsePrettyOutput.returns(false);
}

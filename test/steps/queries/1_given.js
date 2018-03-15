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
import { getFirstQuotedString, getQuotedStrings } from '../utils';

export function theParametersObjectHasKeySetTo() {
	const [key, value] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.parameters[key] = value;
}

export function aParametersObject() {
	this.test.ctx.parameters = {};
}

export function anEndpoint() {
	const endpoint = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.endpoint = endpoint;
}

export function aResultWithError() {
	const error = getFirstQuotedString(this.test.parent.title);
	const result = { error };
	this.test.ctx.result = result;
}

export function aResultWithABlock() {
	const block = { height: 123 };
	const result = { block };

	this.test.ctx.block = block;
	this.test.ctx.result = result;
}

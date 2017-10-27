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
	getFirstQuotedString,
} from '../utils';

export function anEmptyObject() {
	this.test.ctx.testObject = {};
}

export function aNonEmptyObject() {
	this.test.ctx.testObject = {
		lisk: 'js',
		version: 1,
	};
}

export function aNestedObject() {
	this.test.ctx.testObject = {
		root: 'value',
		nested: {
			object: 'values',
			testing: 123,
			nullValue: null,
		},
	};
}

export function anArrayOfObjectsWithTheSameKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisk: 'ts',
			version: 2,
		},
		{
			lisk: 'jsx',
			version: 3,
		},
	];
}

export function anArrayOfObjectsWithDivergentKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisky: 'ts',
			version: 2,
		},
		{
			nano: 'jsx',
			react: true,
		},
	];
}

export function thereIsNoStringAvailable() {
	this.test.ctx.testString = null;
}

export function thereIsAString() {
	this.test.ctx.testString = getFirstQuotedString(this.test.parent.title);
}

export function aPrefix() {
	const prefix = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.prefix = prefix;
}

export function anObjectWithMessage() {
	const message = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.testObject = {
		message,
	};
}

export function anExitFunction() {
	this.test.ctx.exit = sandbox.stub();
}

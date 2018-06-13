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
import { getFirstQuotedString, getQuotedStrings } from '../utils';
import { FileSystemError, ValidationError } from '../../../src/utils/error';

export function stringArguments() {
	this.test.ctx.testArguments = getQuotedStrings(this.test.parent.title);
}

export function aFunctionThatThrowsAFileSystemError() {
	const errorMessage = getFirstQuotedString(this.test.parent.title);
	const fileSystemErrorFn = () => {
		throw new FileSystemError(errorMessage);
	};

	this.test.ctx.errorMessage = errorMessage;
	this.test.ctx.fileSystemErrorFn = fileSystemErrorFn;
}

export function aFunctionThatThrowsAValidationError() {
	const errorMessage = getFirstQuotedString(this.test.parent.title);
	const validationErrorFn = () => {
		throw new ValidationError(errorMessage);
	};

	this.test.ctx.errorMessage = errorMessage;
	this.test.ctx.validationErrorFn = validationErrorFn;
}

export function anErrorObject() {
	this.test.ctx.errorObject = {
		error: 'Some error',
	};
}

export function anEmptyObject() {
	this.test.ctx.testObject = {};
}

export function aNonEmptyObject() {
	this.test.ctx.testObject = {
		lisk: 'js',
		version: 1,
	};
}

export function aDeeplyNestedObject() {
	this.test.ctx.testObject = {
		root: 'value',
		nullObject: null,
		nested: {
			object: 'values',
			testing: 123,
			nullValue: null,
			asset: {
				publicKey: 'aPublicKeyString',
				keys: {
					more: ['publicKey1', 'publicKey2'],
				},
			},
		},
	};
}

export function aCyclicObject() {
	const obj = {
		root: 'value',
		nested: {
			object: 'values',
			testing: 123,
			nullValue: null,
		},
	};
	obj.circular = obj;
	this.test.ctx.testObject = obj;
}

export function aNestedObject() {
	this.test.ctx.testObject = {
		root: 'value',
		nested: {
			object: 'values',
			testing: 123,
			nullValue: null,
			keys: {
				more: ['publicKey1', 'publicKey2'],
			},
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

export function anArrayOfObjectsWithNestedKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
			assets: {
				type: 0,
			},
			signatures: ['publicKey1', 'publicKey2'],
		},
		{
			lisk: 'ts',
			version: 2,
			data: {
				testing: 'test-string',
			},
			assets: {
				type: 1,
			},
		},
		{
			lisk: 'jsx',
			version: 3,
			assets: {
				type: 3,
			},
			signatures: [],
		},
	];
	this.test.ctx.testArrayKeysResult = [
		'lisk',
		'version',
		'assets.type',
		'signatures',
		'data.testing',
	];
	this.test.ctx.testArrayValuesResult = [
		['js', 1, 0, 'publicKey1\npublicKey2', ''],
		['ts', 2, 1, undefined, 'test-string'],
		['jsx', 3, 3, '', ''],
	];
}

export function anArrayOfObjectsWithDivergentKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			'lisk-commander': 'ts',
			version: 2,
		},
		{
			hub: 'jsx',
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

export function aWarrantyInformationText() {
	this.test.ctx.warranty = `
THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.
EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM “AS IS” WITHOUT WARRANTY OF ANY KIND,
EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.
SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
`.trim();
}

export function aCopyrightInformationText() {
	this.test.ctx.copyright = `
Lisk Commander  Copyright (C) 2017–2018  Lisk Foundation

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
`.trim();
}

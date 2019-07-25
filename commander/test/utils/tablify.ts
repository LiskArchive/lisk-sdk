/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import { tablify } from '../../src/utils/tablify';
import { objectToKeyValueString } from '../helpers/utils';

describe('tablify utils', () => {
	interface TestPrintValue {
		readonly [key: string]:
			| string
			| number
			| boolean
			| object
			| ReadonlyArray<string>;
	}
	describe('when an empty object is used', () => {
		it('should have 0 length', () => {
			const printValue = {};
			const returnValue = tablify(printValue);
			return expect(returnValue).to.have.length(0);
		});
	});

	describe('a non-empty object', () => {
		it('should have the corresponding rows', () => {
			const printValue = {
				lisk: 'js',
				version: 1,
			};
			const returnValue = tablify(printValue);
			return Object.entries(printValue).forEach(([key, value], arrayKey) => {
				expect({ [key]: value }).to.eql(returnValue[arrayKey]);
			});
		});
	});

	describe('a nested object', () => {
		it('should have the corresponding rows', () => {
			const printValue = {
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
			const returnValue = tablify(printValue);
			return Object.entries(printValue).forEach(([key, value], arrayKey) => {
				const strValue =
					typeof value === 'object' && value !== null
						? objectToKeyValueString(value)
						: value;
				expect({ [key]: strValue }).to.eql(returnValue[arrayKey]);
			});
		});
	});

	describe('a deeply nested object', () => {
		it('should have the corresponding rows', () => {
			const printValue = {
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
			const returnValue = tablify(printValue);
			return Object.entries(printValue).forEach(([key, value], arrayKey) => {
				const strValue =
					typeof value === 'object' && value !== null
						? Object.entries(value)
								.map(
									([vKey, vValue]) =>
										`${vKey}: ${JSON.stringify(vValue, null, ' ')}`,
								)
								.join('\n')
						: value;
				expect({ [key]: strValue }).to.eql(returnValue[arrayKey]);
			});
		});
	});

	describe('a cyclic object', () => {
		it('should throw an error', () => {
			// tslint:disable-next-line no-any
			const printValue: any = {
				root: 'value',
				nested: {
					object: 'values',
					testing: 123,
					nullValue: null,
				},
			};
			printValue.circular = printValue;
			return expect(tablify.bind(null, printValue)).to.throw(
				TypeError,
				'Converting circular structure to JSON',
			);
		});
	});

	describe('an array of objects with the same keys', () => {
		it('should have the corresponding rows', () => {
			const printValue: ReadonlyArray<TestPrintValue> = [
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
			const returnValue = tablify(printValue);
			return printValue.forEach((values, i) => {
				Object.keys(values).forEach((key, keyIndex) => {
					expect(returnValue[i * printValue.length + 1 + keyIndex]).eql({
						[key]: values[key],
					});
				});
			});
		});
	});

	describe('an array of objects with divergent keys', () => {
		it('should have the corresponding rows', () => {
			const printValue: ReadonlyArray<TestPrintValue> = [
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
			const returnValue = tablify(printValue);
			return printValue.forEach((values, i) => {
				Object.keys(values).forEach((key, keyIndex) => {
					expect(returnValue[i * printValue.length + 1 + keyIndex]).eql({
						[key]: values[key],
					});
				});
			});
		});
	});

	describe('an object with an array of objects', () => {
		it('should have the corresponding rows', () => {
			const printValue = {
				root: 'value',
				objectArray: [{ sample: 1 }, { sample: 2 }],
			};
			const returnValue = tablify(printValue);
			return Object.entries(printValue).forEach(([key, value], arrayKey) => {
				const parseValue = (val: string | { sample: number }[]) => {
					if (Array.isArray(val)) {
						return val.map(objectToKeyValueString).join('\n\n');
					}
					return val;
				};
				const strValue = parseValue(value);
				expect({ [key]: strValue }).to.eql(returnValue[arrayKey]);
			});
		});
	});

	describe('an array of objects with nested keys', () => {
		it('should have the corresponding rows', () => {
			const printValue: ReadonlyArray<TestPrintValue> = [
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
			const returnValue = tablify(printValue);
			return printValue.forEach((values, i) => {
				const innerObjectKeys = Object.keys(values);
				innerObjectKeys.forEach((key, keyIndex) => {
					let strValue = values[key];
					if (Array.isArray(values[key])) {
						strValue = (values[key] as ReadonlyArray<string>).join('\n');
					} else if (typeof values[key] === 'object') {
						strValue = Object.entries(values[key])
							.map(
								([vKey, vValue]) =>
									`${vKey}: ${JSON.stringify(vValue, null, ' ')}`,
							)
							.join('\n');
					}
					expect(
						returnValue[i * (innerObjectKeys.length + 1) + keyIndex + 1],
					).eql({
						[key]: strValue,
					});
				});
			});
		});
	});
});

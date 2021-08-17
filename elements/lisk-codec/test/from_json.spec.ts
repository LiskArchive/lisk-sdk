/*
 * Copyright © 2020 Lisk Foundation
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
 */
import { codec } from '../src/codec';
import { testCases as accountTestCases } from '../fixtures/account_encodings.json';
import { getAccountFromJSON } from './utils';

describe('fromJSON', () => {
	it('should return JSON like object from JS object', () => {
		const { schema, object } = accountTestCases[0].input;

		const jsObject = getAccountFromJSON(object);

		expect(codec.fromJSON(schema, object)).toEqual(jsObject);
	});

	it('should ignore extra properties', () => {
		const schema = {
			$id: '/schema',
			type: 'object',
			required: ['rootProp', 'objectValue', 'arrayValue'],
			properties: {
				rootProp: {
					dataType: 'uint64',
					fieldNumber: 1,
				},
				objectValue: {
					type: 'object',
					fieldNumber: 2,
					properties: {
						objectProp: {
							dataType: 'uint64',
							fieldNumber: 1,
						},
					},
				},
				arrayValue: {
					type: 'array',
					fieldNumber: 3,
					items: {
						type: 'object',
						properties: {
							arrayProp: {
								dataType: 'uint64',
								fieldNumber: 1,
							},
						},
					},
				},
			},
		};

		const result = codec.fromJSON(schema, {
			rootProp: '123',
			extra3: true,
			objectValue: { objectProp: '456', extra1: 'my-value', extra2: 'my-value' },
			arrayValue: [
				{ arrayProp: '999', extra4: true },
				{ arrayProp: '879', extra5: 987 },
			],
		});

		expect(result).toEqual({
			rootProp: BigInt(123),
			objectValue: { objectProp: BigInt(456) },
			arrayValue: [{ arrayProp: BigInt(999) }, { arrayProp: BigInt(879) }],
		});
	});
});

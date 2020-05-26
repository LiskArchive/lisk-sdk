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

import { Codec } from '../src/codec';
import * as booleanDecoding from '../fixtures/boolean_encodings.json';
import * as numberDecoding from '../fixtures/number_encodings.json';
import * as bytesDecoding from '../fixtures/bytes_encodings.json';
import * as stringDecoding from '../fixtures/string_encodings.json';
import * as objectDecoding from '../fixtures/objects_encodings.json';
import * as arrayDecoding from '../fixtures/arrays_encodings.json';

describe('decode', () => {
	describe('boolean decoding', () => {
		for (const testCase of booleanDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
				expect(result).toEqual(testCase.input.object);
			});
		}
	});

	describe('number decoding', () => {
		describe('uint32/sint32 decoding', () => {
			for (const testCase of numberDecoding.testCases.slice(0, 2)) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
					expect(result).toEqual(testCase.input.object);
				});
			}
		});

		describe('uint64/sint64 decoding', () => {
			for (const testCase of numberDecoding.testCases.slice(2, 4)) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
					expect(result).toEqual({ ...testCase.input.object, number: BigInt(testCase.input.object.number) });
				});
			}
		});
	});

	describe('bytes decoding', () => {
		for (const testCase of bytesDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
				expect(result).toEqual({ ...testCase.input.object, address: Buffer.from(testCase.input.object.address.data) });
			});
		}
	});

	describe('string decoding', () => {
		for (const testCase of stringDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
				expect(result).toEqual(testCase.input.object);
			});
		}
	});

	describe('object decoding', () => {
		it('Encoding of object', () => {
			const testCase = objectDecoding.testCases[0];
			const codec = new Codec();
			const result = codec.decode(testCase.input.schema as any, Buffer.from(testCase.output.value, 'hex'));
			expect(result).toEqual({ ...testCase.input.object, balance: BigInt(testCase.input.object.balance), address: Buffer.from(testCase.input.object.address?.data as number[]) });
		});

		it('Encoding of object with optional property', () => {
			const testCase = objectDecoding.testCases[1];
			const codec = new Codec();
			const result = codec.decode(testCase.input.schema as any, Buffer.from(testCase.output.value, 'hex'));
			expect(result).toEqual({ ...testCase.input.object, value: BigInt(testCase.input.object.value) });
		});
	});

	describe('array decoding', () => {
		describe('array decoding except object', () => {
			// Index 3 is the object test, which needs special handling
			const testCases = [...arrayDecoding.testCases.slice(0, 3), ...arrayDecoding.testCases.slice(4)];
			for (const testCase of testCases) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(testCase.input.schema as any, Buffer.from(testCase.output.value, 'hex'));
					expect(result).toEqual(testCase.input.object);
				});
			}
		});

		it('Encoding of array of object', () => {
			const testCase = arrayDecoding.testCases[3];
			const codec = new Codec();
			const result = codec.decode(testCase.input.schema as any, Buffer.from(testCase.output.value, 'hex'));
			expect(result).toEqual({ ...testCase.input.object, myArray: testCase.input.object.myArray?.map(l => ({ ...l, amount: BigInt(l.amount) })) });
		});
	});
});

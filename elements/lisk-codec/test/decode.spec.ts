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
import * as booleanDecoding from '../fixtures/validBooleanEncodings.json';
import * as numberDecoding from '../fixtures/validNumberEncodings.json';
import * as bytesDecoding from '../fixtures/validBytesEncodings.json';
import * as stringDecoding from '../fixtures/validStringEncodings.json';
import * as objectDecoding from '../fixtures/validObjectEncodings.json';
import * as arrayDecoding from '../fixtures/validArrayEncodings.json';

describe('decode', () => {
	let codec: Codec;
	beforeEach(() => {
		codec = new Codec();
	});

	describe('boolean decoding', () => {
		it('should decode true', () => {
			const { schema } = booleanDecoding.testCases[0].input.booleanTrue;
			const message = Buffer.from(booleanDecoding.testCases[0].output.booleanTrue, 'hex');
			const expectedResult = booleanDecoding.testCases[0].input.booleanTrue.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode false', () => {
			const { schema } = booleanDecoding.testCases[0].input.booleanFalse;
			const message = Buffer.from(booleanDecoding.testCases[0].output.booleanFalse, 'hex');
			const expectedResult = booleanDecoding.testCases[0].input.booleanFalse.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('number decoding', () => {
		it('should decode uint32', () => {
			const { schema } = numberDecoding.testCases[0].input.message32;
			const message = Buffer.from(numberDecoding.testCases[0].output.numberEncoded32, 'hex');
			const expectedResult = numberDecoding.testCases[0].input.message32.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode sint32', () => {
			const { schema } = numberDecoding.testCases[0].input.messageSigned32;
			const message = Buffer.from(numberDecoding.testCases[0].output.signedNumberEncoded32, 'hex');
			const expectedResult = numberDecoding.testCases[0].input.messageSigned32.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode uint64', () => {
			const { schema } = numberDecoding.testCases[0].input.message64;
			const message = Buffer.from(numberDecoding.testCases[0].output.numberEncoded64, 'hex');
			const expectedResult = numberDecoding.testCases[0].input.message64.object;
			const result = codec.decode(schema, message);
			expect((result as any).number).toEqual(BigInt(expectedResult.number));
		});

		it('should decode sint64', () => {
			const { schema } = numberDecoding.testCases[0].input.messageSigned64;
			const message = Buffer.from(numberDecoding.testCases[0].output.signedNumberEncoded64, 'hex');
			const expectedResult = numberDecoding.testCases[0].input.messageSigned64.object;
			const result = codec.decode(schema, message);
			expect((result as any).number).toEqual(BigInt(expectedResult.number));
		});
	});

	describe('bytes decoding', () => {
		it('should decode bytes', () => {
			const { schema } = bytesDecoding.testCases[0].input.bytes;
			const message = Buffer.from(bytesDecoding.testCases[0].output.bytes, 'hex');
			const expectedResult = Buffer.from(bytesDecoding.testCases[0].input.bytes.object.address.data);
			const result = codec.decode(schema, message);
			expect((result as any).address).toEqual(expectedResult);
		});

		it('should decode empty bytes', () => {
			const { schema } = bytesDecoding.testCases[0].input.emptyBytes;
			const message = Buffer.from(bytesDecoding.testCases[0].output.emptyBytes, 'hex');
			const expectedResult = Buffer.from(bytesDecoding.testCases[0].input.emptyBytes.object.address.data);
			const result = codec.decode(schema, message);
			expect((result as any).address).toEqual(expectedResult);
		});
	});

	describe('string decoding', () => {
		it('should decode string', () => {
			const { schema } = stringDecoding.testCases[0].input.string;
			const message = Buffer.from(stringDecoding.testCases[0].output.string, 'hex');
			const expectedResult = stringDecoding.testCases[0].input.string.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode empty string', () => {
			const { schema } = stringDecoding.testCases[0].input.emptyString;
			const message = Buffer.from(stringDecoding.testCases[0].output.emptyString, 'hex');
			const expectedResult = stringDecoding.testCases[0].input.emptyString.object;
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('object decoding', () => {
		it('should decode object', () => {
			const { schema } = objectDecoding.testCases[0].input.object;
			const message = Buffer.from(objectDecoding.testCases[0].output.object, 'hex');
			const expectedResult = {
				...objectDecoding.testCases[0].input.object.object,
				balance: BigInt(objectDecoding.testCases[0].input.object.object.balance),
				address: Buffer.from(objectDecoding.testCases[0].input.object.object.address.data),
			}
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode object with optional properties', () => {
			const { schema } = objectDecoding.testCases[0].input.objectWithOptionalProp;
			const message = Buffer.from(objectDecoding.testCases[0].output.objectWithOptionalProp, 'hex');
			const expectedResult = {
				...objectDecoding.testCases[0].input.objectWithOptionalProp.object,
				value: BigInt(objectDecoding.testCases[0].input.objectWithOptionalProp.object.value),
			}
			const result = codec.decode(schema, message);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('array decoding', () => {
		it('should decode array of integers', () => {
			const { schema } = arrayDecoding.testCases[0].input.arrayOfIntegers;
			const message = Buffer.from(arrayDecoding.testCases[0].output.arrayOfIntegersEncoded, 'hex');
			const expectedResult = arrayDecoding.testCases[0].input.arrayOfIntegers.object;
			// TODO: Update $id
			const result = codec.decode(schema as any, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode array of booleans', () => {
			const { schema } = arrayDecoding.testCases[0].input.arrayBools;
			const message = Buffer.from(arrayDecoding.testCases[0].output.arrayBoolsEncoded, 'hex');
			const expectedResult = arrayDecoding.testCases[0].input.arrayBools.object;
			// TODO: Update $id
			const result = codec.decode(schema as any, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode array of objects', () => {
			const { schema } = arrayDecoding.testCases[0].input.arrayOfObjects;
			const message = Buffer.from(arrayDecoding.testCases[0].output.arrayOfObjectsEncoded, 'hex');
			const expectedResult = {
				myArray: arrayDecoding.testCases[0].input.arrayOfObjects.object.myArray.map(obj => ({
					...obj,
					amount: BigInt(obj.amount),
				})),
			};
			// TODO: Update $id
			const result = codec.decode(schema as any, message);
			expect(result).toEqual(expectedResult);
		});

		it('should decode empty array', () => {
			const { schema } = arrayDecoding.testCases[0].input.emptyArray;
			const message = Buffer.from(arrayDecoding.testCases[0].output.emptyArrayEncoded, 'hex');
			const expectedResult = arrayDecoding.testCases[0].input.emptyArray.object;
			// TODO: Update $id
			const result = codec.decode(schema as any, message);
			expect(result).toEqual(expectedResult);
		});
	});
});

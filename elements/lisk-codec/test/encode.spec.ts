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

import { testCases as objectTestCases } from '../fixtures/validObjectEncodings.json';
import { testCases as bytesTestCases } from '../fixtures/validBytesEncodings.json';
import { testCases as stringTestCases } from '../fixtures/validStringEncodings.json';
import { testCases as booleanTestCases } from '../fixtures/validBooleanEncodings.json';
import { testCases as numberTestCases } from '../fixtures/validNumberEncodings.json';

const objectFixtureInput = objectTestCases[0].input;
const objectFixtureOutput = objectTestCases[0].output;
const bytesFixtureInput = bytesTestCases[0].input;
const bytesFixtureOutput = bytesTestCases[0].output;
const stringFixtureInput = stringTestCases[0].input;
const stringFixtureOutput = stringTestCases[0].output;
const booleanFixtureInput = booleanTestCases[0].input;
const booleanFixtureOutput = booleanTestCases[0].output;
const numberFixtureInput = numberTestCases[0].input;
const numberFixtureOutput = numberTestCases[0].output;

describe('encode', () => {
	describe('objects', () => {
		it('should encode an object with nested objects to Buffer', () => {
			const message = objectFixtureInput.object.object;
			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from(message.address.data);
			// Fix number not being bigint
			(message as any).balance = BigInt(message.balance);

			const {
				object: { schema },
			} = objectFixtureInput;

			const { object: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should not encode missing propertiees of an object to Buffer', () => {
			const message = objectFixtureInput.objectWithOptionalProp.object;
			const { schema } = objectFixtureInput.objectWithOptionalProp;
			const expectedOutput = objectFixtureOutput.objectWithOptionalProp;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('bytes', () => {
		it('should encode a chunk of bytes as bytes with no changes', () => {
			const message = bytesFixtureInput.bytes.object;
			const originalMessageBytes = Buffer.from(
				bytesFixtureInput.bytes.object.address.data,
			).toString('hex');
			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from(message.address.data);
			const {
				bytes: { schema },
			} = bytesFixtureInput;
			const expectedOutput = bytesFixtureOutput.bytes;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			const liskBinaryMessageAsHex = liskBinaryMessage.toString('hex');

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);

			expect(liskBinaryMessageAsHex.substring(4)).toEqual(originalMessageBytes);
		});

		it('should encode empty bytes', () => {
			const { object: message, schema } = bytesFixtureInput.emptyBytes;
			(message as any).address = Buffer.from(message.address.data);
			const expectedOutput = bytesFixtureOutput.emptyBytes;
			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('strings', () => {
		it('should encode a regular strings', () => {
			const { object: message, schema } = stringFixtureInput.string;
			const expectedOutput = stringFixtureOutput.string;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode empty string', () => {
			const { object: message, schema } = stringFixtureInput.emptyString;
			const expectedOutput = stringFixtureOutput.emptyString;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('booleans', () => {
		it('should encode boolean true', () => {
			const { object: message, schema } = booleanFixtureInput.booleanTrue;
			const expectedOutput = booleanFixtureOutput.booleanTrue;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode boolean false', () => {
			const { object: message, schema } = booleanFixtureInput.booleanFalse;
			const expectedOutput = booleanFixtureOutput.booleanFalse;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('numbers', () => {
		it('should encode unsigned 32', () => {
			const { object: message, schema } = numberFixtureInput.message32;
			const expectedOutput = numberFixtureOutput.numberEncoded32;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 32', () => {
			const { object: message, schema } = numberFixtureInput.messageSigned32;
			const expectedOutput = numberFixtureOutput.signedNumberEncoded32;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode unsigned 64', () => {
			const { object: message, schema } = numberFixtureInput.message64;
			(message as any).number = BigInt(message.number);
			const expectedOutput = numberFixtureOutput.numberEncoded64;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 64', () => {
			const { object: message, schema } = numberFixtureInput.messageSigned64;
			(message as any).number = BigInt(message.number);
			const expectedOutput = numberFixtureOutput.signedNumberEncoded64;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});
});

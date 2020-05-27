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

import { testCases as objectTestCases } from '../fixtures/objects_encodings.json';
import { testCases as bytesTestCases } from '../fixtures/bytes_encodings.json';
import { testCases as stringTestCases } from '../fixtures/string_encodings.json';
import { testCases as booleanTestCases } from '../fixtures/boolean_encodings.json';
import { testCases as numberTestCases } from '../fixtures/number_encodings.json';
import { testCases as CartTestCases } from '../fixtures/cart_sample_encoding.json';

describe('encode', () => {
	describe('objects', () => {
		it('should encode an object with nested objects to Buffer', () => {
			const objectFixtureInput = objectTestCases[0].input;
			const objectFixtureOutput = objectTestCases[0].output;
			const message = objectFixtureInput.object;
			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from((message as any).address.data);
			// Fix number not being bigint
			(message as any).balance = BigInt(message.balance);

			const { schema } = objectFixtureInput;

			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should not encode missing propertiees of an object to Buffer', () => {
			const objectFixtureInput = objectTestCases[1].input;
			const objectFixtureOutput = objectTestCases[1].output;
			const message = objectFixtureInput.object;
			const { schema } = objectFixtureInput;
			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode array of objects containing array of objects', () => {
			const objectFixtureInput = CartTestCases[0].input;
			const objectFixtureOutput = CartTestCases[0].output;
			const message = objectFixtureInput.object;
			const { schema } = objectFixtureInput;
			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('bytes', () => {
		it('should encode a chunk of bytes as bytes with no changes', () => {
			const bytesFixtureInput = bytesTestCases[0].input;
			const bytesFixtureOutput = bytesTestCases[0].output;
			const message = bytesFixtureInput.object;

			const originalMessageBytes = Buffer.from(
				bytesFixtureInput.object.address.data,
			).toString('hex');
			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from(message.address.data);
			const { schema } = bytesFixtureInput;
			const { value: expectedOutput } = bytesFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			const liskBinaryMessageAsHex = liskBinaryMessage.toString('hex');

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);

			expect(liskBinaryMessageAsHex.substring(4)).toEqual(originalMessageBytes);
		});

		it('should encode empty bytes', () => {
			const bytesFixtureInput = bytesTestCases[1].input;
			const bytesFixtureOutput = bytesTestCases[1].output;
			const message = bytesFixtureInput.object;
			const { schema } = bytesFixtureInput;

			(message as any).address = Buffer.from(message.address.data);
			const { value: expectedOutput } = bytesFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('strings', () => {
		it('should encode a regular strings', () => {
			const stringFixtureInput = stringTestCases[0].input;
			const stringFixtureOutput = stringTestCases[0].output;
			const { object: message, schema } = stringFixtureInput;
			const { value: expectedOutput } = stringFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode empty string', () => {
			const stringFixtureInput = stringTestCases[1].input;
			const stringFixtureOutput = stringTestCases[1].output;
			const { object: message, schema } = stringFixtureInput;
			const { value: expectedOutput } = stringFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('booleans', () => {
		it('should encode boolean true', () => {
			const booleanFixtureInput = booleanTestCases[0].input;
			const booleanFixtureOutput = booleanTestCases[0].output;
			const { object: message, schema } = booleanFixtureInput;
			const { value: expectedOutput } = booleanFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode boolean false', () => {
			const booleanFixtureInput = booleanTestCases[1].input;
			const booleanFixtureOutput = booleanTestCases[1].output;
			const { object: message, schema } = booleanFixtureInput;
			const { value: expectedOutput } = booleanFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('numbers', () => {
		it('should encode unsigned 32', () => {
			const numberFixtureInput = numberTestCases[0].input;
			const numberFixtureOutput = numberTestCases[0].output;
			const { object: message, schema } = numberFixtureInput;
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 32', () => {
			const numberFixtureInput = numberTestCases[1].input;
			const numberFixtureOutput = numberTestCases[1].output;
			const { object: message, schema } = numberFixtureInput;
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode unsigned 64', () => {
			const numberFixtureInput = numberTestCases[2].input;
			const numberFixtureOutput = numberTestCases[2].output;
			const { object: message, schema } = numberFixtureInput;
			(message as any).number = BigInt(message.number);
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 64', () => {
			const numberFixtureInput = numberTestCases[3].input;
			const numberFixtureOutput = numberTestCases[3].output;
			const { object: message, schema } = numberFixtureInput;
			(message as any).number = BigInt(message.number);
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});
});

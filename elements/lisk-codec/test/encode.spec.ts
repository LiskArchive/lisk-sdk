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

import { testCases } from '../fixtures/validObjectEncodings.json';

const objectFixtureInput = testCases[0].input;
const objectFixtureOutput = testCases[0].output;

describe('encode', () => {
	it('it should encode an object with nested objects to Buffer', () => {
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

	it('it should not encode missing propertiees of an object to Buffer', () => {
		const message = objectFixtureInput.objectWithOptionalProp.object;
		const { schema } = objectFixtureInput.objectWithOptionalProp;
		const expectedOutput = objectFixtureOutput.objectWithOptionalProp;

		const liskBinaryMessage = codec.encode(schema as any, message as any);
		expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
	});
});

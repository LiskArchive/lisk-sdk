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

// import { codec } from '../src/codec';

import { testCases as objectTestCases } from '../fixtures/objects_encodings.json';
import { codec } from '../src/codec';

const objectFixtureInput = objectTestCases[0].input;

describe('addSchema', () => {
	it('it should add schema and keep it in cache', () => {
		const message = objectFixtureInput.object;
		// Replace the JSON representation of buffer with an actual buffer
		(message as any).address = Buffer.from((message as any).address.data);
		// Fix number not being bigint
		(message as any).balance = BigInt(message.balance);

		const { schema } = objectFixtureInput;

		codec.encode(schema as any, message as any);

		expect((codec as any)._compileSchemas.object11).toMatchSnapshot();
	});
});

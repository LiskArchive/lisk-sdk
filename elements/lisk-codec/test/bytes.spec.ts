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

import { writeBytes, readBytes } from '../src/bytes';
import { testCases } from '../fixtures/validBytesEncodings.json';

describe('bytes', () => {
	describe('writer', () => {
		it('should encode bytes', () => {
			const testCaseOneInput = testCases[0].input.bytes;
			const testCaseOneOutput = testCases[0].output.bytes;
			expect(
				writeBytes(
					Buffer.from(testCaseOneInput.object.address.data),
					testCaseOneInput.schema.properties.address,
				).toString('hex'),
			).toEqual(testCaseOneOutput.slice(2, testCaseOneOutput.length)); // Ignoring the key part

			const testCaseSecondInput = testCases[0].input.emptyBytes;
			const testCaseSecondOutput = testCases[0].output.emptyBytes;
			expect(
				writeBytes(
					Buffer.from(testCaseSecondInput.object.address.data),
					testCaseSecondInput.schema.properties.data,
				).toString('hex'),
			).toEqual(testCaseSecondOutput.slice(2, testCaseOneOutput.length)); // Ignoring the key part
		});
	});

	describe('reader', () => {
		it('should decode bytes', () => {
			const testCaseOneInput = testCases[0].input.bytes;
			expect(
				readBytes(
					writeBytes(
						Buffer.from(testCaseOneInput.object.address.data),
						testCaseOneInput.schema.properties.address,
					),
					testCaseOneInput.schema.properties.address,
				),
			).toEqual(Buffer.from(testCaseOneInput.object.address.data));

			const testCaseSecondInput = testCases[0].input.bytes;
			expect(
				readBytes(
					writeBytes(
						Buffer.from(testCaseSecondInput.object.address.data),
						testCaseSecondInput.schema.properties.address,
					),
					testCaseSecondInput.schema.properties.address,
				),
			).toEqual(Buffer.from(testCaseSecondInput.object.address.data));
		});
	});
});

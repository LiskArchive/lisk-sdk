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

import { writeString, readString } from '../src/string';
import { testCases } from '../fixtures/validStringEncodings.json';

describe('string', () => {
	describe('writer', () => {
		it('should encode string', () => {
			const testCaseOneInput = testCases[0].input.string;
			const testCaseOneOutput = testCases[0].output.string;
			expect(
				writeString(
					testCaseOneInput.object.data,
					testCaseOneInput.schema.properties.data,
				).toString('hex'),
			).toEqual(testCaseOneOutput.slice(2, testCaseOneOutput.length)); // Ignoring the key part

			const testCaseSecondInput = testCases[0].input.string;
			const testCaseSecondOutput = testCases[0].output.string;
			expect(
				writeString(
					testCaseSecondInput.object.data,
					testCaseSecondInput.schema.properties.data,
				).toString('hex'),
			).toEqual(testCaseSecondOutput.slice(2, testCaseSecondOutput.length)); // Ignoring the key part
		});
	});

	describe('reader', () => {
		it('should decode string', () => {
			const testCaseOneInput = testCases[0].input.string;
			expect(
				readString(
					writeString(
						testCaseOneInput.object.data,
						testCaseOneInput.schema.properties.data,
					),
					testCaseOneInput.schema.properties.data,
				),
			).toEqual(testCaseOneInput.object.data);

			const testCaseSecondInput = testCases[0].input.string;
			expect(
				readString(
					writeString(
						testCaseSecondInput.object.data,
						testCaseSecondInput.schema.properties.data,
					),
					testCaseSecondInput.schema.properties.data,
				),
			).toEqual(testCaseSecondInput.object.data);
		});
	});
});

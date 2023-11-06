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

import { sync as globSync } from 'glob';
import { join } from 'path';
import { readFileSync } from 'fs';
import { codec } from '../src/codec';
import { buildTestCases } from './utils';

const files = globSync(join(__dirname, '..', 'fixtures', '*_decodings.json')).map(
	p =>
		JSON.parse(readFileSync(p, 'utf8')) as {
			title: string;
			testCases: {
				description: string;
				input: { value: string; schema: any };
				output: { object: object };
			}[];
		},
);

describe('decodeJSON', () => {
	describe.each(buildTestCases(files))('%s', file => {
		it.each(buildTestCases(file.testCases))('%s', ({ input, output, description }) => {
			if (description.includes('Decoding of object with optional property')) {
				expect(() => codec.decodeJSON(input.schema, Buffer.from(input.value, 'hex'))).toThrow(
					'Invalid field number while decoding.',
				);
				return;
			}
			expect(codec.decodeJSON(input.schema, Buffer.from(input.value, 'hex'))).toEqual(
				output.object,
			);
		});
	});
});

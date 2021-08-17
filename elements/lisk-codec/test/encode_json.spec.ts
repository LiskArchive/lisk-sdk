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

const files = globSync(join(__dirname, '..', 'fixtures', '*_encodings.json')).map(
	p =>
		JSON.parse(readFileSync(p, 'utf8')) as {
			title: string;
			testCases: {
				description: string;
				input: { object: object; schema: any };
				output: { value: string };
			}[];
		},
);

describe('encodeJSON', () => {
	describe.each(buildTestCases(files))('%s', file => {
		it.each(buildTestCases(file.testCases))('%s', ({ input, output }) => {
			expect(codec.encodeJSON(input.schema, input.object).toString('hex')).toEqual(output.value);
		});
	});
});

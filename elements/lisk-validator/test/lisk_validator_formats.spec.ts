/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { validator } from '../src';

describe('validator formats', () => {
	const baseSchemaId = 'test/schema';
	let baseSchema: object;

	beforeAll(() => {
		baseSchema = {
			$id: baseSchemaId,
			type: 'object',
		};
	});

	describe('base64', () => {
		let schema: object;
		beforeEach(() => {
			schema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'base64',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid base64 string is provided', () => {
			expect(
				validator.validate(schema, { target: 'I7ntgYUmqSi86RuW+0UIursSHuI=' }),
			).toEqual([]);
		});

		it('should validate to false when not base64 is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'base64' },
					message: 'should match format "base64"',
				},
			];

			expect(
				validator.validate(schema, {
					target: 'notValid?!base64-!!@',
				}),
			).toEqual(expectedError);
		});
	});
});

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

	describe('hex', () => {
		let schema: object;
		beforeEach(() => {
			schema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'hex',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid hex string is provided', () => {
			expect(
				validator.validate(schema, { target: '23b9ed818526a928bce91b96fb4508babb121ee2' }),
			).toEqual([]);
		});

		it('should validate to false when not hex is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'hex' },
					message: 'must match format "hex"',
				},
			];

			expect(
				validator.validate(schema, {
					target: 'notValid?!hex-!!@',
				}),
			).toEqual(expectedError);
		});
	});

	describe('path', () => {
		const pathSchema = {
			properties: {
				rootPath: {
					type: 'string',
					format: 'path',
				},
			},
		};

		it('should validate to false for invalid path', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.rootPath',
					schemaPath: '#/properties/rootPath/format',
					params: { format: 'path' },
					message: 'must match format "path"',
				},
			];

			expect(validator.validate(pathSchema, { rootPath: 'lisk' })).toEqual(expectedError);
		});

		it('should validate to true for valid path with tilde', () => {
			expect(validator.validate(pathSchema, { rootPath: '~/.lisk' })).toBeEmpty();
		});

		it('should validate to true for valid path', () => {
			expect(validator.validate(pathSchema, { rootPath: '/tmp/lisk/test/' })).toBeEmpty();
		});
	});

	describe('encryptedPassphrase', () => {
		const encryptedPassphraseSchema = {
			properties: {
				encryptedPassphrase: {
					type: 'string',
					format: 'encryptedPassphrase',
				},
			},
		};

		it('should validate to false for invalid path', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.encryptedPassphrase',
					schemaPath: '#/properties/encryptedPassphrase/format',
					params: { format: 'encryptedPassphrase' },
					message: 'must match format "encryptedPassphrase"',
				},
			];

			[
				'cipherText',
				'cipherText=',
				'cipherText=abcd1234&iterations=10000&iv=ef012345cipherText=abcd1234&iterations=10000&iv=ef012345',
			].forEach(text => {
				expect(
					validator.validate(encryptedPassphraseSchema, {
						encryptedPassphrase: text,
					}),
				).toEqual(expectedError);
			});
		});

		it('should validate to true for valid encrypted passphrase', () => {
			['cipherText=abcd1234', 'cipherText=abcd1234&iterations=10000&iv=ef012345'].forEach(text => {
				expect(
					validator.validate(encryptedPassphraseSchema, {
						encryptedPassphrase: text,
					}),
				).toBeEmpty();
			});
		});
	});

	describe('camelCaseRegex', () => {
		const camelCaseRegexSchema = {
			properties: {
				camelCaseRegex: {
					type: 'string',
					format: 'camelCase',
				},
			},
		};

		it('should validate to false for invalid camel case text', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.camelCaseRegex',
					schemaPath: '#/properties/camelCaseRegex/format',
					params: { format: 'camelCase' },
					message: 'must match format "camelCase"',
				},
			];

			['NotCamelCase', '123Case', '_camelCase'].forEach(text => {
				expect(validator.validate(camelCaseRegexSchema, { camelCaseRegex: text })).toEqual(
					expectedError,
				);
			});
		});

		it('should validate to true for valid camel case text', () => {
			['camelCase'].forEach(text => {
				expect(validator.validate(camelCaseRegexSchema, { camelCaseRegex: text })).toBeEmpty();
			});
		});
	});

	describe('version', () => {
		const versionSchema = {
			properties: {
				version: {
					type: 'string',
					format: 'version',
				},
			},
		};

		it('should validate to false for invalid semantic versions', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.version',
					schemaPath: '#/properties/version/format',
					params: { format: 'version' },
					message: 'must match format "version"',
				},
			];

			['9999999999999999.4.7.4', 'alpha one', '1.2.12.102', '4.6.3.9.2-alpha2'].forEach(text => {
				expect(validator.validate(versionSchema, { version: text })).toEqual(expectedError);
			});
		});

		it('should validate to true for valid semantic versions', () => {
			['1.2.0', '1.0.0-alpha.0', 'v1.2.3', '1.0.0-beta+exp.sha.5114f85'].forEach(text => {
				expect(validator.validate(versionSchema, { version: text })).toBeEmpty();
			});
		});
	});
});

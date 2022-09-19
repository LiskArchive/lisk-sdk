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
	const baseSchemaId = '/test/schema';
	let baseSchema: Record<string, unknown>;

	beforeAll(() => {
		baseSchema = {
			$id: baseSchemaId,
			type: 'object',
		};
	});

	describe('hex', () => {
		let schema: Record<string, unknown>;
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
			expect(() =>
				validator.validate(schema, { target: '23b9ed818526a928bce91b96fb4508babb121ee2' }),
			).not.toThrow();
		});

		it('should validate to false when not hex is provided', () => {
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.target\' must match format "hex"';

			expect(() =>
				validator.validate(schema, {
					target: 'notValid?!hex-!!@',
				}),
			).toThrow(expectedError);
		});
	});

	describe('lisk32', () => {
		let schema: Record<string, unknown>;
		beforeEach(() => {
			schema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'lisk32',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid hex string is provided', () => {
			expect(() =>
				validator.validate(schema, { target: 'lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz' }),
			).not.toThrow();
		});

		it('should validate to false when address is in hex', () => {
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.target\' must match format "lisk32"';

			expect(() =>
				validator.validate(schema, {
					target: '88c0ee8a4f8fa0e498770c70749584f179938ffa',
				}),
			).toThrow(expectedError);
		});

		it('should validate to false when address is invalid', () => {
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.target\' must match format "lisk32"';

			expect(() =>
				validator.validate(schema, {
					target: 'lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxqzzz',
				}),
			).toThrow(expectedError);
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
			expect(() => validator.validate(pathSchema, { rootPath: 'lisk' })).toThrow(
				'Property \'.rootPath\' must match format "path"',
			);
		});

		it('should validate to true for valid path with tilde', () => {
			expect(() => validator.validate(pathSchema, { rootPath: '~/.lisk' })).not.toThrow();
		});

		it('should validate to true for valid path', () => {
			expect(() => validator.validate(pathSchema, { rootPath: '/tmp/lisk/test/' })).not.toThrow();
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
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.encryptedPassphrase\' must match format "encryptedPassphrase"';

			[
				'cipherText',
				'cipherText=',
				'cipherText=abcd1234&iterations=10000&iv=ef012345cipherText=abcd1234&iterations=10000&iv=ef012345',
			].forEach(text => {
				expect(() =>
					validator.validate(encryptedPassphraseSchema, {
						encryptedPassphrase: text,
					}),
				).toThrow(expectedError);
			});
		});

		it('should validate to true for valid encrypted passphrase', () => {
			['cipherText=abcd1234', 'cipherText=abcd1234&iterations=10000&iv=ef012345'].forEach(text => {
				expect(() =>
					validator.validate(encryptedPassphraseSchema, {
						encryptedPassphrase: text,
					}),
				).not.toThrow();
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
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.camelCaseRegex\' must match format "camelCase"';

			['NotCamelCase', '123Case', '_camelCase'].forEach(text => {
				expect(() => validator.validate(camelCaseRegexSchema, { camelCaseRegex: text })).toThrow(
					expectedError,
				);
			});
		});

		it('should validate to true for valid camel case text', () => {
			['camelCase'].forEach(text => {
				expect(() =>
					validator.validate(camelCaseRegexSchema, { camelCaseRegex: text }),
				).not.toThrow();
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
			const expectedError =
				'Lisk validator found 1 error[s]:\nProperty \'.version\' must match format "version"';

			['9999999999999999.4.7.4', 'alpha one', '1.2.12.102', '4.6.3.9.2-alpha2'].forEach(text => {
				expect(() => validator.validate(versionSchema, { version: text })).toThrow(expectedError);
			});
		});

		it('should validate to true for valid semantic versions', () => {
			['1.2.0', '1.0.0-alpha.0', 'v1.2.3', '1.0.0-beta+exp.sha.5114f85'].forEach(text => {
				expect(() => validator.validate(versionSchema, { version: text })).not.toThrow();
			});
		});
	});
});

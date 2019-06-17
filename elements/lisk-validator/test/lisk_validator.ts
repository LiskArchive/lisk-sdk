/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import { validator } from '../src/lisk_validator';

describe('validator', () => {
	const baseSchemaId = 'test/schema';
	let baseSchema: object;

	before(async () => {
		baseSchema = {
			$id: baseSchemaId,
			type: 'object',
		};
	});

	describe('signature', () => {
		let signatureSchema: object;
		beforeEach(async () => {
			signatureSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'signature',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid signature is provided', async () => {
			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).to.be.an('array').that.is.empty;
		});

		it('should validate to false when non-hex character is in the signature', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'zzzzzzzzzzzzzzzzzzzzzzzzzzzzf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when the signature is under 128 characters', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b730',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when the signature is over 128 characters', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304a',
				}),
			).to.be.eql(expectedError);
		});
	});

	describe('id', () => {
		let idSchema: object;
		beforeEach(async () => {
			idSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'id',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid id is provided', async () => {
			expect(
				validator.validate(idSchema, { target: '3543510233978718399' }),
			).to.be.eql([]);
		});

		it('should validate to true when valid id with leading zeros is provided', async () => {
			expect(validator.validate(idSchema, { target: '00123' })).to.be.eql([]);
		});

		it('should validate to false when number greater than maximum is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'id' },
					message: 'should match format "id"',
				},
			];

			expect(
				validator.validate(idSchema, { target: '18446744073709551616' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number is provided', async () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(idSchema, { target: 3543510233978718399 }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'id' },
					message: 'should match format "id"',
				},
			];
			expect(validator.validate(idSchema, { target: '' })).to.be.eql(
				expectedError,
			);
		});
	});

	describe('address', () => {
		let addressSchema: object;
		beforeEach(async () => {
			addressSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'address',
							},
						},
					},
				],
			};
			//validate = validator.compile(addressSchema);
		});

		it('should validate to true when valid address is provided', async () => {
			expect(
				validator.validate(addressSchema, { target: '14815133512790761431L' }),
			).to.be.eql([]);
		});

		it('should validate to false when address with leading zeros is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '00015133512790761431L' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when address including `.` is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '14.15133512790761431L' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number greater than maximum is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '18446744073709551616L' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when the address does not end with "L"', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '14815133512790761431X' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when the address only contains numbers', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];
			expect(
				validator.validate(addressSchema, { target: '18446744073709551616' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when the address is less than 2 characters', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(validator.validate(addressSchema, { target: 'L' })).to.be.eql(
				expectedError,
			);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'address' },
					message: 'should match format "address"',
				},
			];

			expect(validator.validate(addressSchema, { target: '' })).to.be.eql(
				expectedError,
			);
		});
	});

	describe('non-transfer amount', () => {
		let nonTransferAmountSchema: object;
		beforeEach(async () => {
			nonTransferAmountSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'nonTransferAmount',
							},
						},
					},
				],
			};
			// validate = validator.compile(nonTransferAmountSchema);
		});

		it('should validate to true when valid amount is provided', async () => {
			expect(
				validator.validate(nonTransferAmountSchema, { target: '0' }),
			).to.be.eql([]);
		});

		it('should validate to false when invalid amount with leading zeros is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '000001' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number greater than maximum is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, {
					target: '9223372036854775808',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when decimal number is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '190.105310' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number is provided', async () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: 190105310 }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '' }),
			).to.be.eql(expectedError);
		});
	});

	describe('transfer amount', () => {
		let transferAmountSchema: object;
		beforeEach(async () => {
			transferAmountSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'transferAmount',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid amount is provided', async () => {
			expect(
				validator.validate(transferAmountSchema, { target: '100' }),
			).to.be.eql([]);
		});

		it('should validate to true when valid amount with leading zeros is provided', async () => {
			expect(
				validator.validate(transferAmountSchema, { target: '000000100' }),
			).to.be.eql([]);
		});

		it('should validate to false when amount is 0', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: '0' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number greater than maximum is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, {
					target: '9223372036854775808',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when decimal number is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: '190.105310' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when number is provided', async () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: 190105310 }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: '' }),
			).to.be.eql(expectedError);
		});
	});

	describe('fee', () => {
		let feeSchema: object;
		beforeEach(async () => {
			feeSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'fee',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid fee is provided', async () => {
			expect(validator.validate(feeSchema, { target: '100' })).to.be.eql([]);
		});

		it('should validate to true when valid fee with leading zeros is provided', async () => {
			expect(validator.validate(feeSchema, { target: '000000100' })).to.be.eql(
				[],
			);
		});

		it('should validate to false when amount is 0', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '0' })).to.be.eql(
				expectedError,
			);
		});

		it('should validate to false when number greater than maximum is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(
				validator.validate(feeSchema, { target: '9223372036854775808' }),
			).to.be.eql(expectedError);
		});

		it('should validate to false when decimal number is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '190.105310' })).to.be.eql(
				expectedError,
			);
		});

		it('should validate to false when number is provided', async () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];
			expect(validator.validate(feeSchema, { target: 190105310 })).to.be.eql(
				expectedError,
			);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '' })).to.be.eql(
				expectedError,
			);
		});
	});

	describe('emptyOrPublicKey', () => {
		let emptyOrPublicKeySchema: object;
		beforeEach(async () => {
			emptyOrPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: ['string', 'null'],
								format: 'emptyOrPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid publicKey is provided', async () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql([]);
		});

		it('should validate to true when null is provided', async () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: null,
				}),
			).to.be.eql([]);
		});

		it('should validate to true when undefined is provided', async () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: undefined,
				}),
			).to.be.eql([]);
		});

		it('should validate to true when empty string is provided', async () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: '',
				}),
			).to.be.eql([]);
		});

		it('should validate to false when non-hex character is in the publicKey', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'emptyOrPublicKey' },
					message: 'should match format "emptyOrPublicKey"',
				},
			];

			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target:
						'zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql(expectedError);
		});
	});

	describe('publicKey', () => {
		let publicKeySchema: object;
		beforeEach(async () => {
			publicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'publicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid publicKey is provided', async () => {
			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql([]);
		});

		it('should validate to false when non-hex character is in the publicKey', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is shorter', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is longer', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when signed publicKey is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(validator.validate(publicKeySchema, { target: '' })).to.be.eql(
				expectedError,
			);
		});
	});

	describe('signedPublicKey', () => {
		let signedPublicKeySchema: object;
		beforeEach(async () => {
			signedPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'signedPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid + and publicKey is provided', async () => {
			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql([]);
		});

		it('should validate to true when valid - and publicKey is provided', async () => {
			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql([]);
		});

		it('should validate to false when non-hex character is in the publicKey', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is shorter', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is longer', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when non-signed publicKey is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, { target: '' }),
			).to.be.eql(expectedError);
		});
	});

	describe('additionPublicKey', () => {
		let additionPublicKeySchema: object;
		beforeEach(async () => {
			additionPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'additionPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid + and publicKey is provided', async () => {
			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql([]);
		});

		it('should validate to false when valid - and publicKey is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when non-hex character is in the publicKey', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is shorter', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKey is longer', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when non-signed publicKey is provided', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when it is empty', async () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, { target: '' }),
			).to.be.eql(expectedError);
		});
	});

	describe('uniqueSignedPublicKeys', () => {
		let uniqueSignedPublicKeysSchema: object;
		beforeEach(async () => {
			uniqueSignedPublicKeysSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'array',
								uniqueSignedPublicKeys: true,
							},
						},
					},
				],
			};
		});

		it('should validate to true when unique signedPublicKey is provided', async () => {
			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+278a9aecf13e324c42d73cae7e21e5efc1520afb1abcda084d086d24441ed2b4',
					],
				}),
			).to.be.eql([]);
		});

		it('should validate to false when publicKeys are duplicated without the sign', async () => {
			const expectedError = [
				{
					keyword: 'uniqueSignedPublicKeys',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/uniqueSignedPublicKeys',
					params: { keyword: 'uniqueSignedPublicKeys' },
					message: 'should pass "uniqueSignedPublicKeys" keyword validation',
				},
			];
			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).to.be.eql(expectedError);
		});

		it('should validate to false when publicKeys are duplicated with the same sign', async () => {
			const expectedError = [
				{
					keyword: 'uniqueSignedPublicKeys',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/uniqueSignedPublicKeys',
					params: { keyword: 'uniqueSignedPublicKeys' },
					message: 'should pass "uniqueSignedPublicKeys" keyword validation',
				},
			];

			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).to.be.eql(expectedError);
		});
	});

	describe('noNullCharacter', () => {
		let noNullCharacterSchema: object;
		beforeEach(async () => {
			noNullCharacterSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'noNullCharacter',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid string is provided', async () => {
			expect(
				validator.validate(noNullCharacterSchema, {
					target: 'some normal string',
				}),
			).to.be.eql([]);
		});

		it('should validate to true when it is empty', async () => {
			expect(
				validator.validate(noNullCharacterSchema, { target: '' }),
			).to.be.eql([]);
		});

		it('should validate to false when string with null byte is provided', async () => {
			const nullCharacterList = ['\0', '\x00', '\u0000', '\\U00000000'];
			nullCharacterList.forEach(nullChar => {
				const expectedError = [
					{
						keyword: 'format',
						dataPath: '.target',
						schemaPath: '#/allOf/1/properties/target/format',
						params: { format: 'noNullCharacter' },
						message: 'should match format "noNullCharacter"',
					},
				];

				expect(
					validator.validate(noNullCharacterSchema, {
						target: `${nullChar} hey \x01 :)`,
					}),
				).to.be.eql(expectedError);
			});
		});
	});
});

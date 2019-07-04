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
import { validator } from '../../../src/utils/validation/validator';
import { ValidateFunction } from 'ajv';

describe('validator', () => {
	const baseSchemaId = 'test/schema';

	before(() => {
		const baseSchema = {
			$id: baseSchemaId,
			type: 'object',
		};
		return validator.addSchema(baseSchema);
	});

	describe('signature', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'signature',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid signature is provided', () => {
			return expect(
				validate({
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).to.be.true;
		});

		it('should validate to false when non-hex character is in the signature', () => {
			return expect(
				validate({
					target:
						'zzzzzzzzzzzzzzzzzzzzzzzzzzzzf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).to.be.false;
		});

		it('should validate to false when the signature is under 128 characters', () => {
			return expect(
				validate({
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b730',
				}),
			).to.be.false;
		});

		it('should validate to false when the signature is over 128 characters', () => {
			return expect(
				validate({
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304a',
				}),
			).to.be.false;
		});
	});

	describe('id', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'id',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid id is provided', () => {
			return expect(validate({ target: '3543510233978718399' })).to.be.true;
		});

		it('should validate to true when valid id with leading zeros is provided', () => {
			return expect(validate({ target: '00123' })).to.be.true;
		});

		it('should validate to false when number greater than maximum is provided', () => {
			return expect(validate({ target: '18446744073709551616' })).to.be.false;
		});

		it('should validate to false when number is provided', () => {
			return expect(validate({ target: 3543510233978718399 })).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('address', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'address',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid address is provided', () => {
			return expect(validate({ target: '14815133512790761431L' })).to.be.true;
		});

		it('should validate to false when address with leading zeros is provided', () => {
			return expect(validate({ target: '00015133512790761431L' })).to.be.false;
		});

		it('should validate to false when address including `.` is provided', () => {
			return expect(validate({ target: '14.15133512790761431L' })).to.be.false;
		});

		it('should validate to false when number greater than maximum is provided', () => {
			return expect(validate({ target: '18446744073709551616L' })).to.be.false;
		});

		it('should validate to false when the address does not end with "L"', () => {
			return expect(validate({ target: '14815133512790761431X' })).to.be.false;
		});

		it('should validate to false when the address only contains numbers', () => {
			return expect(validate({ target: '18446744073709551616' })).to.be.false;
		});

		it('should validate to false when the address is less than 2 characters', () => {
			return expect(validate({ target: 'L' })).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('non-transfer amount', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'nonTransferAmount',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid amount is provided', () => {
			return expect(validate({ target: '0' })).to.be.true;
		});

		it('should validate to false when invalid amount with leading zeros is provided', () => {
			return expect(validate({ target: '000001' })).to.be.false;
		});

		it('should validate to false when number greater than maximum is provided', () => {
			return expect(validate({ target: '9223372036854775808' })).to.be.false;
		});

		it('should validate to false when decimal number is provided', () => {
			return expect(validate({ target: '190.105310' })).to.be.false;
		});

		it('should validate to false when number is provided', () => {
			return expect(validate({ target: 190105310 })).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('transfer amount', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'transferAmount',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid amount is provided', () => {
			return expect(validate({ target: '100' })).to.be.true;
		});

		it('should validate to true when valid amount with leading zeros is provided', () => {
			return expect(validate({ target: '000000100' })).to.be.true;
		});

		it('should validate to false when amount is 0', () => {
			return expect(validate({ target: '0' })).to.be.false;
		});

		it('should validate to false when number greater than maximum is provided', () => {
			return expect(validate({ target: '9223372036854775808' })).to.be.false;
		});

		it('should validate to false when decimal number is provided', () => {
			return expect(validate({ target: '190.105310' })).to.be.false;
		});

		it('should validate to false when number is provided', () => {
			return expect(validate({ target: 190105310 })).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('fee', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'fee',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid fee is provided', () => {
			return expect(validate({ target: '100' })).to.be.true;
		});

		it('should validate to true when valid fee with leading zeros is provided', () => {
			return expect(validate({ target: '000000100' })).to.be.true;
		});

		it('should validate to true when amount is 0', () => {
			return expect(validate({ target: '0' })).to.be.true;
		});

		it('should validate to false when number greater than maximum is provided', () => {
			return expect(validate({ target: '9223372036854775808' })).to.be.false;
		});

		it('should validate to false when decimal number is provided', () => {
			return expect(validate({ target: '190.105310' })).to.be.false;
		});

		it('should validate to false when number is provided', () => {
			return expect(validate({ target: 190105310 })).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('publicKey', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'publicKey',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid publicKey is provided', () => {
			return expect(
				validate({
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.true;
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			return expect(
				validate({
					target:
						'zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is shorter', () => {
			return expect(
				validate({
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is longer', () => {
			return expect(
				validate({
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when signed publicKey is provided', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('signedPublicKey', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'signedPublicKey',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid + and publicKey is provided', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.true;
		});

		it('should validate to true when valid - and publicKey is provided', () => {
			return expect(
				validate({
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.true;
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			return expect(
				validate({
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is shorter', () => {
			return expect(
				validate({
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is longer', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when non-signed publicKey is provided', () => {
			return expect(
				validate({
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('additionPublicKey', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'additionPublicKey',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid + and publicKey is provided', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.true;
		});

		it('should validate to false when valid - and publicKey is provided', () => {
			return expect(
				validate({
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.false;
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			return expect(
				validate({
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is shorter', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).to.be.false;
		});

		it('should validate to false when publicKey is longer', () => {
			return expect(
				validate({
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when non-signed publicKey is provided', () => {
			return expect(
				validate({
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).to.be.false;
		});

		it('should validate to false when it is empty', () => {
			return expect(validate({ target: '' })).to.be.false;
		});
	});

	describe('uniqueSignedPublicKeys', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'array',
								uniqueSignedPublicKeys: true,
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when unique signedPublicKey is provided', () => {
			return expect(
				validate({
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+278a9aecf13e324c42d73cae7e21e5efc1520afb1abcda084d086d24441ed2b4',
					],
				}),
			).to.be.true;
		});

		it('should validate to false when publicKeys are duplicated without the sign', () => {
			return expect(
				validate({
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).to.be.false;
		});

		it('should validate to false when publicKeys are duplicated with the same sign', () => {
			return expect(
				validate({
					target: [
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).to.be.false;
		});
	});

	describe('noNullBytes', () => {
		let validate: ValidateFunction;
		beforeEach(() => {
			validate = validator.compile({
				$merge: {
					source: { $ref: baseSchemaId },
					with: {
						properties: {
							target: {
								type: 'string',
								format: 'noNullByte',
							},
						},
					},
				},
			});
			return Promise.resolve();
		});

		it('should validate to true when valid string is provided', () => {
			return expect(
				validate({
					target: 'some normal string',
				}),
			).to.be.true;
		});

		it('should validate to true when it is empty', () => {
			return expect(validate({ target: '' })).to.be.true;
		});

		it('should validate to false when string with null byte is provided', () => {
			const nullCharacterList = ['\0', '\x00', '\u0000', '\\U00000000'];
			nullCharacterList.forEach(nullChar => {
				expect(
					validate({
						target: `${nullChar} hey \x01 :)`,
					}),
				).to.be.false;
			});
		});
	});
});

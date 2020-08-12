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
import { validator } from '@liskhq/lisk-validator';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { Account, GenesisBlock, Transaction, transactionSchema } from '@liskhq/lisk-chain';
import { objects as ObjectUtils } from '@liskhq/lisk-utils';
import { KeysModule } from '../../../../../src/modules/keys/keys_module';
import { createFakeDefaultAccount, StateStoreMock } from '../../../../utils/node';
import * as fixtures from './fixtures.json';
import { GenesisConfig } from '../../../../../src';
import { genesisBlock as createGenesisBlock } from '../../../../fixtures/blocks';
import { AccountKeys } from '../../../../../src/modules/keys/types';
import { keysSchema } from '../../../../../src/modules/keys/schemas';

describe('keys module', () => {
	let decodedMultiSignature: any;
	let validTestTransaction: any;
	let targetMultisigAccount: any;
	let stateStore: any;
	let keysModule: KeysModule;
	let reducerHandler: any;
	let decodedBaseTransaction: any;

	const { cloneDeep } = ObjectUtils;

	const defualtTestCase = fixtures.testCases[0];

	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetType: 0,
				baseFee: '1',
				moduleType: 3,
			},
		],
		bftThreshold: 67,
		blockTime: 10,
		communityIdentifier: 'lisk',
		maxPayloadLength: 15360,
		minFeePerByte: 1,
		rewards: {
			distance: 1,
			milestones: ['milestone'],
			offset: 2,
		},
	};

	beforeEach(() => {
		keysModule = new KeysModule(genesisConfig);
		const buffer = Buffer.from(defualtTestCase.output.transaction, 'base64');
		const id = hash(buffer);
		decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			id,
		};
		validTestTransaction = new Transaction(decodedMultiSignature);

		targetMultisigAccount = createFakeDefaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
		});

		stateStore = new StateStoreMock();

		stateStore.account = {
			get: jest.fn().mockResolvedValue(targetMultisigAccount),
			getOrDefault: jest.fn().mockResolvedValue(
				createFakeDefaultAccount({
					address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
				}) as never,
			),
		};

		reducerHandler = {};
	});

	describe('validateSchema', () => {
		it('should fail validation if asset has numberOfSignatures > 64', () => {
			const asset = {
				numberOfSignatures: 100,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('should be <= 64');
		});

		it('should fail validation if asset has numberOfSignatures < 1', () => {
			const asset = {
				numberOfSignatures: 0,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('should be >= 1');
		});

		it('should fail validation if asset has more than 64 mandatory keys', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('should NOT have more than 64 items');
		});

		it('should fail validation if asset mandatory keys contains items with length bigger than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('maxLength exceeded');
		});

		it('should fail validation if asset mandatory keys contains items with length smaller than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(10)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('minLength not satisfied');
		});

		it('should fail validation if asset optional keys contains items with length bigger than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('maxLength exceeded');
		});

		it('should fail validation if asset optional keys contains items with length smaller than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(31)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('minLength not satisfied');
		});

		it('should fail validation if asset has more than 64 optional keys', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('should NOT have more than 64 items');
		});
	});

	describe('beforeTransactionApply', () => {
		it('should not fail to validate valid signatures', async () => {
			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: validTestTransaction,
					reducerHandler,
				}),
			).resolves.toBeUndefined();
		});

		it('should throw error if first signature is not from the sender public key', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			invalidTransaction.signatures[0] = Buffer.from(
				'6667778476d2d300d04cbdb8442eaa4a759999f04846d3098946f45911acbfc6592832840ef290dcc55c2b9e3e07cf5896ac5c01cd0dba740a643f0de1677f06',
				'hex',
			);

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature 'Zmd3hHbS0wDQTL24RC6qSnWZmfBIRtMJiUb0WRGsv8ZZKDKEDvKQ3MVcK54+B89YlqxcAc0NunQKZD8N4Wd/Bg==' for transaction with id '9Li6WfVUFi4WkrYYpXpxVbj/iQv9M7/8BOAFcffk/ro='",
				),
			);
		});

		it('should throw error if any of the mandatory signatures is not valid', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			// this is the first mandatory signature from the fixture; we change a byte
			invalidTransaction.signatures[1][10] = 10;

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature '3myu7/4VBi/m/gr/V1nXFTO80a9ndZ+7mM0lv9m81CfmJiWneNnJ5mVkaEfDcAK7g0KfkGczwUTKnzb7Wlw+BQ==' for transaction with id '0uM910NbJpiK3LgYj6STQAN09MxfJnKGjkXYjME3cRg='",
				),
			);
		});

		it('should throw error if any of the optional signatures is not valid', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			// this is the first optional signature from the fixture; we change a byte
			invalidTransaction.signatures[3][10] = 9;

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature 'HBBoFdFZusEi+gmRDRCRHJa5U10zkf4lc6whdaqqYnn1wjZkuc9mzIYinsREFK30q8MVpQF91HOh7/zcao1sDw==' for transaction with id 'QGBPNpD0ubTtZss+Ci5xNlDSniS3/D7P+bQxq4d4/+A='",
				),
			);
		});

		it('should throw error if signatures from sender, mandatory and optional keys are not all present', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			invalidTransaction.signatures.pop();

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error('There are missing signatures. Expected: 5 signatures but got: 4'),
			);
		});

		it('should throw error if mandatory signatures are not in order', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			[invalidTransaction.signatures[1], invalidTransaction.signatures[2]] = [
				invalidTransaction.signatures[2],
				invalidTransaction.signatures[1],
			];
			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature 'qZt+mbegQn+dohrZsVfmVISkX+x3V7n4+ZCXmyixpwE6zxeiDIfUFige2Wpd9mLmzrt/ZKY5xLJ6pXEKBIMhCw==' for transaction with id '6ftLshO2zqVil4zUIqVZfxAoeQfy19AHAk4JIzntoxk='",
				),
			);
		});

		it('should throw error if optional signatures are not in order', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			[invalidTransaction.signatures[3], invalidTransaction.signatures[4]] = [
				invalidTransaction.signatures[4],
				invalidTransaction.signatures[3],
			];
			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature '25OKrycZqAAXhE8ZaONc6ScSTc98BKCw2SaKp8mtHOUOYZBcG7ipArmC4lNDwjL65fBs2Ci30RylPxiCDq2MCA==' for transaction with id 'cbHb8mt8DpG8sf6VcMwIdaphbeSjuSf8VEBFvfN4ibw='",
				),
			);
		});
	});

	describe('afterGenesisBlockApply', () => {
		const genesisBlock = (createGenesisBlock() as unknown) as GenesisBlock<Account<AccountKeys>>;
		it('should fail if "mandatoryKeys" are not ordered lexicographically', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			mandatoryKeys.sort((a, b) => b.compare(a));
			accounts[0].keys.numberOfSignatures = 3;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;

			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				message: 'should be lexicographically ordered',
				keyword: 'mandatoryKeys',
				dataPath: '.accounts[0].keys.mandatoryKeys',
				schemaPath: '#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
				params: { mandatoryKeys },
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if "optionalKeys" are not ordered lexicographically', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const optionalKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			optionalKeys.sort((a, b) => b.compare(a));
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				message: 'should be lexicographically ordered',
				keyword: 'optionalKeys',
				dataPath: '.accounts[0].keys.optionalKeys',
				schemaPath: '#/properties/accounts/items/properties/keys/properties/optionalKeys',
				params: { optionalKeys },
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if "mandatoryKeys" are not unique', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			let mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			mandatoryKeys = [...cloneDeep(mandatoryKeys), ...cloneDeep(mandatoryKeys)];
			mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = 6;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.mandatoryKeys',
				keyword: 'uniqueItems',
				message: 'should NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if "optionalKeys" are not unique', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			let optionalKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			optionalKeys = [...cloneDeep(optionalKeys), ...cloneDeep(optionalKeys)];
			optionalKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message: 'should NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" are not unique', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const commonKey = getRandomBytes(32);
			const optionalKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32), commonKey];
			const mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32), commonKey];
			mandatoryKeys.sort((a, b) => a.compare(b));
			optionalKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = mandatoryKeys.length;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message: 'should NOT have duplicate items among mandatoryKeys and optionalKeys',
				params: {},
				schemaPath: '#/properties/accounts/items/properties/keys',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" is empty', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.mandatoryKeys = [];
			accounts[0].keys.optionalKeys = [];
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'max',
				message: 'should be maximum of length of mandatoryKeys and optionalKeys',
				params: {
					max: 0,
				},
				schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" contains more than 64 elements', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.mandatoryKeys = Array(33)
				.fill(0)
				.map(() => getRandomBytes(32));
			accounts[0].keys.mandatoryKeys.sort((a, b) => a.compare(b));

			accounts[0].keys.optionalKeys = Array(33)
				.fill(0)
				.map(() => getRandomBytes(32));
			accounts[0].keys.optionalKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = accounts[0].keys.mandatoryKeys.length;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'maxItems',
				message: 'should not have more than 64 keys',
				params: { maxItems: 64 },
				schemaPath: '#/properties/accounts/items/properties/keys',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if "numberOfSignatures" is less than length of "mandatoryKeys"', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 2;
			accounts[0].keys.mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			accounts[0].keys.mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.optionalKeys = [];
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'min',
				message: 'should be minimum of length of mandatoryKeys',
				params: {
					min: 3,
				},
				schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});

		it('should fail if "numberOfSignatures" is greater than length of "mandatoryKeys" + "optionalKeys"', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 7;
			accounts[0].keys.mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			accounts[0].keys.mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.optionalKeys = [getRandomBytes(32), getRandomBytes(32), getRandomBytes(32)];
			accounts[0].keys.optionalKeys.sort((a, b) => a.compare(b));
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const expectedError = {
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'max',
				message: 'should be maximum of length of mandatoryKeys and optionalKeys',
				params: {
					max: 6,
				},
				schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			};

			// Act & Assert
			return expect(
				keysModule.afterGenesisBlockApply({ genesisBlock: gb } as any),
			).rejects.toStrictEqual(new LiskValidationError([expectedError]));
		});
	});
});

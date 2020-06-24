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

import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import {
	createGenesisBlock,
	GenesisAccountState,
	GenesisBlock,
	validateGenesisBlock,
	DefaultAccountAsset,
} from '../src';
import { mergeDeep } from '../src/utils';
import { validGenesisBlockParams } from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import cloneDeep = require('lodash.clonedeep');

const genesisBlock = createGenesisBlock(validGenesisBlockParams);

describe('validate', () => {
	it('should fail if "version" is not zero', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { version: 1 },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: 0 },
			}),
		);
	});

	it('should fail if "reward" is not zero', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { reward: BigInt(1) },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: BigInt(0) },
			}),
		);
	});

	it('should fail if "transactionRoot" is not empty hash', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { transactionRoot: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: hash(Buffer.alloc(0)) },
			}),
		);
	});

	it('should fail if "generatorPublicKey" is not empty buffer', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { generatorPublicKey: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: Buffer.alloc(0) },
			}),
		);
	});

	it('should fail if "signature" is not empty buffer', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { signature: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: Buffer.alloc(0) },
			}),
		);
	});

	it('should fail if "payload" is less not empty array', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			payload: [Buffer.from(getRandomBytes(10))],
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: [] },
			}),
		);
	});

	it('should fail if "initRounds" is less than 3', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { asset: { initRounds: 2 } },
		}) as GenesisBlock<DefaultAccountAsset>;

		// Act
		const errors = validateGenesisBlock(gb, {
			roundLength: validGenesisBlockParams.roundLength,
		});

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				keyword: 'minimum',
				message: 'should be >= 3',
				params: { comparison: '>=', exclusive: false, limit: 3 },
				dataPath: '.initRounds',
			}),
		);
	});

	describe('asset.initDelegates', () => {
		it('should fail if "asset.initDelegates" list is not lexicographically ordered', () => {
			// Arrange
			const initDelegates = cloneDeep([
				...genesisBlock.header.asset.initDelegates,
			]);
			initDelegates.sort((a, b) => b.compare(a));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
				}),
			);
		});

		it('should fail if "asset.initDelegates" list contains address which is not in "accounts"', () => {
			// Arrange
			const invalidAddresses = [getRandomBytes(20), getRandomBytes(20)];
			const initDelegates = [
				...genesisBlock.header.asset.initDelegates,
				...invalidAddresses,
			].sort((a, b) => a.compare(b));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'delegate addresses are not present in accounts',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
					params: {
						invalidAddresses: invalidAddresses.sort((a, b) => a.compare(b)),
					},
				}),
			);
		});

		it('should fail if "asset.initDelegates" list contains address which is not a "delegate" account', () => {
			// Arrange
			const accounts = genesisBlock.header.asset.accounts.map(acc =>
				mergeDeep({}, acc),
			);
			const delegate = accounts.find(a => {
				return genesisBlock.header.asset.initDelegates[0].equals(a.address);
			}) as GenesisAccountState<DefaultAccountAsset>;
			delegate.asset.delegate.username = '';
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: accounts.sort((a, b) => a.address.compare(b.address)),
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'delegate addresses are not present in accounts',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
					params: { invalidAddresses: [delegate.address] },
				}),
			);
		});

		it('should fail if "asset.initDelegates" list items are not unique', () => {
			// Arrange
			const initDelegates = [
				...cloneDeep(genesisBlock.header.asset.initDelegates),
				cloneDeep(genesisBlock.header.asset.initDelegates[0]),
			].sort((a, b) => a.compare(b));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.initDelegates',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath: '#/properties/initDelegates/uniqueItems',
				}),
			);
		});

		it('should fail if "asset.initDelegates" list is empty', () => {
			// Arrange
			const initDelegates: Buffer[] = [];
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.initDelegates',
					keyword: 'minItems',
					message: 'should NOT have fewer than 1 items',
					params: {
						limit: 1,
					},
					schemaPath: '#/properties/initDelegates/minItems',
				}),
			);
		});

		it('should fail if "asset.initDelegates" list items contains more than  "roundLength" items', () => {
			// Arrange
			const roundLength = 2;
			const gb = mergeDeep({}, genesisBlock) as GenesisBlock<
				DefaultAccountAsset
			>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					keyword: 'maxItems',
					dataPath: '.initDelegates',
					schemaPath: '#/properties/initDelegates/maxItems',
					params: { limit: roundLength },
					message: 'should NOT have more than 4 items',
				}),
			);
		});
	});

	describe('asset.accounts', () => {
		it('should fail if "asset.accounts" list is not lexicographically ordered by "address"', () => {
			// Arrange
			const accounts = cloneDeep([...genesisBlock.header.asset.accounts]);
			accounts.sort((a, b) => b.address.compare(a.address));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts',
					schemaPath: 'properties.accounts',
					params: { orderKey: 'address' },
				}),
			);
		});

		it('should fail if "asset.accounts" list contains duplicate account by "address"', () => {
			// Arrange
			const accounts = [
				...cloneDeep(genesisBlock.header.asset.accounts),
				cloneDeep(genesisBlock.header.asset.accounts[0]),
			];
			accounts.sort((a, b) => a.address.compare(b.address));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath: '#/properties/accounts/uniqueItems',
				}),
			);
		});

		it('should fail if "asset.accounts" list contains an "address" which does not match with "publicKey"', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const account = accounts.find(a => {
				return a.asset.delegate.username === '';
			}) as GenesisAccountState<DefaultAccountAsset>;
			const newAddress = getRandomBytes(20);
			const actualAddress = account.address;
			const newAccount = mergeDeep({}, account, { address: newAddress });
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: [...accounts, newAccount].sort((a, b) =>
							a.address.compare(b.address),
						),
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'account addresses not match with publicKey',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts',
					schemaPath: 'properties.accounts',
					params: {
						publicKey: account.publicKey,
						givenAddress: newAddress,
						expectedAddress: actualAddress,
					},
				}),
			);
		});

		it('should fail if sum of balance of all "asset.accounts" is greater than 2^63-1', () => {
			// Arrange
			const [account, ...accounts] = cloneDeep(
				genesisBlock.header.asset.accounts,
			);
			const newAccount = mergeDeep({}, account, {
				balance: BigInt(2) ** BigInt(63),
			});
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: [newAccount, ...accounts].sort((a, b) =>
							a.address.compare(b.address),
						),
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'total balance exceed the limit (2^63)-1',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts[].balance',
					schemaPath: 'properties.accounts[].balance',
				}),
			);
		});
	});

	describe('asset.accounts[].keys if numberOfSignatures > 0', () => {
		it('should fail if "mandatoryKeys" are not ordered lexicographically', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			mandatoryKeys.sort((a, b) => b.compare(a));
			accounts[0].keys.numberOfSignatures = 3;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'mandatoryKeys',
					dataPath: '.accounts[0].keys.mandatoryKeys',
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
					params: { mandatoryKeys },
				}),
			);
		});

		it('should fail if "optionalKeys" are not ordered lexicographically', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const optionalKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			optionalKeys.sort((a, b) => b.compare(a));
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'optionalKeys',
					dataPath: '.accounts[0].keys.optionalKeys',
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/optionalKeys',
					params: { optionalKeys },
				}),
			);
		});

		it('should fail if "mandatoryKeys" are not unique', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			let mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			mandatoryKeys = [
				...cloneDeep(mandatoryKeys),
				...cloneDeep(mandatoryKeys),
			];
			mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = 6;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts[0].keys.mandatoryKeys',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
				}),
			);
		});

		it('should fail if "optionalKeys" are not unique', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			let optionalKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			optionalKeys = [...cloneDeep(optionalKeys), ...cloneDeep(optionalKeys)];
			optionalKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts[0].keys.optionalKeys',
					keyword: 'uniqueItems',
					message: 'should NOT have duplicate items',
					params: {},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
				}),
			);
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" are not unique', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const commonKey = getRandomBytes(32);
			const optionalKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
				commonKey,
			];
			const mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
				commonKey,
			];
			mandatoryKeys.sort((a, b) => a.compare(b));
			optionalKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.numberOfSignatures = mandatoryKeys.length;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath:
						'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
					keyword: 'uniqueItems',
					message:
						'should NOT have duplicate items among mandatoryKeys and optionalKeys',
					params: {},
					schemaPath: '#/properties/accounts/items/properties/keys',
				}),
			);
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" is empty', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 1;
			accounts[0].keys.mandatoryKeys = [];
			accounts[0].keys.optionalKeys = [];
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts[0].keys.numberOfSignatures',
					keyword: 'max',
					message:
						'should be maximum of length of mandatoryKeys and optionalKeys',
					params: {
						max: 0,
					},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				}),
			);
		});

		it('should fail if set of "mandatoryKeys" and "optionalKeys" contains more than 64 elements', () => {
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
			accounts[0].keys.numberOfSignatures =
				accounts[0].keys.mandatoryKeys.length;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath:
						'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
					keyword: 'maxItems',
					message: 'should not have more than 64 keys',
					params: { maxItems: 64 },
					schemaPath: '#/properties/accounts/items/properties/keys',
				}),
			);
		});

		it('should fail if "numberOfSignatures" is less than length of "mandatoryKeys"', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 2;
			accounts[0].keys.mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			accounts[0].keys.mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.optionalKeys = [];
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts[0].keys.numberOfSignatures',
					keyword: 'min',
					message: 'should be minimum of length of mandatoryKeys',
					params: {
						min: 3,
					},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				}),
			);
		});

		it('should fail if "numberOfSignatures" is greater than length of "mandatoryKeys" + "optionalKeys"', () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			accounts[0].keys.numberOfSignatures = 7;
			accounts[0].keys.mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			accounts[0].keys.mandatoryKeys.sort((a, b) => a.compare(b));
			accounts[0].keys.optionalKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			];
			accounts[0].keys.optionalKeys.sort((a, b) => a.compare(b));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as GenesisBlock<DefaultAccountAsset>;

			// Act
			const errors = validateGenesisBlock(gb, {
				roundLength: validGenesisBlockParams.roundLength,
			});

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					dataPath: '.accounts[0].keys.numberOfSignatures',
					keyword: 'max',
					message:
						'should be maximum of length of mandatoryKeys and optionalKeys',
					params: {
						max: 6,
					},
					schemaPath:
						'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
				}),
			);
		});
	});
});

/*
 * Copyright © 2021 Lisk Foundation
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
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { codec } from '@liskhq/lisk-codec';
import {
	getRandomBytes,
	getPrivateAndPublicKeyFromPassphrase,
	hash,
	getAddressFromPublicKey,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import {
	Transaction,
	transactionSchema,
	TAG_TRANSACTION,
	StateStore,
	BlockAssets,
} from '@liskhq/lisk-chain';
import { objects as ObjectUtils } from '@liskhq/lisk-utils';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { AuthModule } from '../../../../src/modules/auth';
import * as fixtures from './fixtures.json';
import * as testing from '../../../../src/testing';
import { authAccountSchema, genesisAuthStoreSchema } from '../../../../src/modules/auth/schemas';
import { AuthAccount } from '../../../../src/modules/auth/types';
import { VerifyStatus } from '../../../../src/node/state_machine';
import { InvalidNonceError } from '../../../../src/modules/auth/errors';
import { STORE_PREFIX_AUTH } from '../../../../src/modules/auth/constants';
import { createGenesisBlockContext } from '../../../../src/testing';

describe('AuthModule', () => {
	let decodedMultiSignature: any;
	let validTestTransaction: any;
	let stateStore: any;
	let authModule: AuthModule;
	let decodedBaseTransaction: any;
	let passphrase: any;
	let passphraseDerivedKeys: any;
	let senderAccount: any;

	const { cloneDeep } = ObjectUtils;
	const subStoreMock = jest.fn();
	const storeMock = jest.fn().mockReturnValue({ getWithSchema: subStoreMock });

	const defaultTestCase = fixtures.testCases[0];
	const networkIdentifier = Buffer.from(defaultTestCase.input.networkIdentifier, 'hex');

	beforeEach(() => {
		authModule = new AuthModule();
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'hex');
		const id = hash(buffer);
		decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			id,
		};

		validTestTransaction = new Transaction(decodedMultiSignature);

		stateStore = {
			getStore: storeMock,
		};

		senderAccount = {
			address: Buffer.from(defaultTestCase.input.account.address, 'hex'),
		};

		when(subStoreMock)
			.calledWith(senderAccount.address, authAccountSchema)
			.mockReturnValue({
				mandatoryKeys: [],
				optionalKeys: [],
				nonce: BigInt(1),
				numberOfSignatures: 0,
			});

		passphrase = Mnemonic.generateMnemonic();
		passphraseDerivedKeys = getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = getAddressFromPublicKey(passphraseDerivedKeys.publicKey);

		when(subStoreMock)
			.calledWith(address, authAccountSchema)
			.mockReturnValue({
				mandatoryKeys: [],
				optionalKeys: [],
				nonce: BigInt(0),
				numberOfSignatures: 0,
			});
	});

	describe('initGenesisState', () => {
		const address = getRandomBytes(20);
		const publicKey = getRandomBytes(32);
		const validAsset = {
			authDataSubstore: [
				{
					storeKey: address,
					storeValue: {
						numberOfSignatures: 0,
						mandatoryKeys: [],
						optionalKeys: [],
						nonce: BigInt(23),
					},
				},
				{
					storeKey: getRandomBytes(20),
					storeValue: {
						numberOfSignatures: 3,
						mandatoryKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) => a.compare(b)),
						optionalKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) => a.compare(b)),
						nonce: BigInt(1),
					},
				},
			],
		};
		const invalidTestData = [
			[
				'when store key is not 20 bytes',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(8),
							storeValue: {
								numberOfSignatures: 0,
								mandatoryKeys: [],
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'mandatory key is not lexicographically sorted',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 3,
								mandatoryKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'mandatory key is not unique',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 2,
								mandatoryKeys: [publicKey, publicKey],
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'optional key is not lexicographically sorted',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 3,
								mandatoryKeys: [],
								optionalKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) => b.compare(a)),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'optional key is not unique',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 2,
								mandatoryKeys: [],
								optionalKeys: [publicKey, publicKey],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'exceed total keys',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 36,
								mandatoryKeys: Array.from({ length: 33 }, () => getRandomBytes(32)).sort((a, b) =>
									b.compare(a),
								),
								optionalKeys: Array.from({ length: 33 }, () => getRandomBytes(32)).sort((a, b) =>
									b.compare(a),
								),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'number of signatures exceed total keys',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 3,
								mandatoryKeys: [],
								optionalKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) => b.compare(a)),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'number of signatures less than mandatory keys',
				{
					authDataSubstore: [
						{
							storeKey: getRandomBytes(20),
							storeValue: {
								numberOfSignatures: 1,
								mandatoryKeys: [getRandomBytes(32), getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
		];

		beforeEach(() => {
			stateStore = new StateStore(new InMemoryKVStore());
		});

		it('should not throw error if asset does not exist', async () => {
			const context = createGenesisBlockContext({ stateStore }).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(authModule.initGenesisState(context)).toResolve();
			expect(context.getStore).not.toHaveBeenCalled();
		});

		it('should resolve when asset is valid', async () => {
			const assetBytes = codec.encode(genesisAuthStoreSchema, validAsset);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([{ moduleID: authModule.id, data: assetBytes }]),
			}).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(authModule.initGenesisState(context)).toResolve();
			const authStore = stateStore.getStore(authModule.id, STORE_PREFIX_AUTH);
			for (const data of validAsset.authDataSubstore) {
				await expect(authStore.has(data.storeKey)).resolves.toBeTrue();
			}
		});

		describe.each(invalidTestData)('%p', (_, data) => {
			it('should throw error when asset is invalid', async () => {
				// eslint-disable-next-line @typescript-eslint/ban-types
				const assetBytes = codec.encode(genesisAuthStoreSchema, data as object);
				const context = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ moduleID: authModule.id, data: assetBytes }]),
				}).createInitGenesisStateContext();

				await expect(authModule.initGenesisState(context)).toReject();
			});
		});
	});

	describe('verifyTransaction', () => {
		describe('Invalid nonce errors', () => {
			it('should return FAIL status with error when trx nonce is lower than account nonce', async () => {
				// Arrange
				const accountNonce = BigInt(2);

				when(subStoreMock).calledWith(senderAccount.address, authAccountSchema).mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: accountNonce,
					numberOfSignatures: 0,
				});

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction: validTestTransaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new InvalidNonceError(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Transaction with id:${validTestTransaction.id.toString(
							'hex',
						)} nonce is lower than account nonce`,
						validTestTransaction.nonce,
						accountNonce,
					),
				);
			});

			it('should return PENDING status with no error when trx nonce is higher than account nonce', async () => {
				// Arrange
				const transaction = new Transaction({
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('2'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					params: getRandomBytes(100),
					signatures: [],
				});

				validTestTransaction = new Transaction(decodedMultiSignature);

				const signature = signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getBytes(),
					passphrase,
				);

				(transaction.signatures as any).push(signature);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.PENDING,
				});
			});
		});

		describe('Multi-signature registration transaction', () => {
			it('should not throw for valid transaction', async () => {
				// Arrange
				const context = testing
					.createTransactionContext({
						stateStore,
						transaction: validTestTransaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});
		});

		describe('Transaction from single signatures account', () => {
			it('should not throw for valid transaction', async () => {
				// Arrange
				const transaction = new Transaction({
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					params: getRandomBytes(100),
					signatures: [],
				});

				const signature = signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getBytes(),
					passphrase,
				);

				(transaction.signatures as any).push(signature);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should throw if signature is missing', async () => {
				// Arrange
				const transaction = new Transaction({
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					params: getRandomBytes(100),
					signatures: [],
				});

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						'Transactions from a single signature account should have exactly one signature. Found 0 signatures.',
					),
				);
			});

			it('should throw error if account is not multi signature and more than one signature present', async () => {
				// Arrange
				const transaction = new Transaction({
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					params: getRandomBytes(100),
					signatures: [],
				});

				const signature = signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getBytes(),
					passphrase,
				);

				(transaction.signatures as any).push(signature);
				(transaction.signatures as any).push(signature);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						'Transactions from a single signature account should have exactly one signature. Found 2 signatures.',
					),
				);
			});
		});

		describe('Transaction from multi-signatures account', () => {
			interface memberFixture {
				passphrase: string;
				keys?: {
					privateKey: Buffer;
					publicKey: Buffer;
				};
				address?: Buffer;
			}

			interface membersFixture {
				[key: string]: memberFixture;
			}

			const members: membersFixture = {
				mainAccount: {
					passphrase: 'order trip this crop race amused climb rather taxi morning holiday team',
				},
				mandatoryA: {
					passphrase:
						'clock cradle permit opinion hobby excite athlete weird soap mesh valley belt',
				},
				mandatoryB: {
					passphrase:
						'team dignity frost rookie gesture gaze piano daring fruit patrol chalk hidden',
				},
				optionalA: {
					passphrase:
						'welcome hello ostrich country drive car river jaguar warfare color tell risk',
				},
				optionalB: {
					passphrase: 'beef volcano emotion say lab reject small repeat reveal napkin bunker make',
				},
			};

			for (const aMember of Object.values(members)) {
				aMember.keys = { ...getPrivateAndPublicKeyFromPassphrase(aMember.passphrase) };
				aMember.address = getAddressFromPublicKey(aMember.keys.publicKey);
			}

			const multisigAccount = {
				address: members.mainAccount.address,
				numberOfSignatures: 3,
				mandatoryKeys: [members.mandatoryA.keys?.publicKey, members.mandatoryB.keys?.publicKey],
				optionalKeys: [members.optionalA.keys?.publicKey, members.optionalB.keys?.publicKey],
			};

			let transaction: Transaction;

			beforeEach(() => {
				when(subStoreMock)
					.calledWith(multisigAccount.address, authAccountSchema)
					.mockResolvedValue({
						numberOfSignatures: 3,
						mandatoryKeys: [members.mandatoryA.keys?.publicKey, members.mandatoryB.keys?.publicKey],
						optionalKeys: [members.optionalA.keys?.publicKey, members.optionalB.keys?.publicKey],
						nonce: BigInt(0),
					});

				transaction = new Transaction({
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: (members as any).mainAccount.keys.publicKey,
					params: getRandomBytes(100),
					signatures: [],
				});
			});

			it('should not throw for valid transaction', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should not throw for multisignature account with only optional', async () => {
				// Arrange
				const optionalOnlyMultisigAccount = cloneDeep(multisigAccount);
				optionalOnlyMultisigAccount.mandatoryKeys = [];
				optionalOnlyMultisigAccount.numberOfSignatures = 1;

				when(subStoreMock)
					.calledWith(optionalOnlyMultisigAccount.address, authAccountSchema)
					.mockResolvedValue({
						numberOfSignatures: 1,
						mandatoryKeys: [],
						optionalKeys: [members.optionalA.keys?.publicKey, members.optionalB.keys?.publicKey],
						nonce: BigInt(0),
					});

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should not throw for valid transaction when first optional is present', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));
				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should not throw for valid transaction when second optional is present', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalB.passphrase,
					),
				);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should throw for transaction where non optional absent signature is not empty buffer', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalB.passphrase,
					),
				);
				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw error if number of provided signatures is bigger than numberOfSignatures in account asset', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalB.passphrase,
					),
				);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw error if number of provided signatures is smaller than numberOfSignatures in account asset', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw for transaction with valid numberOfSignatures but missing mandatory key signature', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalB.passphrase,
					),
				);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error('Invalid signature. Empty buffer is not a valid signature.'),
				);
			});

			it('should throw error if any of the mandatory signatures is not valid', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should throw error if any of the optional signatures is not valid', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalB.passphrase,
					),
				);

				// We change the first byte of the 2nd optional signature
				(transaction.signatures as any)[3][0] = 10;

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[3].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if mandatory signatures are not in order', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[0].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if optional signatures are not in order', async () => {
				// Arrange
				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryA.passphrase,
					),
				);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).mandatoryB.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						networkIdentifier,
					})
					.createTransactionVerifyContext();

				// Act & Assert
				return expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[3].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});
		});
	});

	describe('afterCommandExecute', () => {
		it('should correctly increment the nonce', async () => {
			const stateStore1 = new StateStore(new InMemoryKVStore());
			const authStore1 = stateStore1.getStore(authModule.id, STORE_PREFIX_AUTH);
			const address = getAddressFromPublicKey(validTestTransaction.senderPublicKey);
			const authAccount1 = {
				nonce: validTestTransaction.nonce,
				numberOfSignatures: 5,
				mandatoryKeys: [getRandomBytes(64), getRandomBytes(64)],
				optionalKeys: [getRandomBytes(64), getRandomBytes(64)],
			};
			await authStore1.setWithSchema(address, authAccount1, authAccountSchema);

			const context = testing
				.createTransactionContext({
					stateStore: stateStore1,
					transaction: validTestTransaction,
					networkIdentifier,
				})
				.createTransactionExecuteContext();

			await authModule.afterCommandExecute(context);
			const authStore = context.getStore(authModule.id, STORE_PREFIX_AUTH);
			const authAccount = await authStore.getWithSchema<AuthAccount>(
				context.transaction.senderAddress,
				authAccountSchema,
			);
			expect(authAccount.nonce - validTestTransaction.nonce).toBe(BigInt(1));
		});
	});
});

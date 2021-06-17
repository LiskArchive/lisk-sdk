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
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import {
	getRandomBytes,
	getPrivateAndPublicKeyFromPassphrase,
	hash,
	getAddressFromPublicKey,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import {
	Account,
	GenesisBlock,
	Transaction,
	transactionSchema,
	TAG_TRANSACTION,
} from '@liskhq/lisk-chain';
import { objects as ObjectUtils } from '@liskhq/lisk-utils';
import { KeysModule } from '../../../../src/modules/keys/keys_module';
import * as fixtures from './fixtures.json';
import { GenesisConfig, TokenModule, DPoSModule } from '../../../../src';
import { AccountKeys } from '../../../../src/modules/keys/types';
import * as testing from '../../../../src/testing';
import { TokenAccount } from '../../../../src/modules/token/types';
import { createGenesisBlock } from '../../../../src/testing';

describe('keys module', () => {
	let decodedMultiSignature: any;
	let validTestTransaction: any;
	let targetMultisigAccount: any;
	let stateStore: any;
	let keysModule: KeysModule;
	let reducerHandler: any;
	let decodedBaseTransaction: any;
	let singleSignatureAccount: any;
	let passphrase: any;
	let passphraseDerivedKeys: any;

	const { cloneDeep } = ObjectUtils;
	const { StateStoreMock } = testing.mocks;

	const defaultTestCase = fixtures.testCases[0];
	const networkIdentifier = Buffer.from(defaultTestCase.input.networkIdentifier, 'hex');

	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetID: 0,
				baseFee: '1',
				moduleID: 3,
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
		keysModule = testing.getModuleInstance(KeysModule, { genesisConfig });
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'hex');
		const id = hash(buffer);
		decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			id,
		};
		validTestTransaction = new Transaction(decodedMultiSignature);

		targetMultisigAccount = testing.fixtures.createDefaultAccount([TokenModule, KeysModule], {
			address: Buffer.from(defaultTestCase.input.account.address, 'hex'),
			token: { balance: BigInt('94378900000') },
		});
		const senderAccount = testing.fixtures.createDefaultAccount([TokenModule, KeysModule], {
			address: Buffer.from(defaultTestCase.input.account.address, 'hex'),
		});

		passphrase = Mnemonic.generateMnemonic();
		passphraseDerivedKeys = getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = getAddressFromPublicKey(passphraseDerivedKeys.publicKey);

		singleSignatureAccount = testing.fixtures.createDefaultAccount([TokenModule, KeysModule], {
			address,
		});

		stateStore = new StateStoreMock({
			accounts: [targetMultisigAccount, senderAccount, singleSignatureAccount],
			networkIdentifier,
		});

		jest.spyOn(stateStore.account, 'get');
		jest.spyOn(stateStore.account, 'set');
	});

	describe('beforeTransactionApply', () => {
		describe('Multi-signature registration transaction', () => {
			it('should not throw for valid transaction', async () => {
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: validTestTransaction,
				});

				return expect(keysModule.beforeTransactionApply(context)).resolves.toBeUndefined();
			});

			it('should throw if number of provided signatures is smaller than number of optional, mandatory and sender keys', async () => {
				const invalidTransaction = {
					...validTestTransaction,
					signatures: [...validTestTransaction.signatures],
				};

				// remove one signature making the registration asset invalid
				invalidTransaction.signatures.pop();

				const invalidTransactionInstance = new Transaction(invalidTransaction);

				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error('There are missing signatures. Expected: 5 signatures but got: 4.'),
				);
			});

			it('should throw if number of provided signatures is bigger than number of optional, mandatory and sender keys', async () => {
				const invalidTransaction = {
					...validTestTransaction,
					signatures: [...validTestTransaction.signatures],
				};

				// add one signature making the registration asset invalid
				invalidTransaction.signatures.push(getRandomBytes(32));

				const invalidTransactionInstance = new Transaction(invalidTransaction);
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error('There are missing signatures. Expected: 5 signatures but got: 6.'),
				);
			});

			it('should throw if any of the signatures is empty', async () => {
				const invalidTransaction = {
					...validTestTransaction,
					signatures: [...validTestTransaction.signatures],
				};

				// this is the first mandatory signature we set it to an empty buffer
				invalidTransaction.signatures[1] = Buffer.from('');

				const invalidTransactionInstance = new Transaction(invalidTransaction);
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error('A valid signature is required for each registered key.'),
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
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error(
						`Failed to validate signature '${invalidTransaction.signatures[1].toString(
							'hex',
						)}' for transaction with id '${invalidTransactionInstance.id.toString('hex')}'`,
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
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error(
						`Failed to validate signature '${invalidTransactionInstance.signatures[3].toString(
							'hex',
						)}' for transaction with id '${invalidTransactionInstance.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if mandatory signatures are not in order', async () => {
				const invalidTransaction = {
					...validTestTransaction,
					signatures: [...validTestTransaction.signatures],
				};

				// Swap mandatory keys
				[invalidTransaction.signatures[1], invalidTransaction.signatures[2]] = [
					invalidTransaction.signatures[2],
					invalidTransaction.signatures[1],
				];

				const invalidTransactionInstance = new Transaction(invalidTransaction);
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error(
						`Failed to validate signature '${invalidTransaction.signatures[1].toString(
							'hex',
						)}' for transaction with id '${invalidTransactionInstance.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if optional signatures are not in order', async () => {
				const invalidTransaction = {
					...validTestTransaction,
					signatures: [...validTestTransaction.signatures],
				};

				// Swap optional keys
				[invalidTransaction.signatures[3], invalidTransaction.signatures[4]] = [
					invalidTransaction.signatures[4],
					invalidTransaction.signatures[3],
				];

				const invalidTransactionInstance = new Transaction(invalidTransaction);
				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction: invalidTransactionInstance,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error(
						`Failed to validate signature '${invalidTransaction.signatures[3].toString(
							'hex',
						)}' for transaction with id '${invalidTransactionInstance.id.toString('hex')}'`,
					),
				);
			});
		});

		describe('Transaction from single signatures account', () => {
			it('should not throw for valid transaction', async () => {
				const transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					asset: getRandomBytes(100),
					signatures: [],
				});

				const signature = signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getBytes(),
					passphrase,
				);

				(transaction.signatures as any).push(signature);
				stateStore.account.set(singleSignatureAccount.address, singleSignatureAccount);

				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction,
				});

				return expect(keysModule.beforeTransactionApply(context)).resolves.toBeUndefined();
			});

			it('should throw if signature is missing', async () => {
				const transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					asset: getRandomBytes(100),
					signatures: [],
				});
				stateStore.account.set(singleSignatureAccount.address, singleSignatureAccount);

				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
					new Error(
						'Transactions from a single signature account should have exactly one signature. Found 0 signatures.',
					),
				);
			});

			it('should throw error if account is not multi signature and more than one signature present', async () => {
				const transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: passphraseDerivedKeys.publicKey,
					asset: getRandomBytes(100),
					signatures: [],
				});

				const signature = signDataWithPassphrase(
					TAG_TRANSACTION,
					getRandomBytes(20),
					transaction.getBytes(),
					passphrase,
				);

				(transaction.signatures as any).push(signature);
				(transaction.signatures as any).push(signature);

				stateStore.account.set(singleSignatureAccount.address, singleSignatureAccount);

				const context = testing.createTransactionApplyContext({
					stateStore,
					transaction,
				});

				return expect(keysModule.beforeTransactionApply(context)).rejects.toStrictEqual(
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

			const multisigAccount = testing.fixtures.createDefaultAccount<AccountKeys & TokenAccount>(
				[TokenModule, KeysModule],
				{
					address: members.mainAccount.address,
					token: {
						balance: BigInt(100000000000000),
					},
					keys: {
						numberOfSignatures: 3,
						mandatoryKeys: [members.mandatoryA.keys?.publicKey, members.mandatoryB.keys?.publicKey],
						optionalKeys: [members.optionalA.keys?.publicKey, members.optionalB.keys?.publicKey],
					},
				},
			);

			let transaction: Transaction;

			beforeEach(() => {
				stateStore.account.set(multisigAccount.address, multisigAccount);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: (members as any).mainAccount.keys.publicKey,
					asset: getRandomBytes(100),
					signatures: [],
				});
			});

			it('should not throw for valid transaction', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).resolves.toBeUndefined();
			});

			it('should not throw for multisignature account with only optional', async () => {
				const optionalOnlyMultisigAccount = cloneDeep(multisigAccount);
				optionalOnlyMultisigAccount.keys.mandatoryKeys = [];
				optionalOnlyMultisigAccount.keys.numberOfSignatures = 1;

				stateStore.account.get = jest.fn().mockResolvedValue(optionalOnlyMultisigAccount);

				(transaction.signatures as any).push(
					signDataWithPassphrase(
						TAG_TRANSACTION,
						networkIdentifier,
						transaction.getSigningBytes(),
						(members as any).optionalA.passphrase,
					),
				);

				(transaction.signatures as any).push(Buffer.from(''));

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).resolves.toBeUndefined();
			});

			it('should not throw for valid transaction when first optional is present', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).resolves.toBeUndefined();
			});

			it('should not throw for valid transaction when second optional is present', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).resolves.toBeUndefined();
			});

			it('should throw for transaction where non optional absent signature is not empty buffer', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw error if number of provided signatures is bigger than numberOfSignatures in account asset', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw error if number of provided signatures is smaller than numberOfSignatures in account asset', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
							'hex',
						)}'`,
					),
				);
			});

			it('should throw for transaction with valid numberOfSignatures but missing mandatory key signature', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(new Error('Invalid signature. Empty buffer is not a valid signature.'));
			});

			it('should throw error if any of the mandatory signatures is not valid', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).resolves.toBeUndefined();
			});

			it('should throw error if any of the optional signatures is not valid', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[3].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if mandatory signatures are not in order', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[0].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});

			it('should throw error if optional signatures are not in order', async () => {
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

				return expect(
					keysModule.beforeTransactionApply({
						stateStore,
						transaction,
						reducerHandler,
					}),
				).rejects.toThrow(
					new Error(
						`Failed to validate signature '${transaction.signatures[3].toString(
							'hex',
						)}' for transaction with id '${transaction.id.toString('hex')}'`,
					),
				);
			});
		});
	});

	describe('afterGenesisBlockApply', () => {
		const { genesisBlock } = createGenesisBlock<AccountKeys>({
			modules: [KeysModule, DPoSModule],
		});

		it('should not fail for valid keys property', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			].sort((a, b) => a.compare(b));
			const optionalKeys = [getRandomBytes(32)];

			accounts[0].keys.numberOfSignatures = 4;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).resolves.toBeUndefined();
		});

		it('should not fail for sender not present in groups', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const mandatoryKeys = [
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			].sort((a, b) => a.compare(b));
			const optionalKeys = [getRandomBytes(32)];

			accounts[0].keys.numberOfSignatures = 4;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			accounts[0].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).resolves.toBeUndefined();
		});

		it('should not fail for sender present in groups', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const mandatoryKeys = [
				Buffer.from('9cabee3d27426676b852ce6b804cb2fdff7cd0b5', 'hex'),
				getRandomBytes(32),
				getRandomBytes(32),
				getRandomBytes(32),
			].sort((a, b) => a.compare(b));
			const optionalKeys = [getRandomBytes(32)];

			accounts[61].keys.numberOfSignatures = 4;
			accounts[61].keys.mandatoryKeys = mandatoryKeys;
			accounts[61].keys.optionalKeys = optionalKeys;
			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).resolves.toBeUndefined();
		});

		it('should not fail for a maximum of 64 keys distributed among "mandatoryKeys" and "optionalKeys"', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);

			const mandatoryKeys = [...Array(32).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));
			const optionalKeys = [...Array(32).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));

			accounts[0].keys.numberOfSignatures = 38;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
			accounts[0].keys.optionalKeys = optionalKeys;

			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).resolves.toBeUndefined();
		});

		it('should not fail for a maximum of 64 optional keys and number of signatures smaller than 64', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);

			const optionalKeys = [...Array(64).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));

			accounts[0].keys.numberOfSignatures = 60;
			accounts[0].keys.mandatoryKeys = [];
			accounts[0].keys.optionalKeys = optionalKeys;

			const gb = (ObjectUtils.mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts,
					},
				},
			}) as unknown) as GenesisBlock<Account<AccountKeys>>;

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).resolves.toBeUndefined();
		});

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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			const expectedError = {
				dataPath: '.accounts[0].keys.mandatoryKeys',
				keyword: 'uniqueItems',
				message: 'must NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
			};

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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
				message: 'must NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
			};

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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
				message: 'must NOT have duplicate items among mandatoryKeys and optionalKeys',
				params: {},
				schemaPath: '#/properties/accounts/items/properties/keys',
			};

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

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
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
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

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
		});

		it('should fail if a key is repeated among "mandatoryKeys" and "optionalKeys"', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);
			const repeatedKey = getRandomBytes(32);
			const mandatoryKeys = [getRandomBytes(32), getRandomBytes(32), repeatedKey].sort((a, b) =>
				a.compare(b),
			);
			const optionalKeys = [repeatedKey];

			accounts[0].keys.numberOfSignatures = 3;
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
				dataPath: '.accounts[0].keys.mandatoryKeys, .accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message: 'must NOT have duplicate items among mandatoryKeys and optionalKeys',
				schemaPath: '#/properties/accounts/items/properties/keys',
				params: {},
			};

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
		});

		it('should fail for a maximum of 64 keys distributed among "mandatoryKeys" and "optionalKeys" and number of signatures bigger than 64', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);

			const mandatoryKeys = [...Array(32).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));
			const optionalKeys = [...Array(32).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));

			accounts[0].keys.numberOfSignatures = 65;
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
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'max',
				message: 'should be maximum of length of mandatoryKeys and optionalKeys',
				params: {},
			};

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
		});

		it('should fail for a maximum of 64 keys and number of signatures smaller than 64', async () => {
			// Arrange
			const accounts = cloneDeep(genesisBlock.header.asset.accounts);

			const mandatoryKeys = [...Array(64).keys()]
				.map(() => getRandomBytes(32))
				.sort((a, b) => a.compare(b));

			accounts[0].keys.numberOfSignatures = 60;
			accounts[0].keys.mandatoryKeys = mandatoryKeys;
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
				message: 'should be minimum of length of mandatoryKeys',
				params: {},
				schemaPath: '#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			};

			const context = testing.createAfterGenesisBlockApplyContext({
				genesisBlock: gb,
			});

			// Act & Assert
			return expect(keysModule.afterGenesisBlockApply(context)).rejects.toStrictEqual(
				new LiskValidationError([expectedError]),
			);
		});
	});
});

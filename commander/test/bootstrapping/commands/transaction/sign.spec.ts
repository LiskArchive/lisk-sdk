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
 *
 */

import * as fs from 'fs-extra';
import { ed } from '@liskhq/lisk-cryptography';
import { Application, IPCChannel, transactionSchema } from 'lisk-framework';
import * as apiClient from '@liskhq/lisk-api-client';
import { codec } from '@liskhq/lisk-codec';
import { TransactionAttrs } from '@liskhq/lisk-chain';

import {
	tokenTransferParamsSchema,
	chainIDStr,
	multisigRegMsgSchema,
	registerMultisignatureParamsSchema,
} from '../../../helpers/transactions';
import * as appUtils from '../../../../src/utils/application';
import * as readerUtils from '../../../../src/utils/reader';
import { SignCommand } from '../../../../src/bootstrapping/commands/transaction/sign';
import { getConfig } from '../../../helpers/config';
import { accountsForMultisignature } from '../../../helpers/account';
import {
	createIPCClientMock,
	mockCommands,
	mockEncodedTransaction,
	mockJSONTransaction,
} from '../../../helpers/mocks';
import { Awaited } from '../../../types';

describe('transaction:sign command', () => {
	const senderPassphrase = accountsForMultisignature.targetAccount.passphrase;

	const mandatoryPassphrases = [
		accountsForMultisignature.mandatoryOne.passphrase,
		accountsForMultisignature.mandatoryTwo.passphrase,
	];

	const optionalPassphrases = [
		accountsForMultisignature.optionalOne.passphrase,
		accountsForMultisignature.optionalTwo.passphrase,
	];

	const mandatoryKeys = [
		accountsForMultisignature.mandatoryOne.publicKey.toString('hex'),
		accountsForMultisignature.mandatoryTwo.publicKey.toString('hex'),
	];

	const optionalKeys = [
		accountsForMultisignature.optionalOne.publicKey.toString('hex'),
		accountsForMultisignature.optionalTwo.publicKey.toString('hex'),
	];

	const signMultiSigCmdArgs = (unsignedTransaction: string, passphraseToSign: string): string[] => {
		return [
			unsignedTransaction,
			`--passphrase=${passphraseToSign}`,
			`--mandatory-keys=${mandatoryKeys[0]}`,
			`--mandatory-keys=${mandatoryKeys[1]}`,
			`--optional-keys=${optionalKeys[0]}`,
			`--optional-keys=${optionalKeys[1]}`,
			`--chain-id=${chainIDStr}`,
			'--offline',
		];
	};

	const signMultiSigCmdArgsJSON = (unsignedTransaction: string, passphrase: string): string[] => [
		...signMultiSigCmdArgs(unsignedTransaction, passphrase),
		'--json',
	];

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	// In order to test the command we need to extended the base crete command and provide application implementation
	class SignCommandExtended extends SignCommand {
		getApplication = () => {
			const { app } = Application.defaultApplication({ genesis: { chainID: '00000000' } });
			return app;
		};
	}

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(SignCommandExtended.prototype, 'printJSON').mockReturnValue();
		jest.spyOn(IPCChannel.prototype, 'startAndListen').mockResolvedValue();
		jest.spyOn(IPCChannel.prototype, 'invoke');
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockResolvedValue(senderPassphrase);
		jest
			.spyOn(apiClient, 'createIPCClient')
			.mockResolvedValue(
				createIPCClientMock(mockJSONTransaction, mockEncodedTransaction, mockCommands) as never,
			);
	});

	describe('Missing arguments', () => {
		it('should throw an error when missing transaction argument.', async () => {
			await expect(SignCommandExtended.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('offline', () => {
		const tx = {
			...mockJSONTransaction,
			params: codec
				.encodeJSON(tokenTransferParamsSchema, (mockJSONTransaction as any).params)
				.toString('hex'),
			signatures: [],
		};
		const unsignedTransaction = codec.encodeJSON(transactionSchema, tx).toString('hex');

		describe('data path flag', () => {
			it('should throw an error when data path flag specified.', async () => {
				await expect(
					SignCommandExtended.run(
						[
							unsignedTransaction,
							`--passphrase=${senderPassphrase}`,
							`--chain-id=${chainIDStr}`,
							'--offline',
							'--data-path=/tmp',
						],
						config,
					),
				).rejects.toThrow('--data-path=/tmp cannot also be provided when using --offline');
			});
		});

		describe('missing network identifier flag', () => {
			it('should throw an error when missing network identifier flag.', async () => {
				await expect(
					SignCommandExtended.run(
						[unsignedTransaction, `--passphrase=${senderPassphrase}`, '--offline'],
						config,
					),
				).rejects.toThrow('All of the following must be provided when using --offline: --chain-id');
			});
		});

		describe('sign transaction from single account', () => {
			it('should return signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					[
						unsignedTransaction,
						`--passphrase=${senderPassphrase}`,
						`--chain-id=${chainIDStr}`,
						'--offline',
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: expect.any(String),
				});
			});

			it('should return signed transaction in json format', async () => {
				await SignCommandExtended.run(
					[
						unsignedTransaction,
						`--passphrase=${senderPassphrase}`,
						`--chain-id=${chainIDStr}`,
						'--json',
						'--offline',
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: expect.any(String),
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: expect.any(String),
						params: {
							tokenID: '0000000000000000',
							amount: '100',
							data: 'send token',
							recipientAddress: 'lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9',
						},
						command: 'transfer',
						fee: '100000000',
						module: 'token',
						nonce: '0',
						senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						signatures: [expect.any(String)],
					},
				});
			});
		});

		describe('sign multi signature registration transaction', () => {
			const messageForRegistration = {
				address: accountsForMultisignature.targetAccount.address,
				nonce: BigInt(2),
				numberOfSignatures: 4,
				mandatoryKeys: [
					accountsForMultisignature.mandatoryOne.publicKey,
					accountsForMultisignature.mandatoryTwo.publicKey,
				].sort((k1, k2) => k1.compare(k2)),
				optionalKeys: [
					accountsForMultisignature.optionalOne.publicKey,
					accountsForMultisignature.optionalTwo.publicKey,
				].sort((k1, k2) => k1.compare(k2)),
			};

			const messageBytes = codec.encode(multisigRegMsgSchema, messageForRegistration);

			const MESSAGE_TAG_MULTISIG_REG = 'LSK_RMSG_';
			const networkIdentifier = Buffer.from(chainIDStr, 'hex');

			const decodedParams = {
				numberOfSignatures: messageForRegistration.numberOfSignatures,
				mandatoryKeys: messageForRegistration.mandatoryKeys,
				optionalKeys: messageForRegistration.optionalKeys,
				signatures: [] as Buffer[],
			};

			const sign1 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				networkIdentifier,
				messageBytes,
				accountsForMultisignature.mandatoryTwo.privateKey,
			);
			decodedParams.signatures.push(sign1);

			const sign2 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				networkIdentifier,
				messageBytes,
				accountsForMultisignature.mandatoryOne.privateKey,
			);
			decodedParams.signatures.push(sign2);

			const sign3 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				networkIdentifier,
				messageBytes,
				accountsForMultisignature.optionalOne.privateKey,
			);
			decodedParams.signatures.push(sign3);

			const sign4 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				networkIdentifier,
				messageBytes,
				accountsForMultisignature.optionalTwo.privateKey,
			);
			decodedParams.signatures.push(sign4);

			const msTx = {
				module: 'auth',
				command: 'registerMultisignature',
				nonce: BigInt('2'),
				fee: BigInt('1500000000'),
				senderPublicKey: accountsForMultisignature.targetAccount.publicKey,
				params: codec.encode(registerMultisignatureParamsSchema, decodedParams),
				signatures: [],
			};

			const unsignedMultiSigTransaction = codec.encode(transactionSchema, msTx);
			const TAG_TRANSACTION = 'LSK_TX_';
			const decodedBaseTransaction: any = codec.decode(
				transactionSchema,
				unsignedMultiSigTransaction,
			);
			const signatureSender = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				unsignedMultiSigTransaction,
				accountsForMultisignature.targetAccount.privateKey,
			);
			const signedTransaction = codec.encode(transactionSchema, {
				...decodedBaseTransaction,
				signatures: [signatureSender],
			});

			it('should return signed transaction for sender account', async () => {
				await SignCommandExtended.run(
					[
						unsignedMultiSigTransaction.toString('hex'),
						`--passphrase=${accountsForMultisignature.targetAccount.passphrase}`,
						`--chain-id=${chainIDStr}`,
						'--offline',
						'--key-derivation-path=legacy',
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction.toString('hex'),
				});
			});

			it('should return fully signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					[
						unsignedMultiSigTransaction.toString('hex'),
						`--passphrase=${accountsForMultisignature.targetAccount.passphrase}`,
						`--chain-id=${chainIDStr}`,
						'--offline',
						'--json',
						'--key-derivation-path=legacy',
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction.toString('hex'),
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const baseTX = {
				module: 'token',
				command: 'transfer',
				nonce: '2',
				fee: '100000000',
				senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				params: codec
					.encodeJSON(tokenTransferParamsSchema, (mockJSONTransaction as any).params)
					.toString('hex'),
				signatures: [],
			};
			const unsignedMultiSigTransaction = codec
				.encodeJSON(transactionSchema, baseTX)
				.toString('hex');
			const sign1 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'',
						'85614cfbacfb82aceb46d58455ae51a150cd0287bef33f6cc3396ed0d281062e9a5641a797285b187bb99ee1f435eea55bf3c4a8d946ace3945e0c9ae0570308',
						'',
						'',
					],
				})
				.toString('hex');
			const sign2 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'ec074318664ab7c968e2c28d0690b1abe121f155acc191f654d7053122afe9e55d2fafa454d509506d242b1af7f7f09b95fb8e96b465227c3107ca27a575f400',
						'',
						'',
					],
				})
				.toString('hex');
			const sign3 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'',
						'',
						'',
						'2f4aaee66509de2ca0da707a0278ff1c6ac31a919f14d3f7bedef86503220931969d0f7f4cd48e0abd86aab07779ac729ee538a9411b4b4e586d75c3f15a2a09',
					],
				})
				.toString('hex');

			describe('mandatory keys are specified', () => {
				it('should return signed transaction for mandatory account 1', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(unsignedMultiSigTransaction, mandatoryPassphrases[0]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return signed transaction for mandatory account 2', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(sign1, mandatoryPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe('optional keys are specified', () => {
				it('should return signed transaction for optional account 1', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign2, optionalPassphrases[0]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return signed transaction for optional account 2', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign3, optionalPassphrases[1]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return fully signed transaction string in hex format', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgsJSON(sign3, optionalPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							id: expect.any(String),
							params: {
								tokenID: '0000000000000000',
								amount: '100',
								data: 'send token',
								recipientAddress: 'lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9',
							},
							command: 'transfer',
							fee: '100000000',
							module: 'token',
							nonce: '2',
							senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							signatures: [
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
							],
						},
					});
				});
			});
		});
	});

	describe('online', () => {
		describe('sign transaction from single account', () => {
			const tx = {
				...mockJSONTransaction,
				params: codec
					.encodeJSON(tokenTransferParamsSchema, (mockJSONTransaction as any).params)
					.toString('hex'),
				signatures: [],
			};
			const unsignedTransaction = codec.encodeJSON(transactionSchema, tx).toString('hex');
			it('should return signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					[unsignedTransaction, `--passphrase=${senderPassphrase}`],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: mockEncodedTransaction.toString('hex'),
				});
			});

			it('should return signed transaction in json format', async () => {
				await SignCommandExtended.run(
					[unsignedTransaction, `--passphrase=${senderPassphrase}`, '--json'],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: '656e636f646564207472616e73616374696f6e',
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: mockJSONTransaction,
				});
			});
		});

		// TODO: To be fixed after https://github.com/LiskHQ/lisk-sdk/issues/7436
		// eslint-disable-next-line jest/no-disabled-tests
		describe('sign multi signature registration transaction', () => {
			const messageForRegistration = {
				address: accountsForMultisignature.targetAccount.publicKey,
				nonce: BigInt(2),
				numberOfSignatures: 4,
				mandatoryKeys: [
					accountsForMultisignature.mandatoryOne.publicKey,
					accountsForMultisignature.mandatoryTwo.publicKey,
				].sort((k1, k2) => k1.compare(k2)),
				optionalKeys: [
					accountsForMultisignature.optionalOne.publicKey,
					accountsForMultisignature.optionalTwo.publicKey,
				].sort((k1, k2) => k1.compare(k2)),
			};

			const messageBytes = codec.encode(multisigRegMsgSchema, messageForRegistration);

			const MESSAGE_TAG_MULTISIG_REG = 'LSK_RMSG_';
			const chainID = Buffer.from(chainIDStr, 'hex');

			const decodedParams = {
				numberOfSignatures: messageForRegistration.numberOfSignatures,
				mandatoryKeys: messageForRegistration.mandatoryKeys,
				optionalKeys: messageForRegistration.optionalKeys,
				signatures: [] as Buffer[],
			};

			const sign1 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				chainID,
				messageBytes,
				accountsForMultisignature.mandatoryTwo.privateKey,
			);
			decodedParams.signatures.push(sign1);

			const sign2 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				chainID,
				messageBytes,
				accountsForMultisignature.mandatoryOne.privateKey,
			);
			decodedParams.signatures.push(sign2);

			const sign3 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				chainID,
				messageBytes,
				accountsForMultisignature.optionalOne.privateKey,
			);
			decodedParams.signatures.push(sign3);

			const sign4 = ed.signData(
				MESSAGE_TAG_MULTISIG_REG,
				chainID,
				messageBytes,
				accountsForMultisignature.optionalTwo.privateKey,
			);
			decodedParams.signatures.push(sign4);

			const msTx: TransactionAttrs = {
				module: 'auth',
				command: 'registerMultisignature',
				nonce: BigInt('2'),
				fee: BigInt('1500000000'),
				senderPublicKey: accountsForMultisignature.targetAccount.publicKey,
				params: codec.encode(registerMultisignatureParamsSchema, decodedParams),
				signatures: [],
			};
			const decodedParamsJSON = {
				numberOfSignatures: decodedParams.numberOfSignatures,
				mandatoryKeys: decodedParams.mandatoryKeys.map(k => k.toString('hex')),
				optionalKeys: decodedParams.optionalKeys.map(k => k.toString('hex')),
				signatures: decodedParams.signatures.map(s => s.toString('hex')),
			};
			const msTxJSON = {
				module: 'auth',
				command: 'registerMultisignature',
				nonce: '2',
				fee: '1500000000',
				senderPublicKey: accountsForMultisignature.targetAccount.publicKey.toString('hex'),
				params: { ...decodedParamsJSON },
				signatures: [],
			};

			const unsignedMultiSigTransaction = codec.encode(transactionSchema, msTx);
			const TAG_TRANSACTION = 'LSK_TX_';
			const decodedBaseTransaction: any = codec.decode(
				transactionSchema,
				unsignedMultiSigTransaction,
			);
			const signatureSender = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				chainID,
				unsignedMultiSigTransaction,
				accountsForMultisignature.targetAccount.privateKey,
			);
			const signedTransaction = codec.encode(transactionSchema, {
				...decodedBaseTransaction,
				signatures: [signatureSender],
			});

			it('should return signed transaction for sender account', async () => {
				// Mock IPCClient to return the correct signed transaction
				jest
					.spyOn(apiClient, 'createIPCClient')
					.mockResolvedValue(
						createIPCClientMock(msTxJSON, signedTransaction, mockCommands) as never,
					);

				await SignCommandExtended.run(
					[
						unsignedMultiSigTransaction.toString('hex'),
						`--passphrase=${accountsForMultisignature.targetAccount.passphrase}`,
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction.toString('hex'),
				});
			});

			it('should return fully signed transaction string in hex format', async () => {
				// Mock IPCClient to return the correct signed transaction
				jest
					.spyOn(apiClient, 'createIPCClient')
					.mockResolvedValue(
						createIPCClientMock(
							{ ...msTxJSON, signatures: [signatureSender.toString('hex')] },
							signedTransaction,
							mockCommands,
						) as never,
					);

				await SignCommandExtended.run(
					[
						unsignedMultiSigTransaction.toString('hex'),
						`--passphrase=${accountsForMultisignature.targetAccount.passphrase}`,
						'--json',
					],
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction.toString('hex'),
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						module: 'auth',
						command: 'registerMultisignature',
						nonce: '2',
						fee: '1500000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						params: {
							numberOfSignatures: 4,
							mandatoryKeys: [
								'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
								'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							],
							optionalKeys: [
								'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
								'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
							],
							signatures: [
								'b782005d5b55f390bf1e10ed88a076e448124a9be882414977876a3fd134a2047e14c6aeb8b58915c4bb51ba3490b7643710432019dac171467bad214e0ced07',
								'082501104f42f0c8a47291b51630e6869aebb653fe224dca74a9027fc8494f5a2d6537bb1bc1b94d8b1a1af00d14fb50b9e0cd36e3bfb8ea3265c5e956064c0c',
								'aa72f005da46a8782ff5edd5b2546baf6a8bb0d67284c4e7631abf6629feba65854203d961fb4c2a31c12c525c0b7c4f9c8a47118789f93cf6ebd158b294c707',
								'6a3a179fbb076ca8e8c3e42e1e6d2ae447f39ae413df083e14685fd02a562ab3fac085080709387e3ecbf305b58b4f1957ea497e9e7834d55a8a71a946f5050d',
							],
						},
						signatures: [
							'06f78300e3fae75408e3526fd08de832e953e0d252f441f57003a1f4ad84f350edf0a20a641f43abe7fb81121306750e23effd31f6f04fbd1156a9088585440c',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const baseTX = {
				module: 'token',
				command: 'transfer',
				nonce: '2',
				fee: '100000000',
				senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				params: codec
					.encodeJSON(tokenTransferParamsSchema, (mockJSONTransaction as any).params)
					.toString('hex'),
				signatures: [],
			};
			const unsignedTransaction = codec.encodeJSON(transactionSchema, baseTX).toString('hex');
			const sign1 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'',
						'85614cfbacfb82aceb46d58455ae51a150cd0287bef33f6cc3396ed0d281062e9a5641a797285b187bb99ee1f435eea55bf3c4a8d946ace3945e0c9ae0570308',
						'',
						'',
					],
				})
				.toString('hex');
			const sign2 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'ec074318664ab7c968e2c28d0690b1abe121f155acc191f654d7053122afe9e55d2fafa454d509506d242b1af7f7f09b95fb8e96b465227c3107ca27a575f400',
						'',
						'',
					],
				})
				.toString('hex');
			const sign3 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'',
						'',
						'',
						'2f4aaee66509de2ca0da707a0278ff1c6ac31a919f14d3f7bedef86503220931969d0f7f4cd48e0abd86aab07779ac729ee538a9411b4b4e586d75c3f15a2a09',
					],
				})
				.toString('hex');
			describe('mandatory keys are specified', () => {
				it('should return signed transaction for mandatory account 1', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(unsignedTransaction, mandatoryPassphrases[0]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return signed transaction for mandatory account 2', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(sign1, mandatoryPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe('optional keys are specified', () => {
				it('should return signed transaction for optional account 1', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign2, optionalPassphrases[0]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return signed transaction for optional account 2', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign3, optionalPassphrases[1]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});

				it('should return fully signed transaction string in hex format', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgsJSON(sign3, optionalPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							id: expect.any(String),
							params: {
								tokenID: '0000000000000000',
								amount: '100',
								data: 'send token',
								recipientAddress: 'lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9',
							},
							command: 'transfer',
							fee: '100000000',
							module: 'token',
							nonce: '2',
							senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							signatures: [
								expect.any(String),
								expect.any(String),
								expect.any(String),
								expect.any(String),
							],
						},
					});
				});
			});
		});
	});
});

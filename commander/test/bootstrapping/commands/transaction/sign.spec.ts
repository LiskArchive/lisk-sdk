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
import { utils } from '@liskhq/lisk-cryptography';
import { Application, IPCChannel, transactionSchema } from 'lisk-framework';
import * as apiClient from '@liskhq/lisk-api-client';
import { codec } from '@liskhq/lisk-codec';

import {
	tokenTransferParamsSchema,
	keysRegisterParamsSchema,
	dposVoteParamsSchema,
	chainIDStr,
} from '../../../helpers/transactions';
import * as appUtils from '../../../../src/utils/application';
import * as readerUtils from '../../../../src/utils/reader';
import { SignCommand } from '../../../../src/bootstrapping/commands/transaction/sign';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('transaction:sign command', () => {
	const commands = [
		{
			module: 'token',
			command: 'transfer',
			schema: tokenTransferParamsSchema,
		},
		{
			module: 'auth',
			command: 'registerMultisignatureGroup',
			schema: keysRegisterParamsSchema,
		},
		{
			module: 'dpos',
			command: 'voteDelegate',
			schema: dposVoteParamsSchema,
		},
	];

	const mockEncodedTransaction = Buffer.from('encoded transaction');
	const mockJSONTransaction = {
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
		signatures: [
			'3cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
		],
	};
	const mockTransaction = {
		...codec.fromJSON(transactionSchema, {
			...mockJSONTransaction,
			params: '',
		}),
		params: codec.fromJSON(tokenTransferParamsSchema, mockJSONTransaction.params),
	};

	const senderPassphrase =
		'inherit moon normal relief spring bargain hobby join baby flash fog blood';

	const mandatoryPassphrases = [
		'trim elegant oven term access apple obtain error grain excite lawn neck',
		'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
	];

	const optionalPassphrases = [
		'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
	];

	const mandatoryKeys = [
		'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
	];

	const optionalKeys = [
		'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
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
			'--sender-public-key=f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		];
	};

	const signMultiSigCmdArgsIncludingSender = (
		unsignedTransaction: string,
		passphrase: string,
	): string[] => [...signMultiSigCmdArgs(unsignedTransaction, passphrase), '--include-sender'];

	const signMultiSigCmdArgsIncludingSenderJSON = (
		unsignedTransaction: string,
		passphrase: string,
	): string[] => [
		...signMultiSigCmdArgs(unsignedTransaction, passphrase),
		'--include-sender',
		'--json',
	];

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
			const { app } = Application.defaultApplication();
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
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			schema: {
				transaction: transactionSchema,
			},
			metadata: [
				{
					id: utils.intToBuffer(2, 4).toString('hex'),
					name: 'token',
					commands: [
						{
							id: utils.intToBuffer(0, 4).toString('hex'),
							name: 'transfer',
							params: tokenTransferParamsSchema,
						},
					],
				},
				{
					id: utils.intToBuffer(12, 4).toString('hex'),
					name: 'auth',
					commands: [
						{
							id: utils.intToBuffer(0, 4).toString('hex'),
							name: 'registerMultisignatureGroup',
							params: keysRegisterParamsSchema,
						},
					],
				},
				{
					id: utils.intToBuffer(13, 4).toString('hex'),
					name: 'dpos',
					commands: [
						{
							id: utils.intToBuffer(1, 4).toString('hex'),
							name: 'voteDelegate',
							params: dposVoteParamsSchema,
						},
					],
				},
			],
			transaction: {
				sign: jest.fn().mockReturnValue(mockJSONTransaction),
				encode: jest.fn().mockReturnValue(mockEncodedTransaction),
				toJSON: jest.fn().mockReturnValue(mockJSONTransaction),
				fromJSON: jest.fn().mockReturnValue(mockTransaction),
				decode: jest.fn().mockImplementation(val => {
					const root = codec.decode<Record<string, unknown>>(transactionSchema, val);
					const params = codec.decode(commands[0].schema, root.asset as Buffer);
					return { ...root, params };
				}),
			},
			node: {
				getNodeInfo: jest.fn().mockResolvedValue({
					chainID: '10000000',
				}),
			},
			invoke: jest.fn().mockResolvedValue({
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			}),
		} as never);
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
				.encodeJSON(tokenTransferParamsSchema, mockJSONTransaction.params)
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
				).rejects.toThrow();
			});
		});

		describe('missing network identifier flag', () => {
			it('should throw an error when missing network identifier flag.', async () => {
				await expect(
					SignCommandExtended.run(
						[unsignedTransaction, `--passphrase=${senderPassphrase}`, '--offline'],
						config,
					),
				).rejects.toThrow();
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
			const baseTX = {
				module: 'auth',
				command: 'registerMultisignatureGroup',
				nonce: '2',
				fee: '10000',
				senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				params:
					'080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
				signatures: [],
			};
			const unsignedMultiSigTransaction = codec
				.encodeJSON(transactionSchema, baseTX)
				.toString('hex');

			const sign1 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'',
						'',
						'',
						'',
					],
				})
				.toString('hex');
			const sign2 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'',
						'',
					],
				})
				.toString('hex');
			const sign3 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'',
						'',
					],
				})
				.toString('hex');
			const sign4 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'e5d24eaa4678cd0593abfb4c5e1245fd6e6ad96c3b603f4fd65f1b31d0de0c4bec575157540e242e67776ed01034c703a0081fcf2d822531ca8eb1daed76d906',
						'',
					],
				})
				.toString('hex');
			const signedTransaction = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'e5d24eaa4678cd0593abfb4c5e1245fd6e6ad96c3b603f4fd65f1b31d0de0c4bec575157540e242e67776ed01034c703a0081fcf2d822531ca8eb1daed76d906',
						'df7f8fd9e22c103a70d798d6763df12932a56956089f70681b86d8a709ee4b4ad3300b4de0d0d79f43470f4ad2c5ba899dd8e74936cddd4dad27d76fbcef960a',
					],
				})
				.toString('hex');

			it('should return signed transaction for sender account', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(unsignedMultiSigTransaction, senderPassphrase),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign1,
				});
			});

			it('should return signed transaction for mandatory account 1', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign1, mandatoryPassphrases[0]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign2,
				});
			});

			it('should return signed transaction for mandatory account 2', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign2, mandatoryPassphrases[1]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign3,
				});
			});

			it('should return signed transaction for optional account 1', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign3, optionalPassphrases[0]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign4,
				});
			});

			it('should return signed transaction for optional account 2', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign4, optionalPassphrases[1]),
					config,
				);

				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction,
				});
			});

			it('should return fully signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSenderJSON(sign4, optionalPassphrases[1]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction,
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: expect.any(String),
						module: 'auth',
						command: 'registerMultisignatureGroup',
						nonce: '2',
						fee: '10000',
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
						},
						signatures: [
							'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
							'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
							'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
							'e5d24eaa4678cd0593abfb4c5e1245fd6e6ad96c3b603f4fd65f1b31d0de0c4bec575157540e242e67776ed01034c703a0081fcf2d822531ca8eb1daed76d906',
							'df7f8fd9e22c103a70d798d6763df12932a56956089f70681b86d8a709ee4b4ad3300b4de0d0d79f43470f4ad2c5ba899dd8e74936cddd4dad27d76fbcef960a',
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
				params:
					'0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e',
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
					.encodeJSON(tokenTransferParamsSchema, mockJSONTransaction.params)
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

		describe('sign multi signature registration transaction', () => {
			const baseTX = {
				module: 'auth',
				command: 'registerMultisignatureGroup',
				nonce: '2',
				fee: '10000',
				senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				params:
					'080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
				signatures: [],
			};
			const unsignedTransaction = codec.encodeJSON(transactionSchema, baseTX).toString('hex');

			const sign1 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'',
						'',
						'',
						'',
					],
				})
				.toString('hex');
			const sign2 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'',
						'',
					],
				})
				.toString('hex');
			const sign3 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'',
						'',
					],
				})
				.toString('hex');
			const sign4 = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'e5d24eaa4678cd0593abfb4c5e1245fd6e6ad96c3b603f4fd65f1b31d0de0c4bec575157540e242e67776ed01034c703a0081fcf2d822531ca8eb1daed76d906',
						'',
					],
				})
				.toString('hex');
			const signedTransaction = codec
				.encodeJSON(transactionSchema, {
					...baseTX,
					signatures: [
						'5b693338959349701c11fbcdcaf586a02285da6c1893c5c9706429cef01a02dc2594eb4e39272d2f0998b923baa7cac8cc2b5a12264bbd2788bb30a8cb9a7806',
						'd9a23254b45f53ac01188e71bbfbee2919fb942d67be73a52611ba5ebcdd8695a51c580c0d823e02daaeb3f3f465e3e7aef02c98d14fea9764bed2c1bc062103',
						'53beae01c66d64d508d4930a2437a41ec8f3926628532a215e4db284f5fabcbd18cca5207dcd7ea0a3d908e10eb04db5ef6dc4c1739c722d726584754fa6650e',
						'e5d24eaa4678cd0593abfb4c5e1245fd6e6ad96c3b603f4fd65f1b31d0de0c4bec575157540e242e67776ed01034c703a0081fcf2d822531ca8eb1daed76d906',
						'df7f8fd9e22c103a70d798d6763df12932a56956089f70681b86d8a709ee4b4ad3300b4de0d0d79f43470f4ad2c5ba899dd8e74936cddd4dad27d76fbcef960a',
					],
				})
				.toString('hex');

			it('should return signed transaction for sender account', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(unsignedTransaction, senderPassphrase),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign1,
				});
			});

			it('should return signed transaction for mandatory account 1', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign1, mandatoryPassphrases[0]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign2,
				});
			});

			it('should return signed transaction for mandatory account 2', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign2, mandatoryPassphrases[1]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign3,
				});
			});

			it('should return signed transaction for optional account 1', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign3, optionalPassphrases[0]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: sign4,
				});
			});

			it('should return signed transaction for optional account 2', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSender(sign4, optionalPassphrases[1]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction,
				});
			});

			it('should return fully signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					signMultiSigCmdArgsIncludingSenderJSON(sign4, optionalPassphrases[1]),
					config,
				);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: signedTransaction,
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: expect.any(String),
						module: 'auth',
						command: 'registerMultisignatureGroup',
						nonce: '2',
						fee: '10000',
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
						},
						signatures: [
							expect.any(String),
							expect.any(String),
							expect.any(String),
							expect.any(String),
							expect.any(String),
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
				params:
					'0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e',
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

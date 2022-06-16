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
import { Application, IPCChannel, transactionSchema } from 'lisk-framework';
import * as apiClient from '@liskhq/lisk-api-client';
import { codec } from '@liskhq/lisk-codec';
import * as Config from '@oclif/config';

import {
	tokenTransferParamsSchema,
	keysRegisterParamsSchema,
	dposVoteParamsSchema,
	networkIdentifierStr,
} from '../../../helpers/transactions';
import * as appUtils from '../../../../src/utils/application';
import * as readerUtils from '../../../../src/utils/reader';
import { SignCommand } from '../../../../src/bootstrapping/commands/transaction/sign';
import { getConfig } from '../../../helpers/config';

describe('transaction:sign command', () => {
	const commands = [
		{
			moduleID: 2,
			commandID: 0,
			schema: tokenTransferParamsSchema,
		},
		{
			moduleID: 12,
			commandID: 0,
			schema: keysRegisterParamsSchema,
		},
		{
			moduleID: 13,
			commandID: 1,
			schema: dposVoteParamsSchema,
		},
	];

	const mockEncodedTransaction = Buffer.from('encoded transaction');
	const mockJSONTransaction = {
		params: {
			tokenID: '0000000000000000',
			amount: '100',
			data: 'send token',
			recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
		},
		commandID: 0,
		fee: '100000000',
		moduleID: 2,
		nonce: '0',
		senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
		signatures: [
			'3cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
		],
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
			`--network-identifier=${networkIdentifierStr}`,
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
	let config: Config.IConfig;

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
					id: 2,
					commands: [
						{
							id: 0,
							params: tokenTransferParamsSchema,
						},
					],
				},
				{
					id: 12,
					commands: [
						{
							id: 0,
							params: keysRegisterParamsSchema,
						},
					],
				},
				{
					id: 13,
					commands: [
						{
							id: 1,
							params: dposVoteParamsSchema,
						},
					],
				},
			],
			transaction: {
				sign: jest.fn().mockReturnValue(mockJSONTransaction),
				encode: jest.fn().mockReturnValue(mockEncodedTransaction),
				toJSON: jest.fn().mockReturnValue(mockJSONTransaction),
				decode: jest.fn().mockImplementation(val => {
					const root = codec.decode<Record<string, unknown>>(transactionSchema, val);
					const params = codec.decode(commands[0].schema, root.asset as Buffer);
					return { ...root, params };
				}),
			},
			node: {
				getNodeInfo: jest.fn().mockResolvedValue({
					networkIdentifier: '873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3',
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
		const unsignedTransaction =
			'0802100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';

		describe('data path flag', () => {
			it('should throw an error when data path flag specified.', async () => {
				await expect(
					SignCommandExtended.run(
						[
							unsignedTransaction,
							`--passphrase=${senderPassphrase}`,
							`--network-identifier=${networkIdentifierStr}`,
							'--offline',
							'--data-path=/tmp',
						],
						config,
					),
				).rejects.toThrow('--data-path= cannot also be provided when using --offline=');
			});
		});

		describe('missing network identifier flag', () => {
			it('should throw an error when missing network identifier flag.', async () => {
				await expect(
					SignCommandExtended.run(
						[unsignedTransaction, `--passphrase=${senderPassphrase}`, '--offline'],
						config,
					),
				).rejects.toThrow('--network-identifier= must also be provided when using --offline=');
			});
		});

		describe('sign transaction from single account', () => {
			it('should return signed transaction string in hex format', async () => {
				await SignCommandExtended.run(
					[
						unsignedTransaction,
						`--passphrase=${senderPassphrase}`,
						`--network-identifier=${networkIdentifierStr}`,
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
						`--network-identifier=${networkIdentifierStr}`,
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
						moduleID: 2,
						commandID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						params: {
							tokenID: '0000000000000000',
							amount: '100',
							recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							data: 'send token',
						},
						signatures: [expect.any(String)],
					},
				});
			});
		});

		describe('sign multi signature registration transaction', () => {
			const unsignedMultiSigTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4';
			const sign1 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a003a003a003a00';
			const sign2 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a003a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a003a00';
			const sign3 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a003a00';
			const sign4 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a4023dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e063a00';
			const signedTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a4023dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e063a406c9472db4001e8add9b4d38fda0ea5ea527dc717e92c6c7e8d8e6efe590047c1a1e6486eb2ec55bde1668f1b864ffd7a49fa756a49b415f95da2516e80222007';

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
						id: 'fe1b003e65fdd29bdc94759a81f82fcde63a627580ff751a1c3ecf2a53a6e85c',
						moduleID: 12,
						commandID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						params: {
							numberOfSignatures: 4,
							mandatoryKeys: [
								'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
								'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
							],
							optionalKeys: [
								'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
								'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
							],
						},
						signatures: [
							'2dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e',
							'fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c4104',
							'96169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b13005',
							'23dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e06',
							'6c9472db4001e8add9b4d38fda0ea5ea527dc717e92c6c7e8d8e6efe590047c1a1e6486eb2ec55bde1668f1b864ffd7a49fa756a49b415f95da2516e80222007',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedMultiSigTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';
			const sign1 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a003a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign2 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign3 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a40716f529ff0041385d1fc68429e5a565935a85dc8a152b9597aab231cae8f1b579d4063fc4c2392e0c4faad0ee8d00bbe75c18f9b9a3e07788ee37728ffa1fb0f3a00';

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
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							commandID: 0,
							fee: '100000000',
							moduleID: 2,
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
			const unsignedTransaction =
				'0802100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e';
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
			const unsignedTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4';
			const sign1 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a003a003a003a00';
			const sign2 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a003a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a003a00';
			const sign3 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a003a00';
			const sign4 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a4023dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e063a00';
			const signedTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a402dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e3a40fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c41043a4096169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b130053a4023dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e063a406c9472db4001e8add9b4d38fda0ea5ea527dc717e92c6c7e8d8e6efe590047c1a1e6486eb2ec55bde1668f1b864ffd7a49fa756a49b415f95da2516e80222007';

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
						id: 'fe1b003e65fdd29bdc94759a81f82fcde63a627580ff751a1c3ecf2a53a6e85c',
						moduleID: 12,
						commandID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						params: {
							numberOfSignatures: 4,
							mandatoryKeys: [
								'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
								'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
							],
							optionalKeys: [
								'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
								'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
							],
						},
						signatures: [
							'2dedbf91eed7ee646e7cef3bff5d8090093d369618e85ad22b044712a3efc08c8d680ccb767e8aef2964dc518905bd4fc0646167bf5b4c5853d84e5b42daaf0e',
							'fe6464ad77991899afbdbdb6e719e06e023e670342081d2c79534f0ce2b0eb1f27c9d7d205ca19d8d3ef4316573c17f093d70e3be87a86b042d64fdc6d6c4104',
							'96169b44c692949df7584da3c6dec457a6c444932ee46f50f1beca4514d3ce058e03d456241482eea08f78f4baa00486c547cded3b97e960f38b19dd92b13005',
							'23dabade99ad4bf96ddf8f0993e9dd87be558f9dcc55312aee5830738d55616f795365bffa4aac66f23e36833dbb9e029ea9e4ccc61676f52b32b414b48f2e06',
							'6c9472db4001e8add9b4d38fda0ea5ea527dc717e92c6c7e8d8e6efe590047c1a1e6486eb2ec55bde1668f1b864ffd7a49fa756a49b415f95da2516e80222007',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';
			const sign1 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a003a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign2 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign3 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a40716f529ff0041385d1fc68429e5a565935a85dc8a152b9597aab231cae8f1b579d4063fc4c2392e0c4faad0ee8d00bbe75c18f9b9a3e07788ee37728ffa1fb0f3a00';

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
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							commandID: 0,
							fee: '100000000',
							moduleID: 2,
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

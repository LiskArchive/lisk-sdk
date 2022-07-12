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
import { intToBuffer } from '@liskhq/lisk-cryptography';
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
			moduleID: intToBuffer(2, 4).toString('hex'),
			commandID: intToBuffer(0, 4).toString('hex'),
			schema: tokenTransferParamsSchema,
		},
		{
			moduleID: intToBuffer(12, 4).toString('hex'),
			commandID: intToBuffer(0, 4).toString('hex'),
			schema: keysRegisterParamsSchema,
		},
		{
			moduleID: intToBuffer(13, 4).toString('hex'),
			commandID: intToBuffer(1, 4).toString('hex'),
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
		commandID: intToBuffer(0, 4).toString('hex'),
		fee: '100000000',
		moduleID: intToBuffer(2, 4).toString('hex'),
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
					id: intToBuffer(2, 4).toString('hex'),
					commands: [
						{
							id: intToBuffer(0, 4).toString('hex'),
							params: tokenTransferParamsSchema,
						},
					],
				},
				{
					id: intToBuffer(12, 4).toString('hex'),
					commands: [
						{
							id: intToBuffer(0, 4).toString('hex'),
							params: keysRegisterParamsSchema,
						},
					],
				},
				{
					id: intToBuffer(13, 4).toString('hex'),
					commands: [
						{
							id: intToBuffer(1, 4).toString('hex'),
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
			'0a040000000212040000000018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';

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
						moduleID: '00000002',
						commandID: '00000000',
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
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6';

			const sign1 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a003a003a003a00';
			const sign2 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a003a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a003a00';
			const sign3 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a003a00';
			const sign4 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a407a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e3a00';
			const signedTransaction =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a407a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e3a40aa82672d011ee34694653d4efe4e325facb0bbf67290d666f00f5dfd95fe964f0f787c7077ae4cad414f899a98a85912e3fb8a01d46d90b78ed44c7d3df9d803';

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
						id: '28b9fde6071feb9325a6c93db736788f19f17e583eae2c1bcc8b470998045c88',
						moduleID: '0000000c',
						commandID: '00000000',
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
							'dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b1502',
							'695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa4107',
							'c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f',
							'7a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e',
							'aa82672d011ee34694653d4efe4e325facb0bbf67290d666f00f5dfd95fe964f0f787c7077ae4cad414f899a98a85912e3fb8a01d46d90b78ed44c7d3df9d803',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedMultiSigTransaction =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';
			const sign1 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a003a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign2 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign3 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a40716f529ff0041385d1fc68429e5a565935a85dc8a152b9597aab231cae8f1b579d4063fc4c2392e0c4faad0ee8d00bbe75c18f9b9a3e07788ee37728ffa1fb0f3a00';
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
							commandID: '00000000',
							fee: '100000000',
							moduleID: '00000002',
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
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6';
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
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6';
			const sign1 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a003a003a003a00';
			const sign2 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a003a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a003a00';
			const sign3 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a003a00';
			const sign4 =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a407a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e3a00';
			const signedTransaction =
				'0a040000000c120400000000180220904e2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a01080412204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba31a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca41a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b63a40dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b15023a40695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa41073a40c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f3a407a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e3a40aa82672d011ee34694653d4efe4e325facb0bbf67290d666f00f5dfd95fe964f0f787c7077ae4cad414f899a98a85912e3fb8a01d46d90b78ed44c7d3df9d803';

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
						id: '28b9fde6071feb9325a6c93db736788f19f17e583eae2c1bcc8b470998045c88',
						moduleID: '0000000c',
						commandID: '00000000',
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
							'dd6fad30a70e5bb2586f67db58200305b837380c95a4ac9b31faa8b9695a83a2e7693a8dd4645d69d06e1994bcf13d286a6346f0693459c8319c508e795b1502',
							'695b3003a58b21065e948c4d1bbedb85ad2e3c1299a6d79a0341433e48f8788db2e6ca5d81ca8313ce6e066d49054569b6b4c472b3c7cbfe4aafec73a4fa4107',
							'c38e4a2ef86be8e7f1e729fc07531c732239211a3eb7b640214872c6bf11172dc1f58ff06caf06b2866f6a29f89856c82face639e4c14f323bcc9b25d3b89d0f',
							'7a3ae0dccc847cf37ab899439df5b97218ae2b5c10131a87ab0328029200b4db95042fb8e8ca736bb07a577c7ce09645bcee2cf521e6b059ba44addec212fb0e',
							'aa82672d011ee34694653d4efe4e325facb0bbf67290d666f00f5dfd95fe964f0f787c7077ae4cad414f899a98a85912e3fb8a01d46d90b78ed44c7d3df9d803',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedTransaction =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e';
			const sign1 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a003a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			('0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00');
			const sign2 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a003a00';
			const sign3 =
				'0a040000000212040000000018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322e0a08000000000000000010641a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815220a73656e6420746f6b656e3a402a81972b36a03e9d64f64f2c6c1c947baa15180c6fb2242302ee26c702322140de728d406b674e2478a74aae7010533ab33fbb0add63a08aa94b0b54434fab053a40296301a8e1b4580edb8c8bde549e1838c42a5ca56931be29eb7a6596925429c42a6fc1fbbe29095dcd3be9e7f1063abc326eb6067f7a6c5fcf60f5bd986e070c3a40716f529ff0041385d1fc68429e5a565935a85dc8a152b9597aab231cae8f1b579d4063fc4c2392e0c4faad0ee8d00bbe75c18f9b9a3e07788ee37728ffa1fb0f3a00';
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
							commandID: '00000000',
							fee: '100000000',
							moduleID: '00000002',
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

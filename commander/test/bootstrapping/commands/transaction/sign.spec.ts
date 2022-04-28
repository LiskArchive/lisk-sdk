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
			schemas: {
				transaction: transactionSchema,
				commands,
			},
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
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a003a003a003a00';
			const sign2 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a003a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a003a00';
			const sign3 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a003a00';
			const sign4 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a4012eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d3a00';
			const signedTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a4012eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d3a402d0ed68328efac4f7a8c93796abb8f3b70038856b645c73c8e5a1dad6fa95b45d81d15153cfc945e4a702ee20543ec9ef22cdc707030f2137db508eea517fc0b';

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
						id: '5378188257795a4a2dd23efadd741c8ffc69bd8c448dd8b2ffc57d60b0e33ad8',
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
							'ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af30610006',
							'5b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b',
							'78e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d05',
							'12eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d',
							'2d0ed68328efac4f7a8c93796abb8f3b70038856b645c73c8e5a1dad6fa95b45d81d15153cfc945e4a702ee20543ec9ef22cdc707030f2137db508eea517fc0b',
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
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a003a003a003a00';
			const sign2 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a003a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a003a00';
			const sign3 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a003a00';
			const sign4 =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a4012eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d3a00';
			const signedTransaction =
				'080c100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a40ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af306100063a405b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b3a4078e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d053a4012eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d3a402d0ed68328efac4f7a8c93796abb8f3b70038856b645c73c8e5a1dad6fa95b45d81d15153cfc945e4a702ee20543ec9ef22cdc707030f2137db508eea517fc0b';

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
						id: '5378188257795a4a2dd23efadd741c8ffc69bd8c448dd8b2ffc57d60b0e33ad8',
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
							'ce8f7ddc203da2d7446820b428fd09304a373522d000359a646e7d1f30d45195d21fb5b0ebeba89fa8fd128bad0df1e15aae80aa7eca22390b56c5af30610006',
							'5b98adfa8bdd592f88217e43373286174982a42e85da06897b3f76836d5c051327a7938a4a6644e12e5f6e6960aca94fb0b1b87d619a3c46582e317719b6930b',
							'78e0feaf181dcb521f90873d22317193f448116151e852284f739aa1243d1d63bc1e903f97363dc733758c7d569db1d77133c8419d8b45dcdf9f899d91192d05',
							'12eb4879b7a81dcd236335eb55f18f5d1632dd11d5f933b4791bafaaaaa746535b227d853ecf563a7462948467963247eec6f7bd4e7583ccc05d8fd6180e880d',
							'2d0ed68328efac4f7a8c93796abb8f3b70038856b645c73c8e5a1dad6fa95b45d81d15153cfc945e4a702ee20543ec9ef22cdc707030f2137db508eea517fc0b',
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

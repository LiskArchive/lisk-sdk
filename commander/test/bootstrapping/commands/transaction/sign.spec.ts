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
	tokenTransferAssetSchema,
	keysRegisterAssetSchema,
	networkIdentifierStr,
	dposVoteAssetSchema,
	accountSchema,
} from '../../../helpers/transactions';
import * as appUtils from '../../../../src/utils/application';
import * as readerUtils from '../../../../src/utils/reader';
import { SignCommand } from '../../../../src/bootstrapping/commands/transaction/sign';
import { getConfig } from '../../../helpers/config';

describe('transaction:sign command', () => {
	const transactionsAssets = [
		{
			moduleID: 2,
			assetID: 0,
			schema: tokenTransferAssetSchema,
		},
		{
			moduleID: 4,
			assetID: 0,
			schema: keysRegisterAssetSchema,
		},
		{
			moduleID: 5,
			assetID: 1,
			schema: dposVoteAssetSchema,
		},
	];

	const mockEncodedTransaction = Buffer.from('encoded transaction');
	const mockJSONTransaction = {
		asset: {
			amount: '100',
			data: 'send token',
			recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
		},
		assetID: 0,
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
			const app = Application.defaultApplication({}, {});
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
				transactionsAssets,
				account: accountSchema,
			},
			transaction: {
				sign: jest.fn().mockReturnValue(mockJSONTransaction),
				encode: jest.fn().mockReturnValue(mockEncodedTransaction),
				toJSON: jest.fn().mockReturnValue(mockJSONTransaction),
				decode: jest.fn().mockImplementation(val => {
					const root = codec.decode<Record<string, unknown>>(transactionSchema, val);
					const asset = codec.decode(transactionsAssets[0].schema, root.asset as Buffer);
					return { ...root, asset };
				}),
			},
			node: {
				getNodeInfo: jest.fn().mockResolvedValue({
					networkIdentifier: '873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3',
				}),
			},
			account: {
				get: jest.fn().mockResolvedValue({
					address: Buffer.from('ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815', 'hex'),
					token: {
						balance: BigInt('100000000'),
					},
					sequence: {
						nonce: BigInt(0),
					},
					keys: {
						numberOfSignatures: 0,
						mandatoryKeys: [],
						optionalKeys: [],
					},
				}),
			},
		} as never);
	});

	describe('Missing arguments', () => {
		it('should throw an error when missing transaction argument.', async () => {
			await expect(SignCommandExtended.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('offline', () => {
		const unsignedTransaction =
			'0802100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e';

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
					transaction:
						'0802100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a407a1283e24e46ec5a0416d0b13a48fd2ca3bc1f6a4ea3ef83f97d54ebd0b3d45b025bf91c00b60c4cddade00be8a4da9088ab83be702b583e67265323a8391406',
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
					transaction:
						'0802100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a407a1283e24e46ec5a0416d0b13a48fd2ca3bc1f6a4ea3ef83f97d54ebd0b3d45b025bf91c00b60c4cddade00be8a4da9088ab83be702b583e67265323a8391406',
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: '1234764fcdb6be77c1f8bd72d95c4d77672bf31020fd2ef0387463e1f47a945b',
						moduleID: 2,
						assetID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						asset: {
							amount: '100',
							recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							data: 'send token',
						},
						signatures: [
							'7a1283e24e46ec5a0416d0b13a48fd2ca3bc1f6a4ea3ef83f97d54ebd0b3d45b025bf91c00b60c4cddade00be8a4da9088ab83be702b583e67265323a8391406',
						],
					},
				});
			});
		});

		describe('sign multi signature registration transaction', () => {
			const unsignedMultiSigTransaction =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4';
			const sign1 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a003a003a003a00';
			const sign2 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a003a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a003a00';
			const sign3 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a003a00';
			const sign4 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a00';
			const signedTransaction =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a40c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00';

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
					transaction:
						'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a40c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00',
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: '0f3341daa3cc562a4ca84489387fa1a24ae1419666a30281e7c6da77744e789a',
						moduleID: 4,
						assetID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						asset: {
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
							'5221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a352302',
							'6f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a',
							'408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f',
							'd01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a204',
							'c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedMultiSigTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e';
			const sign1 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a003a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a003a00';
			const sign2 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a003a00';
			const sign3 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a00';
			const signedTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a4055e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01';

			describe('mandatory keys are specified', () => {
				it('should return signed transaction for mandatory account 1', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(unsignedMultiSigTransaction, mandatoryPassphrases[0]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign1,
					});
				});

				it('should return signed transaction for mandatory account 2', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(sign1, mandatoryPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign2,
					});
				});
			});

			describe('optional keys are specified', () => {
				it('should return signed transaction for optional account 1', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign2, optionalPassphrases[0]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign3,
					});
				});

				it('should return signed transaction for optional account 2', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign3, optionalPassphrases[1]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: signedTransaction,
					});
				});

				it('should return fully signed transaction string in hex format', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgsJSON(sign3, optionalPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction:
							'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a4055e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01',
					});
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							id: '36b212ff40892bf94afda6162a855bd8f103106780c306b0a8cb97c9ccc57a97',
							asset: {
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							assetID: 0,
							fee: '100000000',
							moduleID: 2,
							nonce: '2',
							senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							signatures: [
								'1f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b103',
								'f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a',
								'a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e',
								'55e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01',
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
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4';
			const sign1 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a003a003a003a00';
			const sign2 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a003a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a003a00';
			const sign3 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a003a00';
			const sign4 =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a00';
			const signedTransaction =
				'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a40c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00';

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
					transaction:
						'0804100018022080c2d72f2a200b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe328a0108041220f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba312204a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd391a20fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b61a2057df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca43a405221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a3523023a406f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a3a40408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f3a40d01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a2043a40c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00',
				});
				expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
					transaction: {
						id: '0f3341daa3cc562a4ca84489387fa1a24ae1419666a30281e7c6da77744e789a',
						moduleID: 4,
						assetID: 0,
						nonce: '2',
						fee: '100000000',
						senderPublicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						asset: {
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
							'5221970ee34cd778d78cee2a5233806aa42836aa62e2b76384d56fe8cf4cd4f6c02006af1ca0b1a1f9fd4566c1a442a81185c342e16b8fd4b95808b01a352302',
							'6f067e0a7dc666a6604f45e843698b05c8c9872393d32d8b49f798608ef7e27d3869c630c309352a92b73af6822ddfa223b5fbf2ec74fd5860d632f88f6d790a',
							'408061c9ea44ec5c2a2baad0301d15cf01035bcebb9e133738619685b7f0056be67d29596537d928b9288adbb12242d4f233647873e5d481d799c6b46099030f',
							'd01ccfc1a9ec73c7d71ea716491c1e5290bad9ca47363fe7952377a3d6f3ebe1e2ca14b651b6497025a0ada6635db6d5519400c4f7ccb8586d8ee9310313a204',
							'c5b98e8496cb2562429bd83ae75ee287bcddaea64bab91e0b1c04ac4554819cc2b4262ef1987dbeef8403899bbc2610308c070878acabb02da404758b74a8b00',
						],
					},
				});
			});
		});

		describe('sign transaction from multi-signature accounts', () => {
			const unsignedTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e';
			const sign1 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a003a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a003a00';
			const sign2 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a003a00';
			const sign3 =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a00';
			const signedTransaction =
				'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a4055e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01';

			describe('mandatory keys are specified', () => {
				it('should return signed transaction for mandatory account 1', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(unsignedTransaction, mandatoryPassphrases[0]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign1,
					});
				});

				it('should return signed transaction for mandatory account 2', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgs(sign1, mandatoryPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign2,
					});
				});
			});

			describe('optional keys are specified', () => {
				it('should return signed transaction for optional account 1', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign2, optionalPassphrases[0]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: sign3,
					});
				});

				it('should return signed transaction for optional account 2', async () => {
					await SignCommandExtended.run(signMultiSigCmdArgs(sign3, optionalPassphrases[1]), config);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: signedTransaction,
					});
				});

				it('should return fully signed transaction string in hex format', async () => {
					await SignCommandExtended.run(
						signMultiSigCmdArgsJSON(sign3, optionalPassphrases[1]),
						config,
					);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction:
							'0802100018022080c2d72f2a20f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a401f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b1033a40f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a3a40a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e3a4055e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01',
					});
					expect(SignCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							id: '36b212ff40892bf94afda6162a855bd8f103106780c306b0a8cb97c9ccc57a97',
							asset: {
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							assetID: 0,
							fee: '100000000',
							moduleID: 2,
							nonce: '2',
							senderPublicKey: 'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							signatures: [
								'1f11d2300ecabb85e5d8e2d51a227e566fdf6fe7750345deb6162fa13ce44fcfcf060a7f073912c2a940e9d0351a671537b213509f04c6a4e67572aa3850b103',
								'f39a1d92a381490e9bed6b7105cbaf76849f8985258a7e84779fce8ecdda3fbec5bca5cb0df749731294d035677ebdb2c6664229eb11ec4c4e9a9a0b86a0010a',
								'a40e56c0a6aaa549bd34c2b948aec20fecd3c60661da472fb0ffc3ce98766ddea1179138d5d110abaa97f057bedecdc5d2aa4617a328bedd415481bd9e87ef0e',
								'55e35fbc455dfd0c71455a3c4fb3b0363bd90810fae11d715a95e3892847afc4e3eb42c692e3d0da7c32e8a8225ddeca565eed9c821e24a57c74db196d87ed01',
							],
						},
					});
				});
			});
		});
	});
});

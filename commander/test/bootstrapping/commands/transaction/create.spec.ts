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
import * as inquirer from 'inquirer';
import { Application, transactionSchema } from 'lisk-framework';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as apiClient from '@liskhq/lisk-api-client';
import * as transactions from '@liskhq/lisk-transactions';
import * as Config from '@oclif/config';

import * as appUtils from '../../../../src/utils/application';
import * as readerUtils from '../../../../src/utils/reader';
import { tokenTransferParamsSchema, dposVoteParamsSchema } from '../../../helpers/transactions';
import { CreateCommand } from '../../../../src/bootstrapping/commands/transaction/create';
import { getConfig } from '../../../helpers/config';
import { PromiseResolvedType } from '../../../../src/types';

describe('transaction:create command', () => {
	const commandSchemas = [
		{
			moduleID: 2,
			commandID: 0,
			schema: tokenTransferParamsSchema,
		},
		{
			moduleID: 13,
			commandID: 1,
			schema: dposVoteParamsSchema,
		},
	];
	const passphrase = 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready';
	const transferParams =
		'{"tokenID": "0000000000000000","amount":100,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}';
	const voteParams =
		'{"votes":[{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":100},{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":-50}]}';
	const unVoteParams =
		'{"votes":[{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":-50}]}';
	const { publicKey } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
	const senderPublicKey = publicKey.toString('hex');
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

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;
	let clientMock: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>>;

	// In order to test the command we need to extended the base crete command and provide application implementation
	class CreateCommandExtended extends CreateCommand {
		getApplication = () => {
			const { app } = Application.defaultApplication({});
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
		jest.spyOn(CreateCommandExtended.prototype, 'printJSON').mockReturnValue();
		clientMock = {
			disconnect: jest.fn(),
			schemas: {
				transaction: transactionSchema,
				commands: commandSchemas,
			},
			node: {
				getNodeInfo: jest.fn().mockResolvedValue({
					networkIdentifier: '873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3',
				}),
			},
			transaction: {
				encode: jest.fn().mockReturnValue(mockEncodedTransaction),
				toJSON: jest.fn().mockReturnValue(mockJSONTransaction),
				sign: jest.fn().mockReturnValue(mockJSONTransaction),
			},
			invoke: jest.fn().mockResolvedValue({
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			}),
		} as any;
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(clientMock);
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({
			tokenID: '0000000000000000',
			amount: 100,
			recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
			data: 'send token',
		});
		jest.spyOn(readerUtils, 'getPassphraseFromPrompt').mockResolvedValue(passphrase);
	});

	describe('transaction:create', () => {
		it('should throw an error when no arguments are provided.', async () => {
			await expect(CreateCommandExtended.run([], config)).rejects.toThrow(
				'Missing 3 required args:',
			);
		});
	});

	describe('transaction:create 2', () => {
		it('should throw an error when fee, nonce and transaction type are provided.', async () => {
			await expect(CreateCommandExtended.run(['2'], config)).rejects.toThrow(
				'Missing 2 required args:',
			);
		});
	});

	describe('transaction:create 2 0', () => {
		it('should throw an error when nonce and transaction type are provided.', async () => {
			await expect(CreateCommandExtended.run(['2', '0'], config)).rejects.toThrow(
				'Missing 1 required arg:',
			);
		});
	});

	describe('transaction:create 99999 0 100000000', () => {
		it('should throw an error when moduleID is not registered.', async () => {
			await expect(CreateCommandExtended.run(['99999', '0', '100000000'], config)).rejects.toThrow(
				'Transaction moduleID:99999 with commandID:0 is not registered in the application',
			);
		});
	});

	describe('offline', () => {
		describe('with flags', () => {
			describe(`transaction:create 2 0 100000000 --params='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				it('should throw error for data path flag.', async () => {
					await expect(
						CreateCommandExtended.run(
							[
								'2',
								'0',
								'100000000',
								'--params={"amount": "abc"}',
								`--passphrase=${passphrase}`,
								'--offline',
								'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
								'--nonce=1',
								'--data-path=/tmp',
							],
							config,
						),
					).rejects.toThrow('--data-path= cannot also be provided when using --offline=');
				});
			});

			describe(`transaction:create 2 0 100000000 --params='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				it('should throw error for missing network identifier flag.', async () => {
					await expect(
						CreateCommandExtended.run(
							[
								'2',
								'0',
								'100000000',
								'--params={"amount": "abc"}',
								`--passphrase=${passphrase}`,
								'--offline',
							],
							config,
						),
					).rejects.toThrow('--network-identifier= must also be provided when using --offline=');
				});
			});

			describe(`transaction:create 2 0 100000000 --params='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				it('should throw error for missing nonce flag.', async () => {
					await expect(
						CreateCommandExtended.run(
							[
								'2',
								'0',
								'100000000',
								'--params={"amount": "abc"}',
								`--passphrase=${passphrase}`,
								'--offline',
								'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							],
							config,
						),
					).rejects.toThrow('--nonce= must also be provided when using --offline=');
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --no-signature`, () => {
				it('should throw error when sender public key not specified when no-signature flag is used.', async () => {
					await expect(
						CreateCommandExtended.run(
							[
								'2',
								'0',
								'100000000',
								`--params=${transferParams}`,
								'--no-signature',
								'--offline',
								'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
								'--nonce=1',
							],
							config,
						),
					).rejects.toThrow(
						'--sender-public-key= must also be provided when using --no-signature=',
					);
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --passphrase=${passphrase}`, () => {
				it('should throw error when transfer params data is empty.', async () => {
					await expect(
						CreateCommandExtended.run(
							[
								'2',
								'0',
								'100000000',
								'--params={"tokenID":"0000000000000000","amount":100,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815"}',
								`--passphrase=${passphrase}`,
								'--offline',
								'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
								'--nonce=1',
								'--network=devnet',
							],
							config,
						),
					).rejects.toThrow(
						"Lisk validator found 1 error[s]:\nMissing property, must have required property 'data'",
					);
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							'--offline',
							`--params=${transferParams}`,
							`--passphrase=${passphrase}`,
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --no-signature --sender-public-key=${senderPublicKey}`, () => {
				it('should return encoded transaction string in hex format without signature', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							'--offline',
							`--params=${transferParams}`,
							'--no-signature',
							`--sender-public-key=${senderPublicKey}`,
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe(`transaction:create 13 1 100000000 --params=${voteParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						[
							'13',
							'1',
							'100000000',
							'--offline',
							`--params=${voteParams}`,
							`--passphrase=${passphrase}`,
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe(`transaction:create 13 1 100000000 --params=${unVoteParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						[
							'13',
							'1',
							'100000000',
							'--offline',
							`--params=${unVoteParams}`,
							`--passphrase=${passphrase}`,
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});
		});

		describe('with prompts and flags', () => {
			describe(`transaction:create 2 0 100000000 --passphrase=${passphrase}`, () => {
				it('should prompt user for params.', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--passphrase=${passphrase}`,
							'--offline',
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(inquirer.prompt).toHaveBeenCalledTimes(1);
					expect(inquirer.prompt).toHaveBeenCalledWith([
						{ message: 'Please enter: tokenID: ', name: 'tokenID', type: 'input' },
						{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
						{
							message: 'Please enter: recipientAddress: ',
							name: 'recipientAddress',
							type: 'input',
						},
						{ message: 'Please enter: data: ', name: 'data', type: 'input' },
					]);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe('transaction:create 2 0 100000000', () => {
				it('should prompt user for params and passphrase.', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							'--offline',
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(inquirer.prompt).toHaveBeenCalledTimes(1);
					expect(inquirer.prompt).toHaveBeenCalledWith([
						{ message: 'Please enter: tokenID: ', name: 'tokenID', type: 'input' },
						{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
						{
							message: 'Please enter: recipientAddress: ',
							name: 'recipientAddress',
							type: 'input',
						},
						{ message: 'Please enter: data: ', name: 'data', type: 'input' },
					]);
					expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --no-signature --json`, () => {
				it('should return unsigned transaction in json format when no passphrase specified', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--params=${transferParams}`,
							'--no-signature',
							`--sender-public-key=${senderPublicKey}`,
							'--json',
							'--offline',
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							moduleID: 2,
							commandID: 0,
							nonce: '1',
							fee: '100000000',
							senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
							params: {
								tokenID: '0000000000000000',
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							signatures: [],
						},
					});
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --passphrase=${passphrase} --json`, () => {
				it('should return signed transaction in json format when passphrase specified', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--params=${transferParams}`,
							`--passphrase=${passphrase}`,
							'--json',
							'--offline',
							'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
							'--nonce=1',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: expect.any(String),
					});
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							moduleID: 2,
							commandID: 0,
							nonce: '1',
							fee: '100000000',
							id: expect.any(String),
							senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
							params: {
								tokenID: '0000000000000000',
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							signatures: [expect.any(String)],
						},
					});
				});
			});
		});
	});

	describe('online', () => {
		describe('with flags', () => {
			describe(`transaction:create 2 0 100000000 --params='{"amount": "abc"}' --passphrase=${passphrase}`, () => {
				it('should throw error for invalid params.', async () => {
					await expect(
						CreateCommandExtended.run(
							['2', '0', '100000000', '--params={"amount": "abc"}', `--passphrase=${passphrase}`],
							config,
						),
					).rejects.toThrow('Cannot convert abc to a BigInt');
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						['2', '0', '100000000', `--params=${transferParams}`, `--passphrase=${passphrase}`],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --no-signature --sender-public-key=${senderPublicKey}`, () => {
				it('should return encoded transaction string in hex format without signature', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--params=${transferParams}`,
							'--no-signature',
							`--sender-public-key=${senderPublicKey}`,
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe(`transaction:create 13 1 100000000 --params=${voteParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						['13', '1', '100000000', `--params=${voteParams}`, `--passphrase=${passphrase}`],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe(`transaction:create 13 1 100000000 --params=${unVoteParams} --passphrase=${passphrase}`, () => {
				it('should return encoded transaction string in hex format with signature', async () => {
					await CreateCommandExtended.run(
						['13', '1', '100000000', `--params=${unVoteParams}`, `--passphrase=${passphrase}`],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});
		});

		describe('with prompts and flags', () => {
			describe(`transaction:create 2 0 100000000 --passphrase=${passphrase}`, () => {
				it('should prompt user for params.', async () => {
					await CreateCommandExtended.run(
						['2', '0', '100000000', `--passphrase=${passphrase}`],
						config,
					);
					expect(inquirer.prompt).toHaveBeenCalledTimes(1);
					expect(inquirer.prompt).toHaveBeenCalledWith([
						{ message: 'Please enter: tokenID: ', name: 'tokenID', type: 'input' },
						{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
						{
							message: 'Please enter: recipientAddress: ',
							name: 'recipientAddress',
							type: 'input',
						},
						{ message: 'Please enter: data: ', name: 'data', type: 'input' },
					]);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe('transaction:create 2 0 100000000 --nonce=999', () => {
				it('should prompt user for params and passphrase.', async () => {
					await CreateCommandExtended.run(['2', '0', '100000000', '--nonce=999'], config);
					expect(inquirer.prompt).toHaveBeenCalledTimes(1);
					expect(inquirer.prompt).toHaveBeenCalledWith([
						{ message: 'Please enter: tokenID: ', name: 'tokenID', type: 'input' },
						{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
						{
							message: 'Please enter: recipientAddress: ',
							name: 'recipientAddress',
							type: 'input',
						},
						{ message: 'Please enter: data: ', name: 'data', type: 'input' },
					]);
					expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe('transaction:create 2 0 100000000', () => {
				it('should prompt user for params and passphrase.', async () => {
					await CreateCommandExtended.run(['2', '0', '100000000'], config);
					expect(inquirer.prompt).toHaveBeenCalledTimes(1);
					expect(inquirer.prompt).toHaveBeenCalledWith([
						{ message: 'Please enter: tokenID: ', name: 'tokenID', type: 'input' },
						{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
						{
							message: 'Please enter: recipientAddress: ',
							name: 'recipientAddress',
							type: 'input',
						},
						{ message: 'Please enter: data: ', name: 'data', type: 'input' },
					]);
					expect(readerUtils.getPassphraseFromPrompt).toHaveBeenCalledWith('passphrase', true);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(1);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: mockEncodedTransaction.toString('hex'),
					});
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --no-signature --json`, () => {
				it('should return unsigned transaction in json format when no passphrase specified', async () => {
					jest.spyOn(transactions, 'signTransaction');
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--params=${transferParams}`,
							'--no-signature',
							`--sender-public-key=${senderPublicKey}`,
							'--json',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(transactions.signTransaction).not.toHaveBeenCalled();
				});
			});

			describe(`transaction:create 2 0 100000000 --params=${transferParams} --passphrase=${passphrase} --json`, () => {
				it('should return signed transaction in json format when passphrase specified', async () => {
					await CreateCommandExtended.run(
						[
							'2',
							'0',
							'100000000',
							`--params=${transferParams}`,
							`--passphrase=${passphrase}`,
							'--json',
						],
						config,
					);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledTimes(2);
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: '656e636f646564207472616e73616374696f6e',
					});
					expect(CreateCommandExtended.prototype.printJSON).toHaveBeenCalledWith(undefined, {
						transaction: {
							moduleID: 2,
							commandID: 0,
							nonce: '0',
							fee: '100000000',
							senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
							params: {
								tokenID: '0000000000000000',
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							signatures: [
								'3cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
							],
						},
					});
				});
			});
		});
	});
});

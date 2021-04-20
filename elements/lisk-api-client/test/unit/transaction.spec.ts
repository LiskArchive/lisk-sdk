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
 *
 */

import { when } from 'jest-when';
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '../../src/transaction';
import { nodeInfo, schema, tx, accountSchema } from '../utils/transaction';

describe('transaction', () => {
	let channelMock: any;
	let transaction: Transaction;
	const passphrases = [
		'trim elegant oven term access apple obtain error grain excite lawn neck',
		'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
	];
	const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
	const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
	const publicKey2 = Buffer.from(
		'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		'hex',
	);
	const txHex =
		'0802100018362080ade2042a20dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a321d0880ade2041214654087c2df870402ab0b1996616fd3355d61f62c1a003a4079cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700';
	const accountHex =
		'0a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581512050880c2d72f1a020800220208002a3b0a1a0a0a67656e657369735f3834180020850528003080a094a58d1d121d0a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151080a094a58d1d';
	const encodedTx = Buffer.from(txHex, 'hex');

	const validTransaction = {
		moduleID: 2,
		assetID: 0,
		nonce: BigInt('1'),
		fee: BigInt('10000000'),
		senderPublicKey: publicKey1,
		asset: {
			recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
			amount: BigInt('4008489300000000'),
			data: '',
		},
	};
	const txId = Buffer.from(tx.id, 'hex');

	beforeEach(() => {
		channelMock = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};

		when(channelMock.invoke)
			.calledWith('app:getAccount', expect.anything())
			.mockResolvedValue(accountHex as never)
			.calledWith('app:getTransactionByID', expect.anything())
			.mockResolvedValue(txHex as never)
			.calledWith('app:getTransactionsFromPool')
			.mockResolvedValue([txHex] as never)
			.calledWith('app:postTransaction', expect.anything())
			.mockResolvedValue(txHex as never);

		transaction = new Transaction(channelMock, schema, nodeInfo);
	});

	describe('Transaction', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(transaction['_channel']).toBe(channelMock);
			});
		});

		describe('get', () => {
			describe('transaction by id as buffer', () => {
				it('should invoke app:getTransactionByID', async () => {
					await transaction.get(txId);
					expect(channelMock.invoke).toHaveBeenCalledTimes(1);
					expect(channelMock.invoke).toHaveBeenCalledWith('app:getTransactionByID', {
						id: txId.toString('hex'),
					});
				});
			});

			describe('transaction by id as hex', () => {
				it('should invoke app:getTransactionByID', async () => {
					await transaction.get(txId.toString('hex'));
					expect(channelMock.invoke).toHaveBeenCalledTimes(1);
					expect(channelMock.invoke).toHaveBeenCalledWith('app:getTransactionByID', {
						id: txId.toString('hex'),
					});
				});
			});
		});

		describe('getFromPool', () => {
			it('should invoke app:getTransactionsFromPool', async () => {
				await transaction.getFromPool();
				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				expect(channelMock.invoke).toHaveBeenCalledWith('app:getTransactionsFromPool');
			});
		});

		describe('create', () => {
			describe('when called with a valid transaction', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(validTransaction, passphrase1);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called without module id and module name in input', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, moduleID: undefined }, passphrase1),
					).rejects.toThrow('Missing moduleID and moduleName');
				});
			});

			describe('when called without asset id and asset name in input', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, assetID: undefined }, passphrase1),
					).rejects.toThrow('Missing assetID and assetName');
				});
			});

			describe('when called with module name which does not exist', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create(
							{ ...validTransaction, moduleID: undefined, moduleName: 'newModule' },
							passphrase1,
						),
					).rejects.toThrow('Module corresponding to name newModule not registered.');
				});
			});

			describe('when called with asset name which does not exist', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create(
							{ ...validTransaction, assetID: undefined, assetName: 'newAsset' },
							passphrase1,
						),
					).rejects.toThrow('Asset corresponding to name newAsset not registered.');
				});
			});

			describe('when called without nonce in input and account does not support nonce either', () => {
				beforeEach(() => {
					(codec as any)['_compileSchemas'] = [];
				});
				afterEach(() => {
					(codec as any)['_compileSchemas'] = [];
				});
				it('should throw error', async () => {
					const updatedSchema = {
						...schema,
						account: {
							...schema.account,
							properties: {
								address: schema.account.properties.address,
								keys: schema.account.properties.keys,
							},
							required: ['address', 'keys'],
						},
					};
					transaction = new Transaction(channelMock, updatedSchema, nodeInfo);
					await expect(
						transaction.create({ ...validTransaction, nonce: undefined }, passphrase1),
					).rejects.toThrow('Unsupported account type');
				});
			});

			describe('when called with negative nonce in input', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, nonce: BigInt(-2452) }, passphrase1),
					).rejects.toThrow('Nonce must be greater or equal to zero');
				});
			});

			describe('when called with nonce equal to zero in input', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(
						{ ...validTransaction, nonce: BigInt(0) },
						passphrase1,
					);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called without sender public key in input', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(
						{ ...validTransaction, senderPublicKey: undefined },
						passphrase1,
					);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called with multi-signature account in input', () => {
				it('should return created tx', async () => {
					const multisigAccount = {
						address: Buffer.from('ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815', 'hex'),
						token: { balance: BigInt('100000000') },
						sequence: { nonce: BigInt('0') },
						keys: {
							numberOfSignatures: 1,
							mandatoryKeys: [publicKey1],
							optionalKeys: [publicKey2],
						},
					};
					const multisigAccountHex = codec.encode(accountSchema, multisigAccount);
					when(channelMock.invoke)
						.calledWith('app:getAccount', expect.anything())
						.mockResolvedValue(multisigAccountHex.toString('hex') as never);
					const returnedTx = await transaction.create(validTransaction, passphrase1);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called with optional keys in input', () => {
				it('should return created tx', async () => {
					const options = {
						includeSenderSignature: true,
						multisignatureKeys: {
							mandatoryKeys: [],
							optionalKeys: [publicKey2],
						},
					};
					const returnedTx = await transaction.create(validTransaction, passphrase1, options);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});
		});

		describe('sign', () => {
			describe('when called with a valid transation', () => {
				it('should return some signed transaction', () => {
					const returnedTx = transaction.sign(validTransaction, passphrases);
					expect(returnedTx).toBeDefined();
				});
			});

			describe('when called with multi-signature account in input', () => {
				it('should return created tx', async () => {
					const multisigAccount = {
						address: Buffer.from('ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815', 'hex'),
						token: { balance: BigInt('100000000') },
						sequence: { nonce: BigInt('0') },
						keys: {
							numberOfSignatures: 1,
							mandatoryKeys: [publicKey1],
							optionalKeys: [publicKey2],
						},
					};
					const multisigAccountHex = codec.encode(accountSchema, multisigAccount);
					when(channelMock.invoke)
						.calledWith('app:getAccount', expect.anything())
						.mockResolvedValue(multisigAccountHex.toString('hex') as never);
					const returnedTx = await transaction.sign(validTransaction, passphrases);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called with optional keys in input', () => {
				it('should return created tx', async () => {
					const options = {
						includeSenderSignature: true,
						multisignatureKeys: {
							mandatoryKeys: [],
							optionalKeys: [publicKey2],
						},
					};
					const returnedTx = await transaction.sign(validTransaction, passphrases, options);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});
		});

		describe('send', () => {
			it('should invoke app:postTransaction', async () => {
				const trxId = await transaction.send(tx);

				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				expect(channelMock.invoke).toHaveBeenCalledWith('app:postTransaction', {
					transaction: txHex,
				});
				expect(trxId).toEqual(txHex);
			});
		});

		describe('decode', () => {
			describe('transaction from input as buffer', () => {
				it('should return decoded transaction', () => {
					const decodedTx = transaction.decode(encodedTx);
					expect(decodedTx).toMatchSnapshot();
				});
			});

			describe('transaction from input as hex', () => {
				it('should return decoded transaction', () => {
					const decodedTx = transaction.decode(encodedTx.toString('hex'));
					expect(decodedTx).toMatchSnapshot();
				});
			});
		});

		describe('encode', () => {
			it('should return encoded transaction', () => {
				const returnedTx = transaction.encode(tx);
				expect(returnedTx).toEqual(encodedTx);
			});
		});

		describe('computeMinFee', () => {
			it('should return some value', () => {
				const fee = transaction.computeMinFee(tx);
				expect(fee).toBeDefined();
			});
		});

		describe('toJSON', () => {
			it('should return decoded transaction in JSON', () => {
				const txAsJSON = transaction.toJSON(tx);
				expect(() => JSON.parse(JSON.stringify(txAsJSON))).not.toThrow();
			});
		});

		describe('fromJSON', () => {
			it('should return decoded transaction in JSON', () => {
				const txCopy = { ...tx };
				(txCopy as any).id = txId;
				const txAsJSON = transaction.toJSON(txCopy);
				const txAsObject = transaction.fromJSON(txAsJSON);

				expect(txAsObject).toEqual(txCopy);
			});
		});
	});
});

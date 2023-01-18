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
import { address, legacy } from '@liskhq/lisk-cryptography';
import { Transaction } from '../../src/transaction';
import { metadata, nodeInfo, schema, tx } from '../utils/transaction';

describe('transaction', () => {
	let channelMock: any;
	let transaction: Transaction;
	const passphrases = [
		'trim elegant oven term access apple obtain error grain excite lawn neck',
		'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
	];
	const privateKeys = passphrases.map(p =>
		legacy.getPrivateAndPublicKeyFromPassphrase(p).privateKey.toString('hex'),
	);
	const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
	const privateKey1 = legacy
		.getPrivateAndPublicKeyFromPassphrase(passphrase1)
		.privateKey.toString('hex');
	const { publicKey: publicKey1 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase1);
	const publicKey2 = Buffer.from(
		'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		'hex',
	);
	const txHex =
		'0a05746f6b656e12087472616e7366657218362080ade2042a20dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a321d0880ade2041214654087c2df870402ab0b1996616fd3355d61f62c1a003a4079cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700';
	const encodedTx = Buffer.from(txHex, 'hex');

	const validTransaction = {
		module: 'token',
		command: 'transfer',
		nonce: '1',
		fee: '10000000',
		senderPublicKey: publicKey1.toString('hex'),
		params: {
			recipientAddress: 'lsk7tyskeefnd6p6bfksd7ytp5jyaw8f2r9foa6ch',
			amount: '4008489300000000',
			data: '',
		},
		signatures: [],
	};
	const validTransactionJSON = {
		id: tx.id,
		module: 'token',
		command: 'transfer',
		nonce: '1',
		fee: '10000000',
		senderPublicKey: publicKey1.toString('hex'),
		params: {
			recipientAddress: 'lsk7tyskeefnd6p6bfksd7ytp5jyaw8f2r9foa6ch',
			amount: '4008489300000000',
			data: '',
		},
	};
	const txId = Buffer.from(tx.id, 'hex');
	const txJSON = {
		...tx,
		nonce: tx.nonce.toString(),
		fee: tx.fee.toString(),
		senderPublicKey: tx.senderPublicKey.toString('hex'),
		signatures: tx.signatures.map(k => k.toString('hex')),
		params: {
			...tx.params,
			amount: tx.params.amount.toString(),
			recipientAddress: address.getLisk32AddressFromAddress(tx.params.recipientAddress),
		},
	};

	beforeEach(() => {
		channelMock = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};

		when(channelMock.invoke)
			.calledWith('auth_getAuthAccount', expect.anything())
			.mockResolvedValue({
				nonce: '1',
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			} as never)
			.calledWith('chain_getTransactionByID', expect.anything())
			.mockResolvedValue(validTransactionJSON as never)
			.calledWith('txpool_getTransactionsFromPool')
			.mockResolvedValue([validTransactionJSON] as never)
			.calledWith('txpool_postTransaction', expect.anything())
			.mockResolvedValue({ transactionId: tx.id } as never);

		transaction = new Transaction(channelMock, schema, metadata, nodeInfo);
	});

	describe('Transaction', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(transaction['_channel']).toBe(channelMock);
			});
		});

		describe('get', () => {
			describe('transaction by id as buffer', () => {
				it('should invoke chain_getTransactionByID', async () => {
					await transaction.get(txId);
					expect(channelMock.invoke).toHaveBeenCalledTimes(1);
					expect(channelMock.invoke).toHaveBeenCalledWith('chain_getTransactionByID', {
						id: txId.toString('hex'),
					});
				});
			});

			describe('transaction by id as hex', () => {
				it('should invoke chain_getTransactionByID', async () => {
					await transaction.get(txId.toString('hex'));
					expect(channelMock.invoke).toHaveBeenCalledTimes(1);
					expect(channelMock.invoke).toHaveBeenCalledWith('chain_getTransactionByID', {
						id: txId.toString('hex'),
					});
				});
			});
		});

		describe('getFromPool', () => {
			it('should invoke txpool_getTransactionsFromPool', async () => {
				await transaction.getFromPool();
				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				expect(channelMock.invoke).toHaveBeenCalledWith('txpool_getTransactionsFromPool');
			});
		});

		describe('create', () => {
			describe('when called with a valid transaction', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(validTransaction, privateKey1);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called with module name which does not exist', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, module: 'newModule' }, privateKey1),
					).rejects.toThrow('Module corresponding to name newModule not registered.');
				});
			});

			describe('when called with asset name which does not exist', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, command: 'newAsset' }, privateKey1),
					).rejects.toThrow('Command corresponding to name newAsset not registered.');
				});
			});

			describe('when called without nonce in input and account does not support nonce either', () => {
				it('should throw error', async () => {
					when(channelMock.invoke)
						.calledWith('auth_getAuthAccount', expect.anything())
						.mockRejectedValue(new Error('endpoint does not exist') as never);
					await expect(
						transaction.create({ ...validTransaction, nonce: undefined }, privateKey1),
					).rejects.toThrow('Auth module is not registered or does not have "getAuthAccount"');
				});
			});

			describe('when called with negative nonce in input', () => {
				it('should throw error', async () => {
					await expect(
						transaction.create({ ...validTransaction, nonce: BigInt(-2452) }, privateKey1),
					).rejects.toThrow('Nonce must be greater or equal to zero');
				});
			});

			describe('when called with nonce equal to zero in input', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(
						{ ...validTransaction, nonce: BigInt(0) },
						privateKey1,
					);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called without sender public key in input', () => {
				it('should return created tx', async () => {
					const returnedTx = await transaction.create(
						{ ...validTransaction, senderPublicKey: undefined },
						privateKey1,
					);
					expect(returnedTx.signatures).toHaveLength(1);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});

			describe('when called with multi-signature account in input', () => {
				it('should return created tx', async () => {
					const multisigAccount = {
						nonce: '0',
						numberOfSignatures: 1,
						mandatoryKeys: [publicKey1.toString('hex')],
						optionalKeys: [publicKey2.toString('hex')],
					};
					when(channelMock.invoke)
						.calledWith('auth_getAuthAccount', expect.anything())
						.mockResolvedValue(multisigAccount as never);
					const returnedTx = await transaction.create(validTransaction, privateKey1);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});
		});

		describe('sign', () => {
			describe('when called with a valid transation', () => {
				it('should return some signed transaction', () => {
					const returnedTx = transaction.sign(validTransaction, privateKeys);
					expect(returnedTx).toBeDefined();
				});
			});

			describe('when called with multi-signature account in input', () => {
				it('should return created tx', async () => {
					const multisigAccount = {
						nonce: '0',
						numberOfSignatures: 1,
						mandatoryKeys: [publicKey1.toString('hex')],
						optionalKeys: [publicKey2.toString('hex')],
					};
					when(channelMock.invoke)
						.calledWith('auth_getAuthAccount', expect.anything())
						.mockResolvedValue(multisigAccount as never);
					const returnedTx = await transaction.sign(validTransaction, privateKeys);
					expect(returnedTx.signatures).toHaveLength(2);
					expect(returnedTx.signatures).toMatchSnapshot();
				});
			});
		});

		describe('send', () => {
			it('should invoke txpool_postTransaction', async () => {
				const { transactionId } = await transaction.send(txJSON);

				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				expect(channelMock.invoke).toHaveBeenCalledWith('txpool_postTransaction', {
					transaction: txHex,
				});
				expect(transactionId).toEqual(tx.id);
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

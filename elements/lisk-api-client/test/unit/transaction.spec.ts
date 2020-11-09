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

import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { Channel } from '../../src/types';
import { Transaction } from '../../src/transaction';

describe('transaction', () => {
	let channel: Channel;
	let transaction: Transaction;
	const passphrases = ['trim elegant oven term access apple obtain error grain excite lawn neck'];
	const nodeInfo = {
		version:
			'3.0.0-beta.2.4-88b24e03bb28925a036293126dd96ac636218e29-6a1742532104af6f5c010e2ae77d3d982d471751.6a17425',
		networkVersion: '2.0',
		networkIdentifier: 'ccb837b25bc4f1b43fc08c2e80b07c6b46b84bf2264f6a37eaa4416fe478a0c5',
		lastBlockID: '57a669f7170239a68460af284eb1ba043839fe828be302b9c0e65fee498c954e',
		height: 276626,
		finalizedHeight: 276489,
		syncing: false,
		unconfirmedTransactions: 2243,
		genesisConfig: {
			blockTime: 10,
			maxPayloadLength: 15360,
			bftThreshold: 68,
			minFeePerByte: 1000,
			baseFees: [{ moduleID: 5, assetID: 0, baseFee: '1000000000' }],
			rewards: {
				milestones: ['500000000', '400000000', '300000000', '200000000', '100000000'],
				offset: 2160,
				distance: 3000000,
			},
			communityIdentifier: 'Lisk',
			minRemainingBalance: '5000000',
			activeDelegates: 101,
			standbyDelegates: 2,
			delegateListRoundOffset: 2,
		},
		registeredModules: [
			{
				id: 2,
				name: 'token',
				actions: [],
				events: [],
				reducers: [
					'token:credit',
					'token:debit',
					'token:getBalance',
					'token:getMinRemainingBalance',
				],
				transactionAssets: [{ id: 0, name: 'transfer' }],
			},
			{ id: 3, name: 'sequence', actions: [], events: [], reducers: [], transactionAssets: [] },
			{
				id: 4,
				name: 'keys',
				actions: [],
				events: [],
				reducers: [],
				transactionAssets: [{ id: 0, name: 'registerMultisignatureGroup' }],
			},
			{
				id: 5,
				name: 'dpos',
				actions: ['dpos:getAllDelegates'],
				events: [],
				reducers: [],
				transactionAssets: [
					{ id: 0, name: 'registerDelegate' },
					{ id: 1, name: 'voteDelegate' },
					{ id: 2, name: 'unlockToken' },
					{ id: 3, name: 'reportDelegateMisbehavior' },
				],
			},
			{
				id: 1000,
				name: 'legacyAccount',
				actions: [],
				events: [],
				reducers: [],
				transactionAssets: [{ id: 0, name: 'reclaimLSK' }],
			},
		],
	};
	const txHex =
		'0802100018362080ade2042a20dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a321d0880ade2041214654087c2df870402ab0b1996616fd3355d61f62c1a003a4079cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700';
	const encodedTx = Buffer.from(txHex, 'hex');
	const tx = {
		moduleID: 2,
		assetID: 0,
		nonce: BigInt('54'),
		fee: BigInt('10000000'),
		senderPublicKey: Buffer.from(
			'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
			'hex',
		),
		asset: {
			amount: BigInt('10000000'),
			recipientAddress: Buffer.from('654087c2df870402ab0b1996616fd3355d61f62c', 'hex'),
			data: '',
		},
		signatures: [
			Buffer.from(
				'79cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700',
				'hex',
			),
		],
		id: 'dd93e4ca5b48d0b604e7cf2e57ce21be43a3163f853c83d88d383032fd830bbf',
	};
	const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
	const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
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
	const schema = {
		account: {
			$id: '/account/base',
			type: 'object',
			properties: {
				address: { dataType: 'bytes', fieldNumber: 1 },
				token: {
					type: 'object',
					properties: { balance: { fieldNumber: 1, dataType: 'uint64' } },
					fieldNumber: 2,
				},
				sequence: {
					type: 'object',
					properties: { nonce: { fieldNumber: 1, dataType: 'uint64' } },
					fieldNumber: 3,
				},
				keys: {
					type: 'object',
					properties: {
						numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
						mandatoryKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
						optionalKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 3 },
					},
					fieldNumber: 4,
				},
				dpos: {
					type: 'object',
					properties: {
						delegate: {
							type: 'object',
							fieldNumber: 1,
							properties: {
								username: { dataType: 'string', fieldNumber: 1 },
								pomHeights: { type: 'array', items: { dataType: 'uint32' }, fieldNumber: 2 },
								consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
								lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
								isBanned: { dataType: 'boolean', fieldNumber: 5 },
								totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
							},
							required: [
								'username',
								'pomHeights',
								'consecutiveMissedBlocks',
								'lastForgedHeight',
								'isBanned',
								'totalVotesReceived',
							],
						},
						sentVotes: {
							type: 'array',
							fieldNumber: 2,
							items: {
								type: 'object',
								properties: {
									delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
									amount: { dataType: 'uint64', fieldNumber: 2 },
								},
								required: ['delegateAddress', 'amount'],
							},
						},
						unlocking: {
							type: 'array',
							fieldNumber: 3,
							items: {
								type: 'object',
								properties: {
									delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
									amount: { dataType: 'uint64', fieldNumber: 2 },
									unvoteHeight: { dataType: 'uint32', fieldNumber: 3 },
								},
								required: ['delegateAddress', 'amount', 'unvoteHeight'],
							},
						},
					},
					fieldNumber: 5,
				},
			},
			required: ['address', 'token', 'sequence', 'keys', 'dpos'],
		},
		block: {
			$id: '/block',
			type: 'object',
			properties: {
				header: { dataType: 'bytes', fieldNumber: 1 },
				payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
			},
			required: ['header', 'payload'],
		},
		blockHeader: {
			$id: '/block/header',
			type: 'object',
			properties: {
				version: { dataType: 'uint32', fieldNumber: 1 },
				timestamp: { dataType: 'uint32', fieldNumber: 2 },
				height: { dataType: 'uint32', fieldNumber: 3 },
				previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
				transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
				generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
				reward: { dataType: 'uint64', fieldNumber: 7 },
				asset: { dataType: 'bytes', fieldNumber: 8 },
				signature: { dataType: 'bytes', fieldNumber: 9 },
			},
			required: [
				'version',
				'timestamp',
				'height',
				'previousBlockID',
				'transactionRoot',
				'generatorPublicKey',
				'reward',
				'asset',
			],
		},
		blockHeadersAssets: {
			0: {
				$id: '/genesisBlock/header/asset',
				type: 'object',
				required: ['accounts', 'initDelegates', 'initRounds'],
				properties: {
					accounts: {
						type: 'array',
						fieldNumber: 1,
						items: {
							$id: '/account/base',
							type: 'object',
							properties: {
								address: { dataType: 'bytes', fieldNumber: 1 },
								token: {
									type: 'object',
									properties: { balance: { fieldNumber: 1, dataType: 'uint64' } },
									fieldNumber: 2,
								},
								sequence: {
									type: 'object',
									properties: { nonce: { fieldNumber: 1, dataType: 'uint64' } },
									fieldNumber: 3,
								},
								keys: {
									type: 'object',
									properties: {
										numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
										mandatoryKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
										optionalKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 3 },
									},
									fieldNumber: 4,
								},
								dpos: {
									type: 'object',
									properties: {
										delegate: {
											type: 'object',
											fieldNumber: 1,
											properties: {
												username: { dataType: 'string', fieldNumber: 1 },
												pomHeights: {
													type: 'array',
													items: { dataType: 'uint32' },
													fieldNumber: 2,
												},
												consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
												lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
												isBanned: { dataType: 'boolean', fieldNumber: 5 },
												totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
											},
											required: [
												'username',
												'pomHeights',
												'consecutiveMissedBlocks',
												'lastForgedHeight',
												'isBanned',
												'totalVotesReceived',
											],
										},
										sentVotes: {
											type: 'array',
											fieldNumber: 2,
											items: {
												type: 'object',
												properties: {
													delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
													amount: { dataType: 'uint64', fieldNumber: 2 },
												},
												required: ['delegateAddress', 'amount'],
											},
										},
										unlocking: {
											type: 'array',
											fieldNumber: 3,
											items: {
												type: 'object',
												properties: {
													delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
													amount: { dataType: 'uint64', fieldNumber: 2 },
													unvoteHeight: { dataType: 'uint32', fieldNumber: 3 },
												},
												required: ['delegateAddress', 'amount', 'unvoteHeight'],
											},
										},
									},
									fieldNumber: 5,
								},
							},
							required: ['address', 'token', 'sequence', 'keys', 'dpos'],
						},
					},
					initDelegates: {
						type: 'array',
						items: { dataType: 'bytes' },
						fieldNumber: 2,
						minItems: 1,
					},
					initRounds: { dataType: 'uint32', fieldNumber: 3, minimum: 3 },
				},
			},
			2: {
				$id: '/blockHeader/asset/v2',
				type: 'object',
				properties: {
					maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
					maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
					seedReveal: { dataType: 'bytes', minLength: 16, maxLength: 16, fieldNumber: 3 },
				},
				required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
			},
		},
		transaction: {
			$id: 'lisk/transaction',
			type: 'object',
			required: ['moduleID', 'assetID', 'nonce', 'fee', 'senderPublicKey', 'asset'],
			properties: {
				moduleID: { dataType: 'uint32', fieldNumber: 1, minimum: 2 },
				assetID: { dataType: 'uint32', fieldNumber: 2 },
				nonce: { dataType: 'uint64', fieldNumber: 3 },
				fee: { dataType: 'uint64', fieldNumber: 4 },
				senderPublicKey: { dataType: 'bytes', fieldNumber: 5, minLength: 32, maxLength: 32 },
				asset: { dataType: 'bytes', fieldNumber: 6 },
				signatures: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 7 },
			},
		},
		transactionsAssets: [
			{
				moduleID: 2,
				moduleName: 'token',
				assetID: 0,
				assetName: 'transfer',
				schema: {
					$id: 'lisk/transfer-asset',
					title: 'Transfer transaction asset',
					type: 'object',
					required: ['amount', 'recipientAddress', 'data'],
					properties: {
						amount: { dataType: 'uint64', fieldNumber: 1 },
						recipientAddress: { dataType: 'bytes', fieldNumber: 2, minLength: 20, maxLength: 20 },
						data: { dataType: 'string', fieldNumber: 3, minLength: 0, maxLength: 64 },
					},
				},
			},
			{
				moduleID: 4,
				moduleName: 'keys',
				assetID: 0,
				assetName: 'registerMultisignatureGroup',
				schema: {
					$id: 'lisk/keys/register',
					type: 'object',
					required: ['numberOfSignatures', 'optionalKeys', 'mandatoryKeys'],
					properties: {
						numberOfSignatures: { dataType: 'uint32', fieldNumber: 1, minimum: 1, maximum: 64 },
						mandatoryKeys: {
							type: 'array',
							items: { dataType: 'bytes', minLength: 32, maxLength: 32 },
							fieldNumber: 2,
							minItems: 0,
							maxItems: 64,
						},
						optionalKeys: {
							type: 'array',
							items: { dataType: 'bytes', minLength: 32, maxLength: 32 },
							fieldNumber: 3,
							minItems: 0,
							maxItems: 64,
						},
					},
				},
			},
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 0,
				assetName: 'registerDelegate',
				schema: {
					$id: 'lisk/dpos/register',
					type: 'object',
					required: ['username'],
					properties: {
						username: { dataType: 'string', fieldNumber: 1, minLength: 1, maxLength: 20 },
					},
				},
			},
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 1,
				assetName: 'voteDelegate',
				schema: {
					$id: 'lisk/dpos/vote',
					type: 'object',
					required: ['votes'],
					properties: {
						votes: {
							type: 'array',
							minItems: 1,
							maxItems: 20,
							items: {
								type: 'object',
								required: ['delegateAddress', 'amount'],
								properties: {
									delegateAddress: {
										dataType: 'bytes',
										fieldNumber: 1,
										minLength: 20,
										maxLength: 20,
									},
									amount: { dataType: 'sint64', fieldNumber: 2 },
								},
							},
							fieldNumber: 1,
						},
					},
				},
			},
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 2,
				assetName: 'unlockToken',
				schema: {
					$id: 'lisk/dpos/unlock',
					type: 'object',
					required: ['unlockObjects'],
					properties: {
						unlockObjects: {
							type: 'array',
							minItems: 1,
							maxItems: 20,
							items: {
								type: 'object',
								required: ['delegateAddress', 'amount', 'unvoteHeight'],
								properties: {
									delegateAddress: {
										dataType: 'bytes',
										fieldNumber: 1,
										minLength: 20,
										maxLength: 20,
									},
									amount: { dataType: 'uint64', fieldNumber: 2 },
									unvoteHeight: { dataType: 'uint32', fieldNumber: 3 },
								},
							},
							fieldNumber: 1,
						},
					},
				},
			},
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 3,
				assetName: 'reportDelegateMisbehavior',
				schema: {
					$id: 'lisk/dpos/pom',
					type: 'object',
					required: ['header1', 'header2'],
					properties: {
						header1: {
							$id: 'lisk/block-header',
							type: 'object',
							properties: {
								version: { dataType: 'uint32', fieldNumber: 1 },
								timestamp: { dataType: 'uint32', fieldNumber: 2 },
								height: { dataType: 'uint32', fieldNumber: 3 },
								previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
								transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
								generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
								reward: { dataType: 'uint64', fieldNumber: 7 },
								asset: {
									type: 'object',
									fieldNumber: 8,
									properties: {
										maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
										maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
										seedReveal: { dataType: 'bytes', fieldNumber: 3 },
									},
									required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
								},
								signature: { dataType: 'bytes', fieldNumber: 9 },
							},
							required: [
								'version',
								'timestamp',
								'height',
								'previousBlockID',
								'transactionRoot',
								'generatorPublicKey',
								'reward',
								'asset',
							],
							fieldNumber: 1,
						},
						header2: {
							$id: 'lisk/block-header',
							type: 'object',
							properties: {
								version: { dataType: 'uint32', fieldNumber: 1 },
								timestamp: { dataType: 'uint32', fieldNumber: 2 },
								height: { dataType: 'uint32', fieldNumber: 3 },
								previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
								transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
								generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
								reward: { dataType: 'uint64', fieldNumber: 7 },
								asset: {
									type: 'object',
									fieldNumber: 8,
									properties: {
										maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
										maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
										seedReveal: { dataType: 'bytes', fieldNumber: 3 },
									},
									required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
								},
								signature: { dataType: 'bytes', fieldNumber: 9 },
							},
							required: [
								'version',
								'timestamp',
								'height',
								'previousBlockID',
								'transactionRoot',
								'generatorPublicKey',
								'reward',
								'asset',
							],
							fieldNumber: 2,
						},
					},
				},
			},
			{
				moduleID: 1000,
				moduleName: 'legacyAccount',
				assetID: 0,
				assetName: 'reclaimLSK',
				schema: {
					$id: 'lisk/legacyAccount/reclaim',
					title: 'Reclaim transaction asset',
					type: 'object',
					required: ['amount'],
					properties: { amount: { dataType: 'uint64', fieldNumber: 1 } },
				},
			},
		],
	};

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn().mockResolvedValue(txHex),
			subscribe: jest.fn(),
		};
		transaction = new Transaction(channel, schema, nodeInfo);
	});

	describe('Transaction', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(transaction['_channel']).toBe(channel);
			});
		});

		describe('get', () => {
			it('should invoke app:getTransactionByID', async () => {
				// Act
				await transaction.get(txId);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:getTransactionByID', {
					id: txId.toString('hex'),
				});
			});
		});

		describe('getFromPool', () => {
			it('should invoke app:getTransactionsFromPool', async () => {
				// Act
				await transaction.getFromPool();

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:getTransactionsFromPool');
			});
		});

		describe('create', () => {
			it('should return created tx', () => {
				// Act
				const returnedTx = transaction.create(validTransaction, passphrase1);

				// Assert
				expect(returnedTx).toEqual(encodedTx);
			});
		});

		describe('sign', () => {
			it('should return some signed transaction', () => {
				// Act
				const returnedTx = transaction.sign(validTransaction, passphrases);

				// Assert
				expect(returnedTx).toBeDefined();
			});
		});

		describe('send', () => {
			it('should invoke app:postTransaction', async () => {
				// Act
				await transaction.send(tx);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:postTransaction', { transaction: txHex });
			});
		});

		describe('decode', () => {
			it('should return decoded transaction', () => {
				// Act
				const decodedTx = transaction.decode(encodedTx);

				// Assert
				expect(decodedTx).toEqual(tx);
			});
		});

		describe('encode', () => {
			it('should return encoded transaction', () => {
				// Act
				const returnedTx = transaction.encode(tx);

				// Assert
				expect(returnedTx).toEqual(encodedTx);
			});
		});

		describe('getMinFee', () => {
			it('should return some value', () => {
				// Act
				const fee = transaction.getMinFee(tx);

				// Assert
				expect(fee).toBeDefined();
			});
		});
	});
});

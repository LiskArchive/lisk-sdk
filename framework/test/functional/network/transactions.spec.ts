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
 */
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209
// import { codec } from '@liskhq/lisk-codec';
// import { utils } from '@liskhq/lisk-cryptography';
// import { P2P, events, p2pTypes } from '@liskhq/lisk-p2p';

// import { Application } from '../../../src';
// import {
// 	createApplication,
// 	closeApplication,
// 	getPeerID,
// 	waitNBlocks,
// 	sendTransaction,
// 	getTransactionsFromNetwork,
// } from '../utils/application';
// import { createProbe } from '../utils/probe';
// import { genesis, DefaultAccountProps } from '../../fixtures';
// import { nodeUtils } from '../../utils';
// import { createTransferTransaction } from '../../utils/mocks/transaction';
// import { transactionIdsSchema, transactionsSchema } from '../../../src/node/transport/schemas';

// describe('Public transaction related P2P endpoints', () => {
// 	let app: Application;
// 	let p2p: P2P;

// 	beforeAll(async () => {
// 		app = await createApplication('network-transactions');
// 		p2p = await createProbe({
// 			chainID: app.chainID.toString('hex'),
// 			networkVersion: app.config.networkVersion,
// 			port: app.config.network.port,
// 		});
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getTransactions', () => {
// 		it('should return empty array if unknown transaction is queried', async () => {
// 			// Act
// 			const { transactions } = await getTransactionsFromNetwork(app, p2p, [
// 				utils.getRandomBytes(32),
// 			]);

// 			// Assert
// 			expect(transactions).toHaveLength(0);
// 		});

// 		it('should return transaction if known transaction id is queried', async () => {
// 			// Arrange & Act
// 			const sendTx = await sendTransaction(app);
// 			await waitNBlocks(app, 1);
// 			const { transactions } = await getTransactionsFromNetwork(app, p2p, [sendTx.id]);

// 			// Assert
// 			expect(transactions).toHaveLength(1);
// 		});
// 	});

// 	describe('postTransactionsAnnouncement', () => {
// 		it('should request announced transaction', async () => {
// 			// Arrange & Act
// 			const genesisAccount = await app['_node'][
// 				'_chain'
// 			].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
// 			const accountWithoutBalance = nodeUtils.createAccount();
// 			const tx = createTransferTransaction({
// 				nonce: genesisAccount.sequence.nonce,
// 				fee: BigInt('200000'),
// 				recipientAddress: accountWithoutBalance.address,
// 				amount: BigInt('10000000000'),
// 				chainID: app['_node']['_chainID'],
// 				privateKey: Buffer.from(genesis.privateKey, 'hex'),
// 			});
// 			const transactionIdsBuffer = codec.encode(transactionIdsSchema, {
// 				transactionIds: [tx.id],
// 			});
// 			p2p.sendToPeer(
// 				{
// 					event: 'postTransactionsAnnouncement',
// 					data: transactionIdsBuffer,
// 				},
// 				getPeerID(app),
// 			);

// 			const request = await new Promise<p2pTypes.P2PRequestPacket>(resolve => {
// 				p2p.on(events.EVENT_REQUEST_RECEIVED, (req: any) => {
// 					req.end({ transaction: tx.getBytes() });
// 					resolve(req);
// 				});
// 			});
// 			expect(request.procedure).toEqual('getTransactions');
// 			expect((request as any).data).toBeInstanceOf(Buffer);
// 			expect(codec.decode(transactionsSchema, (request as any).data)).toMatchObject({
// 				transactions: [tx.id],
// 			});
// 		});
// 	});
// });

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
import { P2P, events, p2pTypes } from '@liskhq/lisk-p2p';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { Application } from '../../../../src';
import {
	createApplication,
	closeApplication,
	getPeerID,
	waitNBlocks,
	sendTransaction,
} from '../../utils/application';
import { createProbe } from '../../utils/probe';
import { genesis } from '../../../fixtures';
import { nodeUtils } from '../../../utils';

describe('Public transaction related P2P endpoints', () => {
	let app: Application;
	let p2p: P2P;

	beforeAll(async () => {
		app = await createApplication('network-transactions');
		p2p = await createProbe(app.config);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('getTransactions', () => {
		it('should return empty array if unknown transaction is queried', async () => {
			const { data } = (await p2p.requestFromPeer(
				{
					procedure: 'getTransactions',
					data: {
						transactionIds: [getRandomBytes(32).toString('base64')],
					},
				},
				getPeerID(app),
			)) as { data: { transactions: string[] } };
			expect(data.transactions).toHaveLength(0);
		});

		it('should return transaction if known transaction id is queried', async () => {
			const sendTx = await sendTransaction(app);
			await waitNBlocks(app, 1);
			const { data } = (await p2p.requestFromPeer(
				{
					procedure: 'getTransactions',
					data: {
						transactionIds: [sendTx.id.toString('base64')],
					},
				},
				getPeerID(app),
			)) as { data: { transactions: string[] } };
			expect(data.transactions).toHaveLength(1);
		});
	});

	describe('postTransactionsAnnouncement', () => {
		it('should request announced transaction', async () => {
			const genesisAccount = await app['_node'][
				'_chain'
			].dataAccess.getAccountByAddress(genesis.address);
			const accountWithoutBalance = nodeUtils.createAccount();
			const tx = new TransferTransaction({
				nonce: genesisAccount.nonce,
				senderPublicKey: genesis.publicKey,
				fee: BigInt('200000'),
				asset: {
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					data: '',
				},
			});
			tx.sign(app['_node']['_networkIdentifier'], genesis.passphrase);
			p2p.sendToPeer(
				{
					event: 'postTransactionsAnnouncement',
					data: { transactionIds: [tx.id.toString('base64')] },
				},
				getPeerID(app),
			);

			const request = await new Promise<p2pTypes.P2PRequestPacket>(resolve => {
				p2p.on(events.EVENT_REQUEST_RECEIVED, (req: any) => {
					req.end({ transaction: tx.getBytes().toString('base64') });
					resolve(req);
				});
			});
			expect(request.procedure).toEqual('getTransactions');
			expect((request as any).data.transactionIds[0]).toEqual(
				tx.id.toString('base64'),
			);
		});
	});
});

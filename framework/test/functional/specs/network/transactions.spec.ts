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
import { P2P } from '@liskhq/lisk-p2p';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { Application } from '../../../../src';
import {
	createApplication,
	closeApplication,
	getPeerID,
	waitNBlocks,
	sendTransaction,
} from '../../utils/application';
import { createProbe } from '../../utils/probe';

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
		it('should be rejected if unknown transaction is queried', async () => {
			await expect(
				p2p.requestFromPeer(
					{
						procedure: 'getTransactions',
						data: {
							transactionIds: [getRandomBytes(32).toString('base64')],
						},
					},
					getPeerID(app),
				),
			).rejects.toThrow('does not exist');
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
});

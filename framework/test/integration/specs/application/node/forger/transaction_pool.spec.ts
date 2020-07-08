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

import { KVStore } from '@liskhq/lisk-db';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { nodeUtils } from '../../../../../utils';
import { createDB, removeDB } from '../../../../../utils/kv_store';
import { genesis } from '../../../../../fixtures';

describe('Transaction pool', () => {
	const dbName = 'transaction_pool';
	let node: any;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
	});

	afterAll(async () => {
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given a valid transaction while forging is disabled', () => {
		let transaction: any;

		beforeAll(async () => {
			const genesisAccount = await node._chain.dataAccess.getAccountByAddress(genesis.address);
			const account = nodeUtils.createAccount();
			transaction = new TransferTransaction({
				nonce: genesisAccount.nonce,
				senderPublicKey: genesis.publicKey,
				fee: BigInt('200000'),
				asset: {
					recipientAddress: account.address,
					amount: BigInt('100000000000'),
					data: '',
				},
			});
			transaction.sign(Buffer.from(node._networkIdentifier, 'hex'), genesis.passphrase);
			await node._transport.handleEventPostTransaction({
				transaction: transaction.getBytes().toString('base64'),
			});
		});

		describe('when transaction is pass to the transaction pool', () => {
			it('should be added to the transaction pool', () => {
				expect(node._transactionPool.contains(transaction.id)).toBeTrue();
			});

			// TODO: Fix this test after implementing expireTransactions
			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should expire after X sec', async () => {
				const tx = node._transactionPool.get(transaction.id);
				// Mutate received at to be expired (3 hours + 1s)
				tx.receivedAt = new Date(Date.now() - 10801000);
				// Forcefully call expire
				await node._transactionPool.pool.expireTransactions();
				expect(node._transactionPool.contains(transaction.id)).toBeFalse();
			});
		});
	});
});

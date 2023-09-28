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

import { Database } from '@liskhq/lisk-db';
import { Transaction } from '@liskhq/lisk-chain';
import { nodeUtils } from '../../../utils';
import { createDB, removeDB } from '../../../utils/kv_store';
import { genesis } from '../../../fixtures';
import { createTransferTransaction } from '../../../utils/node/transaction';

describe('Transaction pool', () => {
	const dbName = 'transaction_pool';
	let node: any;
	let blockchainDB: Database;
	let forgerDB: Database;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
	});

	afterAll(async () => {
		await node.cleanup();
		blockchainDB.close();
		forgerDB.close();
		removeDB(dbName);
	});

	describe('given a valid transaction while forging is disabled', () => {
		let transaction: Transaction;

		beforeAll(async () => {
			const genesisAccount = await node._chain.dataAccess.getAccountByAddress(genesis.address);
			const account = nodeUtils.createAccount();
			transaction = createTransferTransaction({
				nonce: genesisAccount.sequence.nonce,
				recipientAddress: account.address,
				amount: BigInt('100000000000'),
				networkIdentifier: Buffer.from(node._networkIdentifier, 'hex'),
				passphrase: genesis.passphrase,
			});
			await node._transport.handleEventPostTransaction({
				transaction: transaction.getBytes().toString('hex'),
			});
		});

		describe('when transaction is pass to the transaction pool', () => {
			it('should be added to the transaction pool', () => {
				expect(node._transactionPool.contains(transaction.id)).toBeTrue();
			});

			it('should expire after X sec', async () => {
				const tx = node._transactionPool.get(transaction.id);
				// Mutate received at to be expired (3 hours + 1s)
				tx.receivedAt = new Date(Date.now() - 10801000);
				// Forcefully call expire
				await node._transactionPool._expire();
				expect(node._transactionPool.contains(transaction.id)).toBeFalse();
			});
		});
	});
});

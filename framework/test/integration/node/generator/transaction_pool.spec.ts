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
import { Transaction } from '@liskhq/lisk-chain';
import * as testing from '../../../../src/testing';
import { nodeUtils } from '../../../utils';
import { createTransferTransaction } from '../../../utils/mocks/transaction';

describe('Transaction pool', () => {
	const databasePath = '/tmp/lisk/generator/transaction_pool';
	const genesis = testing.fixtures.defaultFaucetAccount;

	let processEnv: testing.BlockProcessingEnv;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('given a valid transaction while generation is disabled', () => {
		let transaction: Transaction;

		beforeAll(async () => {
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const account = nodeUtils.createAccount();
			transaction = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: account.address,
				amount: BigInt('100000000000'),
				chainID: processEnv.getChainID(),
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
			});
			await processEnv.getGenerator()['_pool'].add(transaction);
		});

		describe('when transaction is pass to the transaction pool', () => {
			it('should be added to the transaction pool', () => {
				expect(processEnv.getGenerator()['_pool'].contains(transaction.id)).toBeTrue();
			});

			it('should expire after X sec', async () => {
				const tx = processEnv.getGenerator()['_pool'].get(transaction.id);
				// Mutate received at to be expired (3 hours + 1s)
				(tx as any).receivedAt = new Date(Date.now() - 10801000);
				// Forcefully call expire
				await processEnv.getGenerator()['_pool']['_expire']();
				expect(processEnv.getGenerator()['_pool'].contains(transaction.id)).toBeFalse();
			});
		});
	});
});

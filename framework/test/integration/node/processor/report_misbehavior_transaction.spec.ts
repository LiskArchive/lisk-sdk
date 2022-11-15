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
import { Block, BlockHeader } from '@liskhq/lisk-chain';

import { nodeUtils } from '../../../utils';
import {
	createTransferTransaction,
	createReportMisbehaviorTransaction,
	defaultTokenID,
} from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';
import { Keys } from '../../../../src/testing/fixtures';

describe('Transaction order', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;
	let blockGenerator: Keys;
	let newBlock: Block;
	let senderAccount: ReturnType<typeof nodeUtils.createAccount>;
	const databasePath = '/tmp/lisk/report_misbehavior/test';
	const genesis = testing.fixtures.defaultFaucetAccount;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		chainID = processEnv.getChainID();
		blockGenerator = await processEnv.getNextValidatorKeys(processEnv.getLastBlock().header);
		// Fund sender account
		const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: genesis.address,
		});
		senderAccount = nodeUtils.createAccount();
		const transaction = createTransferTransaction({
			nonce: BigInt(authData.nonce),
			recipientAddress: senderAccount.address,
			amount: BigInt('10000000000'),
			chainID,
			privateKey: Buffer.from(genesis.privateKey, 'hex'),
			fee: BigInt(170000), // minFee not to give fee for generator
		});
		newBlock = await processEnv.createBlock([transaction]);

		await processEnv.process(newBlock);
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('when report misbehavior transaction is submitted against the delegate', () => {
		it('should accept the block with transaction', async () => {
			// get last block
			const { header } = processEnv.getLastBlock();
			// create report misbehavior against last block
			const conflictingHeader = new BlockHeader({
				...header.toObject(),
				height: 100,
			});
			conflictingHeader.sign(chainID, Buffer.from(blockGenerator.plain.generatorPrivateKey, 'hex'));
			const originalBalance = await processEnv.invoke<{ availableBalance: string }>(
				'token_getBalance',
				{
					address: blockGenerator.address,
					tokenID: defaultTokenID(processEnv.getChainID()).toString('hex'),
				},
			);

			const tx = createReportMisbehaviorTransaction({
				nonce: BigInt(0),
				privateKey: senderAccount.privateKey,
				header1: header,
				header2: conflictingHeader,
				chainID,
			});
			// create a block and process them
			const nextBlock = await processEnv.createBlock([tx]);

			await processEnv.process(nextBlock);
			const updatedDelegate = await processEnv.invoke<{ pomHeights: number[] }>(
				'dpos_getDelegate',
				{
					address: blockGenerator.address,
				},
			);
			expect(updatedDelegate.pomHeights).toHaveLength(1);
			const balance = await processEnv.invoke<{ availableBalance: string }>('token_getBalance', {
				address: blockGenerator.address,
				tokenID: defaultTokenID(processEnv.getChainID()).toString('hex'),
			});
			expect(balance.availableBalance).toEqual(
				(BigInt(originalBalance.availableBalance) - BigInt(100000000)).toString(),
			);
		});
	});
});

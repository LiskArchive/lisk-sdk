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
import { Block, TAG_BLOCK_HEADER } from '@liskhq/lisk-chain';
import { signData, getAddressFromPassphrase } from '@liskhq/lisk-cryptography';

import { nodeUtils } from '../../../utils';
import { DefaultAccountProps } from '../../../fixtures';
import {
	createTransferTransaction,
	createReportMisbehaviorTransaction,
} from '../../../utils/node/transaction';
import * as testing from '../../../../src/testing';

describe('Transaction order', () => {
	let processEnv: testing.BlockProcessingEnv;
	let networkIdentifier: Buffer;
	let blockGenerator: string;
	let newBlock: Block;
	let senderAccount: { address: Buffer; passphrase: string };
	const databasePath = '/tmp/lisk/report_misbehavior/test';

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		networkIdentifier = processEnv.getNetworkId();
		blockGenerator = await processEnv.getNextValidatorPassphrase(processEnv.getLastBlock().header);
		// Fund sender account
		const genesisAccount = await processEnv
			.getDataAccess()
			.getAccountByAddress<DefaultAccountProps>(testing.fixtures.defaultFaucetAccount.address);
		senderAccount = nodeUtils.createAccount();
		const transaction = createTransferTransaction({
			nonce: genesisAccount.sequence.nonce,
			recipientAddress: senderAccount.address,
			amount: BigInt('10000000000'),
			networkIdentifier,
			passphrase: testing.fixtures.defaultFaucetAccount.passphrase,
			fee: BigInt(142000), // minFee not to give fee for generator
		});
		newBlock = await processEnv.createBlock([transaction]);

		await processEnv.process(newBlock);
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('when report misbehavior transaction is submitted against the delegate', () => {
		it('should accept the block with transaction', async () => {
			// get last block
			const { header } = processEnv.getLastBlock();
			// create report misbehavior against last block
			const conflictingBlockHeader = {
				...header,
				height: 100,
			};
			const conflictingBytes = processEnv
				.getDataAccess()
				.encodeBlockHeader(conflictingBlockHeader, true);
			const signature = signData(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				conflictingBytes,
				blockGenerator,
			);
			const tx = createReportMisbehaviorTransaction({
				nonce: BigInt(0),
				passphrase: senderAccount.passphrase,
				header1: header,
				header2: {
					...conflictingBlockHeader,
					signature,
				},
				networkIdentifier,
			});
			// create a block and process them
			const nextBlock = await processEnv.createBlock([tx]);

			await processEnv.process(nextBlock);
			const updatedDelegate = await processEnv
				.getDataAccess()
				.getAccountByAddress<DefaultAccountProps>(getAddressFromPassphrase(blockGenerator));
			expect(updatedDelegate.dpos.delegate.pomHeights).toHaveLength(1);
			expect(updatedDelegate.token.balance).toEqual(BigInt(0));
		});
	});
});

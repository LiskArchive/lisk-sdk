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
import { Chain } from '@liskhq/lisk-chain';

import { nodeUtils } from '../../../utils';
import { createTransferTransaction } from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';
import {
	clearBlocksTempTable,
	deleteBlocksAfterHeight,
	restoreBlocks,
} from '../../../../src/engine/consensus/synchronizer/utils';

describe('Temp block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chain: Chain;
	let chainID: Buffer;
	const genesis = testing.fixtures.defaultFaucetAccount;
	const databasePath = '/tmp/lisk/temp_block/test';
	const numberOfValidators = 103;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		chainID = processEnv.getChainID();
		chain = processEnv.getChain();
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('given a blockchain with more than 3 rounds', () => {
		describe('when deleting 100 blocks and saving to the temp blocks chain', () => {
			it('should successfully store to temp block and restore from temp block', async () => {
				const targetHeight = processEnv.getLastBlock().header.height + numberOfValidators * 3;
				while (chain.lastBlock.header.height < targetHeight) {
					const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
						address: genesis.address,
					});
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: BigInt(authData.nonce),
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('1000000000'),
						chainID,
						privateKey: Buffer.from(genesis.privateKey, 'hex'),
					});
					const nextBlock = await processEnv.createBlock([tx]);
					await processEnv.process(nextBlock);
				}
				const deleteUptoHeight = processEnv.getConsensus().finalizedHeight();
				await deleteBlocksAfterHeight(
					processEnv.getConsensus()['_createBlockExecutor'](),
					chain,
					testing.mocks.loggerMock,
					deleteUptoHeight,
					true,
				);
				expect(chain.lastBlock.header.height).toEqual(deleteUptoHeight);
				const result = await restoreBlocks(
					chain,
					processEnv.getConsensus()['_createBlockExecutor'](),
				);
				expect(result).toBeTrue();
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
				await clearBlocksTempTable(chain);
			});

			it('should successfully store to temp block and build new chain on top', async () => {
				const targetHeight = numberOfValidators * 3;
				while (chain.lastBlock.header.height < targetHeight) {
					const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
						address: genesis.address,
					});
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: BigInt(authData.nonce),
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('1000000000'),
						chainID,
						privateKey: Buffer.from(genesis.privateKey, 'hex'),
					});
					const nextBlock = await processEnv.createBlock([tx]);
					await processEnv.process(nextBlock);
				}
				const deleteUptoHeight = processEnv.getConsensus().finalizedHeight();
				await deleteBlocksAfterHeight(
					processEnv.getConsensus()['_createBlockExecutor'](),
					chain,
					testing.mocks.loggerMock,
					deleteUptoHeight,
					true,
				);
				expect(chain.lastBlock.header.height).toEqual(deleteUptoHeight);

				// Act
				while (chain.lastBlock.header.height < targetHeight) {
					const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
						address: genesis.address,
					});
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: BigInt(authData.nonce),
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('1000000000'),
						chainID,
						privateKey: Buffer.from(genesis.privateKey, 'hex'),
					});
					// every validators update the maxHeightGenerated to avoid contradicting block
					await processEnv.createBlock();
					const nextBlock = await processEnv.createBlock([tx]);
					await processEnv.process(nextBlock);
				}
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
				// Restore last temp block
				await deleteBlocksAfterHeight(
					processEnv.getConsensus()['_createBlockExecutor'](),
					chain,
					testing.mocks.loggerMock,
					deleteUptoHeight,
				);
				const result = await restoreBlocks(
					chain,
					processEnv.getConsensus()['_createBlockExecutor'](),
				);
				expect(result).toBeTrue();
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
			});
		});
	});
});

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
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { createTransferTransaction } from '../../../utils/node/transaction';
import {
	restoreBlocks,
	deleteBlocksAfterHeight,
	clearBlocksTempTable,
} from '../../../../src/node/synchronizer/utils';
import * as testing from '../../../../src/testing';
import { Processor } from '../../../../src/node/processor';

jest.setTimeout(30000);

describe('Temp block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chain: Chain;
	let processor: Processor;
	let networkIdentifier: Buffer;
	const databasePath = '/tmp/lisk/temp_block/test';

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		networkIdentifier = processEnv.getNetworkId();
		chain = processEnv.getChain();
		processor = processEnv.getProcessor();
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('given a blockchain with more than 3 rounds', () => {
		describe('when deleting 100 blocks and saving to the temp blocks chain', () => {
			it('should successfully store to temp block and restore from temp block', async () => {
				const targetHeight = processEnv.getLastBlock().header.height + chain.numberOfValidators * 3;
				while (chain.lastBlock.header.height < targetHeight) {
					const genesisAccount = await chain.dataAccess.getAccountByAddress<DefaultAccountProps>(
						genesis.address,
					);
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: genesisAccount.sequence.nonce,
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('10000000000'),
						networkIdentifier,
						passphrase: genesis.passphrase,
					});
					const nextBlock = await processEnv.createBlock([tx]);
					await processor.processValidated(nextBlock);
				}
				const deleteUptoHeight = 1;
				await deleteBlocksAfterHeight(
					processor,
					chain,
					testing.mocks.loggerMock,
					deleteUptoHeight,
					true,
				);
				expect(chain.lastBlock.header.height).toEqual(deleteUptoHeight);
				const result = await restoreBlocks(chain, processor);
				expect(result).toBeTrue();
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
				await clearBlocksTempTable(chain);
			});

			it('should successfully store to temp block and build new chain on top', async () => {
				const targetHeight = chain.lastBlock.header.height + chain.numberOfValidators * 3;
				while (chain.lastBlock.header.height < targetHeight) {
					const genesisAccount = await chain.dataAccess.getAccountByAddress<DefaultAccountProps>(
						genesis.address,
					);
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: genesisAccount.sequence.nonce,
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('10000000000'),
						networkIdentifier,
						passphrase: genesis.passphrase,
					});
					const nextBlock = await processEnv.createBlock([tx]);
					await processor.processValidated(nextBlock);
				}
				const deleteUptoHeight = processor['_bft'].finalizedHeight;
				await deleteBlocksAfterHeight(
					processor,
					chain,
					testing.mocks.loggerMock,
					deleteUptoHeight,
					true,
				);
				expect(chain.lastBlock.header.height).toEqual(deleteUptoHeight);

				// Act
				while (chain.lastBlock.header.height < targetHeight) {
					const genesisAccount = await chain.dataAccess.getAccountByAddress<DefaultAccountProps>(
						genesis.address,
					);
					const accountWithoutBalance = nodeUtils.createAccount();
					const tx = createTransferTransaction({
						nonce: genesisAccount.sequence.nonce,
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('10000000000'),
						networkIdentifier,
						passphrase: genesis.passphrase,
					});
					const nextBlock = await processEnv.createBlock([tx]);
					await processor.processValidated(nextBlock);
				}
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
				// Restore last temp block
				await deleteBlocksAfterHeight(processor, chain, testing.mocks.loggerMock, deleteUptoHeight);
				const result = await restoreBlocks(chain, processor);
				expect(result).toBeTrue();
				expect(chain.lastBlock.header.height).toEqual(targetHeight);
			});
		});
	});
});

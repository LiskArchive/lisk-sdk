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
import { Block } from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import { signData } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../utils';
import { createDB, removeDB } from '../../../utils/kv_store';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { Node } from '../../../../src/node';
import {
	createTransferTransaction,
	createReportMisbehaviorTransaction,
} from '../../../utils/node/transaction';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';

describe('Transaction order', () => {
	const dbName = 'report_delegate_transaction';
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		// Since node start the forging so we have to stop the job
		// Our test make use of manual forging of blocks
		node['_forgingJob'].stop();
		// FIXME: Remove with #5572
		validator['_validator']._opts.addUsedSchema = false;
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given delegate does not have balance', () => {
		describe('when report misbehavior transaction is submitted against the delegate', () => {
			let newBlock: Block;
			let senderAccount: { address: Buffer; passphrase: string };

			beforeAll(async () => {
				const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
					DefaultAccountProps
				>(genesis.address);
				senderAccount = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: senderAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
					fee: BigInt(142000), // minfee not to give fee for generator
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block with transaction', async () => {
				// get last block
				const { lastBlock } = node['_chain'];
				const lastBlockGenerator = genesisDelegates.delegates.find(delegate =>
					Buffer.from(delegate.publicKey, 'hex').equals(lastBlock.header.generatorPublicKey),
				);
				// create report misbehavior against last block
				const conflictingBlockHeader = {
					...lastBlock.header,
					height: 100,
				};
				const conflictingBytes = node['_chain'].dataAccess.encodeBlockHeader(
					conflictingBlockHeader,
					true,
				);
				const signature = signData(
					Buffer.concat([node.networkIdentifier, conflictingBytes]),
					lastBlockGenerator?.passphrase as string,
				);
				const tx = createReportMisbehaviorTransaction({
					nonce: BigInt(0),
					passphrase: senderAccount.passphrase,
					header1: lastBlock.header,
					header2: {
						...conflictingBlockHeader,
						signature,
					},
					networkIdentifier: node.networkIdentifier,
				});
				// create a block and process them
				const nextBlock = await nodeUtils.createBlock(node, [tx]);
				await node['_processor'].process(nextBlock);
				const updatedDelegate = await node['_chain'].dataAccess.getAccountByAddress<
					DefaultAccountProps
				>(Buffer.from(lastBlockGenerator?.address as string, 'hex'));
				expect(updatedDelegate.dpos.delegate.pomHeights).toHaveLength(1);
				expect(updatedDelegate.token.balance).toEqual(BigInt(0));
			});
		});
	});
});

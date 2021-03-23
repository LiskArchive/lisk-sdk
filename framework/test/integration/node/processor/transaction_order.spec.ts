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
import { nodeUtils } from '../../../utils';
import { createDB, removeDB } from '../../../utils/kv_store';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { Node } from '../../../../src/node';
import {
	createTransferTransaction,
	createDelegateRegisterTransaction,
	createMultiSignRegisterTransaction,
	createMultisignatureTransferTransaction,
	createDelegateVoteTransaction,
} from '../../../utils/node/transaction';

describe('Transaction order', () => {
	const dbName = 'transaction_order';
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

	describe('given transactions in specific order', () => {
		describe('when account does not have sufficient balance at the beginning, but receives before spending', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const returningTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: genesis.address,
					amount: BigInt('9900000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: accountWithoutBalance.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx, returningTx]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as delegate and make self vote', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const registerDelegateTx = createDelegateRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					username: 'newdelegate',
					networkIdentifier: node['_networkIdentifier'],
					passphrase: newAccount.passphrase,
				});
				const selfVoteTx = createDelegateVoteTransaction({
					nonce: BigInt('1'),
					fee: BigInt('100000000'),
					votes: [
						{
							delegateAddress: newAccount.address,
							amount: BigInt('1000000000'),
						},
					],
					networkIdentifier: node['_networkIdentifier'],
					passphrase: newAccount.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx, registerDelegateTx, selfVoteTx]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send from the accounts', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const optionalKeys = [...multiSignatureMembers.map(acc => acc.publicKey)];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = createMultiSignRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					numberOfSignatures: 2,
					networkIdentifier: node['_networkIdentifier'],
					senderPassphrase: newAccount.passphrase,
					passphrases: [newAccount.passphrase, ...multiSignatureMembers.map(acc => acc.passphrase)],
				});

				const transferTx = createMultisignatureTransferTransaction({
					nonce: BigInt('1'),
					senderPublicKey: newAccount.publicKey,
					fee: BigInt('300000'),
					amount: BigInt('8000000000'),
					recipientAddress: newAccount.address,
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					networkIdentifier: node['_networkIdentifier'],
					passphrases: [newAccount.passphrase, multiSignatureMembers[0].passphrase],
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx, registerMultisigTx, transferTx]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send transfer with old signature', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const optionalKeys = [...multiSignatureMembers.map(acc => acc.publicKey)];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = createMultiSignRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					numberOfSignatures: 2,
					networkIdentifier: node['_networkIdentifier'],
					senderPassphrase: newAccount.passphrase,
					passphrases: [newAccount.passphrase, ...multiSignatureMembers.map(acc => acc.passphrase)],
				});
				const transferTx = createTransferTransaction({
					nonce: BigInt('1'),
					fee: BigInt('300000'),
					amount: BigInt('8000000000'),
					recipientAddress: newAccount.address,
					networkIdentifier: node['_networkIdentifier'],
					passphrase: newAccount.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx, registerMultisigTx, transferTx]);
			});

			it('should not accept the block', async () => {
				await expect(node['_processor'].process(newBlock)).rejects.toThrow(
					'Transaction signatures does not match required number of signature',
				);
			});
		});

		describe('when account does not have sufficient balance in the middle of process', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const spendingTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: genesis.address,
					amount: BigInt('14000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: accountWithoutBalance.passphrase,
				});
				const refundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce + BigInt(1),
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('5000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [fundingTx, spendingTx, refundingTx]);
			});

			it('should not accept the block', async () => {
				await expect(node['_processor'].process(newBlock)).rejects.toThrow(
					'does not meet the minimum remaining balance requirement',
				);
			});
		});
	});
});

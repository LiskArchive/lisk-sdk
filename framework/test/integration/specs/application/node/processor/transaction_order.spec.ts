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

import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
} from '@liskhq/lisk-transactions';
import { KVStore } from '@liskhq/lisk-db';
import { Block } from '@liskhq/lisk-chain';
import { nodeUtils } from '../../../../../utils';
import { createDB, removeDB } from '../../../../../utils/kv_store';
import { genesis } from '../../../../../fixtures';
import { Node } from '../../../../../../src/application/node';

describe('Transaction order', () => {
	const dbName = 'transaction_order';
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		await node['_forger'].loadDelegates();
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
				].dataAccess.getAccountByAddress(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('10000000000'),
						data: '',
					},
				});
				fundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				const returningTx = new TransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					senderPublicKey: accountWithoutBalance.publicKey,
					asset: {
						recipientAddress: genesis.address,
						amount: BigInt('9900000000'),
						data: '',
					},
				});
				returningTx.sign(
					node['_networkIdentifier'],
					accountWithoutBalance.passphrase,
				);
				newBlock = await nodeUtils.createBlock(node, [fundingTx, returningTx]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.header.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as delegate and make self vote', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const fundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: newAccount.address,
						amount: BigInt('10000000000'),
						data: '',
					},
				});
				fundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				const registerDelegateTx = new DelegateTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					senderPublicKey: newAccount.publicKey,
					asset: {
						username: 'newdelegate',
					},
				});
				registerDelegateTx.sign(
					node['_networkIdentifier'],
					newAccount.passphrase,
				);
				const selfVoteTx = new VoteTransaction({
					nonce: BigInt('1'),
					fee: BigInt('100000000'),
					senderPublicKey: newAccount.publicKey,
					asset: {
						votes: [
							{
								delegateAddress: newAccount.address,
								amount: BigInt('1000000000'),
							},
						],
					},
				});
				selfVoteTx.sign(node['_networkIdentifier'], newAccount.passphrase);
				newBlock = await nodeUtils.createBlock(node, [
					fundingTx,
					registerDelegateTx,
					selfVoteTx,
				]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.header.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send from the accounts', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: newAccount.address,
						amount: BigInt('10000000000'),
						data: '',
					},
				});
				fundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				const optionalKeys = [
					...multiSignatureMembers.map(acc => acc.publicKey),
				];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = new MultisignatureTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					senderPublicKey: newAccount.publicKey,
					asset: {
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys,
						numberOfSignatures: 2,
					},
				});
				registerMultisigTx.sign(
					node['_networkIdentifier'],
					newAccount.passphrase,
					[
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
					{
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys,
						numberOfSignatures: 2,
					},
				);
				const transferTx = new TransferTransaction({
					nonce: BigInt('1'),
					senderPublicKey: newAccount.publicKey,
					fee: BigInt('300000'),
					asset: {
						amount: BigInt('8000000000'),
						recipientAddress: newAccount.address,
						data: '',
					},
				});
				transferTx.sign(
					node['_networkIdentifier'],
					undefined,
					[newAccount.passphrase, multiSignatureMembers[0].passphrase],
					{
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys,
					},
				);
				newBlock = await nodeUtils.createBlock(node, [
					fundingTx,
					registerMultisigTx,
					transferTx,
				]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.header.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send transfer with old signature', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: newAccount.address,
						amount: BigInt('10000000000'),
						data: '',
					},
				});
				fundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				const optionalKeys = [
					...multiSignatureMembers.map(acc => acc.publicKey),
				];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = new MultisignatureTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					senderPublicKey: newAccount.publicKey,
					asset: {
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys,
						numberOfSignatures: 2,
					},
				});
				registerMultisigTx.sign(
					node['_networkIdentifier'],
					newAccount.passphrase,
					[
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
					{
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys,
						numberOfSignatures: 2,
					},
				);
				const transferTx = new TransferTransaction({
					nonce: BigInt('1'),
					senderPublicKey: newAccount.publicKey,
					fee: BigInt('300000'),
					asset: {
						amount: BigInt('8000000000'),
						recipientAddress: newAccount.address,
						data: '',
					},
				});
				transferTx.sign(node['_networkIdentifier'], newAccount.passphrase);
				newBlock = await nodeUtils.createBlock(node, [
					fundingTx,
					registerMultisigTx,
					transferTx,
				]);
			});

			it('should not accept the block', async () => {
				expect.assertions(2);
				try {
					await node['_processor'].process(newBlock);
				} catch (errors) {
					// eslint-disable-next-line jest/no-try-expect
					expect(errors).toHaveLength(1);
					// eslint-disable-next-line jest/no-try-expect
					expect(errors[0].message).toContain(
						'Transaction signatures does not match required number of signatures',
					);
				}
			});
		});

		describe('when account does not have sufficient balance in the middle of process', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('10000000000'),
						data: '',
					},
				});
				fundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				const spendingTx = new TransferTransaction({
					nonce: BigInt(0),
					senderPublicKey: accountWithoutBalance.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: genesis.address,
						amount: BigInt('14000000000'),
						data: '',
					},
				});
				spendingTx.sign(
					node['_networkIdentifier'],
					accountWithoutBalance.passphrase,
				);
				const refundingTx = new TransferTransaction({
					nonce: genesisAccount.nonce + BigInt(1),
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: accountWithoutBalance.address,
						amount: BigInt('5000000000'),
						data: '',
					},
				});
				refundingTx.sign(node['_networkIdentifier'], genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [
					fundingTx,
					spendingTx,
					refundingTx,
				]);
			});

			it('should not accept the block', async () => {
				expect.assertions(2);
				try {
					await node['_processor'].process(newBlock);
				} catch (errors) {
					// eslint-disable-next-line jest/no-try-expect
					expect(errors).toHaveLength(1);
					// eslint-disable-next-line jest/no-try-expect
					expect(errors[0].message).toContain(
						'Account does not have enough minimum remaining',
					);
				}
			});
		});
	});
});

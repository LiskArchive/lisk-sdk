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
	transfer,
	registerDelegate,
	castVotes,
	registerMultisignature,
	utils,
	TransactionJSON,
} from '@liskhq/lisk-transactions';
import { KVStore } from '@liskhq/lisk-db';
import { BlockInstance } from '@liskhq/lisk-chain';
import { nodeUtils } from '../../../../../../utils';
import { createDB, removeDB } from '../../../../../../utils/kv_store';
import { accounts } from '../../../../../../fixtures';
import { Node } from '../../../../../../../src/application/node';

const { convertLSKToBeddows } = utils;
const { genesis } = accounts;

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
			let newBlock: BlockInstance;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				const returningTx = transfer({
					nonce: '0',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: genesis.address,
					amount: convertLSKToBeddows('99'),
					passphrase: accountWithoutBalance.passphrase,
				}) as TransactionJSON;
				newBlock = await nodeUtils.createBlock(node, [
					node['_chain'].deserializeTransaction(fundingTx),
					node['_chain'].deserializeTransaction(returningTx),
				]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as delegate and make self vote', () => {
			let newBlock: BlockInstance;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				const registerDelegateTx = registerDelegate({
					nonce: '0',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('11'),
					username: 'newdelegate',
					passphrase: newAccount.passphrase,
				}) as TransactionJSON;
				const selfVoteTx = castVotes({
					nonce: '1',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('1'),
					votes: [
						{
							delegateAddress: newAccount.address,
							amount: convertLSKToBeddows('10'),
						},
					],
					passphrase: newAccount.passphrase,
				}) as TransactionJSON;
				newBlock = await nodeUtils.createBlock(node, [
					node['_chain'].deserializeTransaction(fundingTx),
					node['_chain'].deserializeTransaction(registerDelegateTx),
					node['_chain'].deserializeTransaction(selfVoteTx),
				]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send from the accounts', () => {
			let newBlock: BlockInstance;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				const registerMultisigTx = registerMultisignature({
					nonce: '0',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('11'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					numberOfSignatures: 2,
					senderPassphrase: newAccount.passphrase,
					passphrases: [
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
				}) as TransactionJSON;
				const transferTx = transfer({
					nonce: '1',
					senderPublicKey: newAccount.publicKey,
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.003'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('80'),
				}) as TransactionJSON;
				const deserializedTransferTx = node['_chain'].deserializeTransaction(
					transferTx,
				);
				deserializedTransferTx.sign(
					node['_networkIdentifier'],
					undefined,
					[newAccount.passphrase, multiSignatureMembers[0].passphrase],
					{
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					},
				);
				newBlock = await nodeUtils.createBlock(node, [
					node['_chain'].deserializeTransaction(fundingTx),
					node['_chain'].deserializeTransaction(registerMultisigTx),
					deserializedTransferTx,
				]);
				await node['_processor'].process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send transfer with old signature', () => {
			let newBlock: BlockInstance;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				const registerMultisigTx = registerMultisignature({
					nonce: '0',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('11'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					numberOfSignatures: 2,
					senderPassphrase: newAccount.passphrase,
					passphrases: [
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
				}) as TransactionJSON;
				const transferTx = transfer({
					nonce: '1',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.003'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('80'),
					passphrase: newAccount.passphrase,
				}) as TransactionJSON;
				newBlock = await nodeUtils.createBlock(node, [
					node['_chain'].deserializeTransaction(fundingTx),
					node['_chain'].deserializeTransaction(registerMultisigTx),
					node['_chain'].deserializeTransaction(transferTx),
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
			let newBlock: BlockInstance;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				const spendingTx = transfer({
					nonce: '0',
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: genesis.address,
					amount: convertLSKToBeddows('140'),
					passphrase: accountWithoutBalance.passphrase,
				}) as TransactionJSON;
				const refundingTx = transfer({
					nonce: (genesisAccount.nonce + BigInt(1)).toString(),
					networkIdentifier: node['_networkIdentifier'],
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('50'),
					passphrase: genesis.passphrase,
				}) as TransactionJSON;
				newBlock = await nodeUtils.createBlock(node, [
					node['_chain'].deserializeTransaction(fundingTx),
					node['_chain'].deserializeTransaction(spendingTx),
					node['_chain'].deserializeTransaction(refundingTx),
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

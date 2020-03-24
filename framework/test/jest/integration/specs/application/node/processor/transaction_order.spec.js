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

'use strict';

const {
	transfer,
	registerDelegate,
	castVotes,
	registerMultisignature,
	utils: { convertLSKToBeddows },
} = require('@liskhq/lisk-transactions');
const {
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../../utils');
const {
	accounts: { genesis },
} = require('../../../../../../fixtures');

describe('Transaction order', () => {
	const dbName = 'transaction_order';
	let storage;
	let node;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		node = await nodeUtils.createAndLoadNode(storage);
		await node.forger.loadDelegates();
	});

	afterAll(async () => {
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given transactions in specific order', () => {
		describe('when account does not have sufficient balance at the beginning, but receives before spending', () => {
			let newBlock;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				});
				const returningTx = transfer({
					nonce: '0',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: genesis.address,
					amount: convertLSKToBeddows('99'),
					passphrase: accountWithoutBalance.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(fundingTx),
					node.chain.deserializeTransaction(returningTx),
				]);
				await node.processor.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as delegate and make self vote', () => {
			let newBlock;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const newAccount = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				});
				const registerDelegateTx = registerDelegate({
					nonce: '0',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('11'),
					username: 'newdelegate',
					passphrase: newAccount.passphrase,
				});
				const selfVoteTx = castVotes({
					nonce: '1',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('1'),
					votes: [newAccount.publicKey],
					passphrase: newAccount.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(fundingTx),
					node.chain.deserializeTransaction(registerDelegateTx),
					node.chain.deserializeTransaction(selfVoteTx),
				]);
				await node.processor.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send from the accounts', () => {
			let newBlock;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				});
				const registerMultisigTx = registerMultisignature({
					nonce: '0',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('11'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					numberOfSignatures: 2,
					senderPassphrase: newAccount.passphrase,
					passphrases: [
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
				});
				const transferTx = transfer({
					nonce: '1',
					senderPublicKey: newAccount.publicKey,
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.003'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('80'),
				});
				const deserializedTransferTx = node.chain.deserializeTransaction(
					transferTx,
				);
				deserializedTransferTx.sign(
					node.networkIdentifier,
					undefined,
					[newAccount.passphrase, multiSignatureMembers[0].passphrase],
					{
						mandatoryKeys: [newAccount.publicKey],
						optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					},
				);
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(fundingTx),
					node.chain.deserializeTransaction(registerMultisigTx),
					deserializedTransferTx,
				]);
				await node.processor.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send transfer with old signature', () => {
			let newBlock;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				});
				const registerMultisigTx = registerMultisignature({
					nonce: '0',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('11'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys: multiSignatureMembers.map(acc => acc.publicKey),
					numberOfSignatures: 2,
					senderPassphrase: newAccount.passphrase,
					passphrases: [
						newAccount.passphrase,
						...multiSignatureMembers.map(acc => acc.passphrase),
					],
				});
				const transferTx = transfer({
					nonce: '1',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.003'),
					recipientId: newAccount.address,
					amount: convertLSKToBeddows('80'),
					passphrase: newAccount.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(fundingTx),
					node.chain.deserializeTransaction(registerMultisigTx),
					node.chain.deserializeTransaction(transferTx),
				]);
			});

			it('should not accept the block', async () => {
				expect.assertions(2);
				try {
					await node.processor.process(newBlock);
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
			let newBlock;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('100'),
					passphrase: genesis.passphrase,
				});
				const spendingTx = transfer({
					nonce: '0',
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: genesis.address,
					amount: convertLSKToBeddows('140'),
					passphrase: accountWithoutBalance.passphrase,
				});
				const refundingTx = transfer({
					nonce: (genesisAccount.nonce + BigInt(1)).toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: accountWithoutBalance.address,
					amount: convertLSKToBeddows('50'),
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(fundingTx),
					node.chain.deserializeTransaction(spendingTx),
					node.chain.deserializeTransaction(refundingTx),
				]);
			});

			it('should not accept the block', async () => {
				expect.assertions(2);
				try {
					await node.processor.process(newBlock);
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

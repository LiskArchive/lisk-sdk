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
import { Block } from '@liskhq/lisk-chain';
import { address } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../utils';
import {
	createTransferTransaction,
	createDelegateRegisterTransaction,
	createMultiSignRegisterTransaction,
	createMultisignatureTransferTransaction,
	createDelegateVoteTransaction,
} from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';

describe('Transaction order', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;
	const databasePath = '/tmp/lisk/transaction_order/test';
	const genesis = testing.fixtures.defaultFaucetAccount;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		chainID = processEnv.getNetworkId();
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('given transactions in specific order', () => {
		describe('when account does not have sufficient balance at the beginning, but receives before spending', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const returningTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: Buffer.from(genesis.address, 'hex'),
					amount: BigInt('9900000000'),
					chainID,
					privateKey: accountWithoutBalance.privateKey,
				});
				newBlock = await processEnv.createBlock([fundingTx, returningTx]);
				await processEnv.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await processEnv.getDataAccess().getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as delegate and make self vote', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const newAccount = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const registerDelegateTx = createDelegateRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					username: 'new_delegate',
					chainID,
					blsKey: newAccount.blsPublicKey,
					blsProofOfPossession: newAccount.blsPoP,
					generatorKey: newAccount.publicKey,
					privateKey: newAccount.privateKey,
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
					chainID,
					privateKey: newAccount.privateKey,
				});
				newBlock = await processEnv.createBlock([fundingTx, registerDelegateTx, selfVoteTx]);
				await processEnv.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await processEnv.getDataAccess().getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send from the accounts', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = [nodeUtils.createAccount(), nodeUtils.createAccount()];
				const fundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('100000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const optionalKeys = [...multiSignatureMembers.map(acc => acc.publicKey)];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = createMultiSignRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1000416000'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					numberOfSignatures: 2,
					chainID,
					senderPublicKey: newAccount.publicKey,
					privateKeys: [newAccount.privateKey, ...multiSignatureMembers.map(acc => acc.privateKey)],
				});

				const transferTx = createMultisignatureTransferTransaction({
					nonce: BigInt('1'),
					senderPublicKey: newAccount.publicKey,
					fee: BigInt('300000'),
					amount: BigInt('80000000'),
					recipientAddress: newAccount.address,
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					chainID,
					privateKeys: [newAccount.privateKey, multiSignatureMembers[0].privateKey],
				});
				newBlock = await processEnv.createBlock([fundingTx, registerMultisigTx, transferTx]);
				await processEnv.process(newBlock);
			});

			it('should accept the block', async () => {
				const createdBlock = await processEnv.getDataAccess().getBlockByID(newBlock.header.id);
				expect(createdBlock).not.toBeUndefined();
			});
		});

		describe('when account register as multisignature and send transfer with old signature', () => {
			it('should not accept the block', async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = [nodeUtils.createAccount(), nodeUtils.createAccount()];
				const fundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('100000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const optionalKeys = [...multiSignatureMembers.map(acc => acc.publicKey)];
				optionalKeys.sort((a, b) => a.compare(b));
				const registerMultisigTx = createMultiSignRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					mandatoryKeys: [newAccount.publicKey],
					optionalKeys,
					numberOfSignatures: 2,
					chainID,
					senderPublicKey: newAccount.publicKey,
					privateKeys: [
						newAccount.privateKey,
						...multiSignatureMembers
							.sort((a, b) => a.publicKey.compare(b.publicKey))
							.map(acc => acc.privateKey),
					],
				});
				const transferTx = createTransferTransaction({
					nonce: BigInt('1'),
					fee: BigInt('300000'),
					amount: BigInt('8000000000'),
					recipientAddress: newAccount.address,
					chainID,
					privateKey: newAccount.privateKey,
				});

				// Execution of transaction will fail in block generation now with the same logic
				const created = await processEnv.createBlock([fundingTx, registerMultisigTx, transferTx]);
				expect(created.transactions).toHaveLength(2);
				expect(created.transactions[0]).toEqual(fundingTx);
				expect(created.transactions[1]).toEqual(registerMultisigTx);
			});
		});

		describe('when account does not have sufficient balance in the middle of process', () => {
			it('should not accept the block', async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const spendingTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: address.getAddressFromLisk32Address(genesis.address),
					amount: BigInt('14000000000'),
					chainID,
					privateKey: accountWithoutBalance.privateKey,
				});
				const refundingTx = createTransferTransaction({
					nonce: BigInt(authData.nonce) + BigInt(1),
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('5000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});

				// Execution of transaction will fail in block generation now with the same logic
				const created = await processEnv.createBlock([fundingTx, spendingTx, refundingTx]);
				expect(created.transactions).toHaveLength(3);
				expect(created.transactions[0]).toEqual(fundingTx);
				expect(created.transactions[1]).toEqual(spendingTx);
				expect(created.transactions[2]).toEqual(refundingTx);
			});
		});
	});
});

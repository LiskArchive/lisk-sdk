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

import { nodeUtils } from '../../../utils';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import {
	createTransferTransaction,
	createDelegateRegisterTransaction,
	createMultiSignRegisterTransaction,
	createMultisignatureTransferTransaction,
	createDelegateVoteTransaction,
} from '../../../utils/node/transaction';
import * as testing from '../../../../src/testing';

describe('Transaction order', () => {
	let processEnv: testing.BlockProcessingEnv;
	let networkIdentifier: Buffer;
	const databasePath = '/tmp/lisk/transaction_order/test';

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		networkIdentifier = processEnv.getNetworkId();
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('given transactions in specific order', () => {
		describe('when account does not have sufficient balance at the beginning, but receives before spending', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await processEnv
					.getDataAccess()
					.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				const returningTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: genesis.address,
					amount: BigInt('9900000000'),
					networkIdentifier,
					passphrase: accountWithoutBalance.passphrase,
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
				const genesisAccount = await processEnv
					.getDataAccess()
					.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				const registerDelegateTx = createDelegateRegisterTransaction({
					nonce: BigInt(0),
					fee: BigInt('1100000000'),
					username: 'new_delegate',
					networkIdentifier,
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
					networkIdentifier,
					passphrase: newAccount.passphrase,
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
				const genesisAccount = await processEnv
					.getDataAccess()
					.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier,
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
					networkIdentifier,
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
					networkIdentifier,
					passphrases: [newAccount.passphrase, multiSignatureMembers[0].passphrase],
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
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await processEnv
					.getDataAccess()
					.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const newAccount = nodeUtils.createAccount();
				const multiSignatureMembers = nodeUtils.createAccounts(2);
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: newAccount.address,
					amount: BigInt('10000000000'),
					networkIdentifier,
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
					networkIdentifier,
					senderPassphrase: newAccount.passphrase,
					passphrases: [newAccount.passphrase, ...multiSignatureMembers.map(acc => acc.passphrase)],
				});
				const transferTx = createTransferTransaction({
					nonce: BigInt('1'),
					fee: BigInt('300000'),
					amount: BigInt('8000000000'),
					recipientAddress: newAccount.address,
					networkIdentifier,
					passphrase: newAccount.passphrase,
				});
				newBlock = await processEnv.createBlock([fundingTx, registerMultisigTx, transferTx]);
			});

			it('should not accept the block', async () => {
				await expect(processEnv.process(newBlock)).rejects.toThrow(
					'Transaction signatures does not match required number of signature',
				);
			});
		});

		describe('when account does not have sufficient balance in the middle of process', () => {
			let newBlock: Block;

			beforeAll(async () => {
				const genesisAccount = await processEnv
					.getDataAccess()
					.getAccountByAddress<DefaultAccountProps>(genesis.address);
				const accountWithoutBalance = nodeUtils.createAccount();
				const fundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				const spendingTx = createTransferTransaction({
					nonce: BigInt(0),
					fee: BigInt('200000'),
					recipientAddress: genesis.address,
					amount: BigInt('14000000000'),
					networkIdentifier,
					passphrase: accountWithoutBalance.passphrase,
				});
				const refundingTx = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce + BigInt(1),
					fee: BigInt('200000'),
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('5000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				newBlock = await processEnv.createBlock([fundingTx, spendingTx, refundingTx]);
			});

			it('should not accept the block', async () => {
				await expect(processEnv.process(newBlock)).rejects.toThrow(
					'does not meet the minimum remaining balance requirement',
				);
			});
		});
	});
});

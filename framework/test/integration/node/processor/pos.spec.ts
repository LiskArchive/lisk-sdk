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
	createChangeCommissionTransaction,
	createClaimRewardTransaction,
	createTransferTransaction,
	createValidatorRegisterTransaction,
	createValidatorStakeTransaction,
} from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';
import { defaultConfig } from '../../../../src/modules/token/constants';
import { ValidatorAccountJSON } from '../../../../src/modules/pos/stores/validator';
import { StakerDataJSON } from '../../../../src/modules/pos/types';

describe('PoS and reward', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;
	let newBlock: Block;
	let senderAccount: ReturnType<typeof nodeUtils.createAccount>;
	const databasePath = '/tmp/lisk/pos_integration/test';
	const genesis = testing.fixtures.defaultFaucetAccount;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
				modules: {
					dynamicReward: {
						offset: 1,
					},
					pos: {
						commissionIncreasePeriod: 0,
						maxCommissionIncreaseRate: 10000,
					},
				},
			},
		});
		chainID = processEnv.getChainID();
		// Fund sender account
		const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: genesis.address,
		});
		senderAccount = nodeUtils.createAccount();
		const transaction = createTransferTransaction({
			nonce: BigInt(authData.nonce),
			recipientAddress: senderAccount.address,
			amount: BigInt('10000000000'),
			chainID,
			privateKey: Buffer.from(genesis.privateKey, 'hex'),
			fee: BigInt(166000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
		});
		newBlock = await processEnv.createBlock([transaction]);

		await processEnv.process(newBlock);
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('when registering a new validator', () => {
		it('should accept the block with validator registration transaction', async () => {
			// get last block
			const registrationTx = createValidatorRegisterTransaction({
				nonce: BigInt(0),
				blsKey: senderAccount.blsPublicKey,
				blsProofOfPossession: senderAccount.blsPoP,
				chainID,
				generatorKey: senderAccount.publicKey,
				privateKey: senderAccount.privateKey,
				username: 'testvalidator',
			});
			newBlock = await processEnv.createBlock([registrationTx]);
			await processEnv.process(newBlock);

			const events = await processEnv.getEvents(newBlock.header.height);
			expect(events.find(e => e.name === 'generatorKeyRegistration')?.topics[0]).toEqual(
				registrationTx.id.toString('hex'),
			);
			expect(events.find(e => e.name === 'blsKeyRegistration')?.topics[0]).toEqual(
				registrationTx.id.toString('hex'),
			);
			expect(events.find(e => e.name === 'commandExecutionResult')).toHaveProperty('data', '0801');

			const newValidator = await processEnv.invoke<{ name: string }>('pos_getValidator', {
				address: address.getLisk32AddressFromAddress(senderAccount.address),
			});
			expect(newValidator.name).toBe('testvalidator');
		});

		it('should accept the block with another validator registration transaction', async () => {
			// create new account
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const newAccount = nodeUtils.createAccount();
			const transaction = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: newAccount.address,
				amount: BigInt('10000000000'),
				chainID,
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
				fee: BigInt(166000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
			});
			newBlock = await processEnv.createBlock([transaction]);

			await processEnv.process(newBlock);
			const registrationTx = createValidatorRegisterTransaction({
				nonce: BigInt(0),
				blsKey: newAccount.blsPublicKey,
				blsProofOfPossession: newAccount.blsPoP,
				chainID,
				generatorKey: newAccount.publicKey,
				privateKey: newAccount.privateKey,
				username: 'testvalidator2',
			});
			newBlock = await processEnv.createBlock([registrationTx]);
			await processEnv.process(newBlock);

			const events = await processEnv.getEvents(newBlock.header.height);
			expect(events.find(e => e.name === 'generatorKeyRegistration')?.topics[0]).toEqual(
				registrationTx.id.toString('hex'),
			);
			expect(events.find(e => e.name === 'blsKeyRegistration')?.topics[0]).toEqual(
				registrationTx.id.toString('hex'),
			);
			expect(events.find(e => e.name === 'commandExecutionResult')).toHaveProperty('data', '0801');

			const newValidator = await processEnv.invoke<{ name: string }>('pos_getValidator', {
				address: address.getLisk32AddressFromAddress(newAccount.address),
			});
			expect(newValidator.name).toBe('testvalidator2');
		});
	});

	describe('reward', () => {
		it('when validator generates a block without self stake and other account stakes, reward should be locked for sharing', async () => {
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const newAccount = nodeUtils.createAccount();
			const fundingTx = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: newAccount.address,
				amount: BigInt('1000000000000'),
				chainID,
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
				fee: BigInt(200000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
			});

			newBlock = await processEnv.createBlock([fundingTx]);
			await processEnv.process(newBlock);

			const nextValidator = await processEnv.getNextValidatorKeys(newBlock.header, 2);
			const stakeTx = createValidatorStakeTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: newAccount.privateKey,
				stakes: [
					{
						validatorAddress: address.getAddressFromLisk32Address(nextValidator.address),
						amount: BigInt('100000000000'),
					},
				],
			});
			newBlock = await processEnv.createBlock([stakeTx]);
			await processEnv.process(newBlock);

			const [commandExecutionEvent] = await processEnv.getEvents(
				newBlock.header.height,
				undefined,
				'commandExecutionResult',
			);
			expect(commandExecutionEvent).toHaveProperty('data', '0801');

			newBlock = await processEnv.createBlock([]);
			await processEnv.process(newBlock);

			const validator = await processEnv.invoke<ValidatorAccountJSON>('pos_getValidator', {
				address: nextValidator.address,
			});
			expect(validator.commission).toBe(0);
			const staker = await processEnv.invoke<StakerDataJSON>('pos_getStaker', {
				address: address.getLisk32AddressFromAddress(newAccount.address),
			});
			expect(staker.stakes[0].sharingCoefficients).toBeEmpty();
			expect(validator.sharingCoefficients).not.toBeEmpty();

			const claimableRewards = await processEnv.invoke<{ rewards: { reward: string }[] }>(
				'pos_getClaimableRewards',
				{ address: address.getLisk32AddressFromAddress(newAccount.address) },
			);
			const lockedReward = await processEnv.invoke<{ reward: string }>('pos_getLockedReward', {
				address: nextValidator.address,
				tokenID: `${chainID.toString('hex')}00000000`,
			});

			const claimTx = createClaimRewardTransaction({
				chainID,
				nonce: BigInt(1),
				privateKey: newAccount.privateKey,
			});
			newBlock = await processEnv.createBlock([claimTx]);
			await processEnv.process(newBlock);

			expect(claimableRewards.rewards[0].reward).toEqual(lockedReward.reward);
		});

		it('when validator generates a block with stake transaction without self stake, reward should be locked for sharing', async () => {
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const newAccount = nodeUtils.createAccount();
			const fundingTx = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: newAccount.address,
				amount: BigInt('1000000000000'),
				chainID,
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
				fee: BigInt(200000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
			});

			newBlock = await processEnv.createBlock([fundingTx]);
			await processEnv.process(newBlock);

			const nextValidator = await processEnv.getNextValidatorKeys(newBlock.header);
			const stakeTx = createValidatorStakeTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: newAccount.privateKey,
				stakes: [
					{
						validatorAddress: address.getAddressFromLisk32Address(nextValidator.address),
						amount: BigInt('100000000000'),
					},
				],
			});
			newBlock = await processEnv.createBlock([stakeTx]);
			await processEnv.process(newBlock);

			const [commandExecutionEvent] = await processEnv.getEvents(
				newBlock.header.height,
				undefined,
				'commandExecutionResult',
			);
			expect(commandExecutionEvent.decodedData).toEqual({ success: true });

			const validator = await processEnv.invoke<ValidatorAccountJSON>('pos_getValidator', {
				address: nextValidator.address,
			});
			expect(validator.commission).toBe(0);
			const staker = await processEnv.invoke<StakerDataJSON>('pos_getStaker', {
				address: address.getLisk32AddressFromAddress(newAccount.address),
			});
			expect(staker.stakes[0].sharingCoefficients).toBeEmpty();
			expect(validator.sharingCoefficients).not.toBeEmpty();

			const claimableRewards = await processEnv.invoke<{ rewards: { reward: string }[] }>(
				'pos_getClaimableRewards',
				{ address: address.getLisk32AddressFromAddress(newAccount.address) },
			);
			const lockedReward = await processEnv.invoke<{ reward: string }>('pos_getLockedReward', {
				address: nextValidator.address,
				tokenID: `${chainID.toString('hex')}00000000`,
			});
			expect(claimableRewards.rewards[0].reward).toEqual(lockedReward.reward);

			const claimTx = createClaimRewardTransaction({
				chainID,
				nonce: BigInt(1),
				privateKey: newAccount.privateKey,
			});
			newBlock = await processEnv.createBlock([claimTx]);
			await processEnv.process(newBlock);

			const [afterEvents] = await processEnv.getEvents(
				newBlock.header.height,
				undefined,
				'commandExecutionResult',
			);
			expect(afterEvents.decodedData).toEqual({ success: true });
		});

		it('when validator generates a block and commission is 100, all rewards should be given to generator without locking', async () => {
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const newAccount = nodeUtils.createAccount();
			const fundingTx = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: newAccount.address,
				amount: BigInt('1000000000000'),
				chainID,
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
				fee: BigInt(200000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
			});

			newBlock = await processEnv.createBlock([fundingTx]);
			await processEnv.process(newBlock);

			const nextValidator = await processEnv.getNextValidatorKeys(newBlock.header, 2);
			const stakeTx = createValidatorStakeTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: newAccount.privateKey,
				stakes: [
					{
						validatorAddress: address.getAddressFromLisk32Address(nextValidator.address),
						amount: BigInt('100000000000'),
					},
				],
			});
			const changeCommissionTx = createChangeCommissionTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: Buffer.from(nextValidator.privateKey, 'hex'),
				newCommission: 10000,
			});
			newBlock = await processEnv.createBlock([stakeTx, changeCommissionTx]);
			await processEnv.process(newBlock);

			const [commandExecutionEvent] = await processEnv.getEvents(
				newBlock.header.height,
				undefined,
				'commandExecutionResult',
			);
			expect(commandExecutionEvent.decodedData).toEqual({ success: true });

			newBlock = await processEnv.createBlock([]);
			await processEnv.process(newBlock);

			const validator = await processEnv.invoke<ValidatorAccountJSON>('pos_getValidator', {
				address: nextValidator.address,
			});
			expect(validator.commission).toBe(10000);
			const staker = await processEnv.invoke<StakerDataJSON>('pos_getStaker', {
				address: address.getLisk32AddressFromAddress(newAccount.address),
			});
			expect(staker.stakes[0].sharingCoefficients).toBeEmpty();
			expect(validator.sharingCoefficients).not.toBeEmpty();

			const claimableRewards = await processEnv.invoke<{ rewards: { reward: string }[] }>(
				'pos_getClaimableRewards',
				{ address: address.getLisk32AddressFromAddress(newAccount.address) },
			);
			const lockedReward = await processEnv.invoke<{ reward: string }>('pos_getLockedReward', {
				address: nextValidator.address,
				tokenID: `${chainID.toString('hex')}00000000`,
			});
			expect(lockedReward.reward).toBe('0');
			expect(claimableRewards.rewards[0].reward).toEqual(lockedReward.reward);
		});

		it('when validator generates a block and commission is 50, half of rewards should be given to generator and half should be locked', async () => {
			const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: genesis.address,
			});
			const newAccount = nodeUtils.createAccount();
			const fundingTx = createTransferTransaction({
				nonce: BigInt(authData.nonce),
				recipientAddress: newAccount.address,
				amount: BigInt('1000000000000'),
				chainID,
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
				fee: BigInt(200000) + BigInt(defaultConfig.userAccountInitializationFee), // minFee not to give fee for generator
			});

			newBlock = await processEnv.createBlock([fundingTx]);
			await processEnv.process(newBlock);

			const nextValidator = await processEnv.getNextValidatorKeys(newBlock.header, 2);
			const stakeTx = createValidatorStakeTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: newAccount.privateKey,
				stakes: [
					{
						validatorAddress: address.getAddressFromLisk32Address(nextValidator.address),
						amount: BigInt('100000000000'),
					},
				],
			});
			const selfStakeTx = createValidatorStakeTransaction({
				chainID,
				nonce: BigInt(0),
				privateKey: Buffer.from(nextValidator.privateKey, 'hex'),
				stakes: [
					{
						validatorAddress: address.getAddressFromLisk32Address(nextValidator.address),
						amount: BigInt('100000000000'),
					},
				],
			});
			const changeCommissionTx = createChangeCommissionTransaction({
				chainID,
				nonce: BigInt(1),
				privateKey: Buffer.from(nextValidator.privateKey, 'hex'),
				newCommission: 5000,
			});
			newBlock = await processEnv.createBlock([stakeTx, selfStakeTx, changeCommissionTx]);
			await processEnv.process(newBlock);

			const [commandExecutionEvent] = await processEnv.getEvents(
				newBlock.header.height,
				undefined,
				'commandExecutionResult',
			);
			expect(commandExecutionEvent.decodedData).toEqual({ success: true });

			newBlock = await processEnv.createBlock([]);
			await processEnv.process(newBlock);

			const validator = await processEnv.invoke<ValidatorAccountJSON>('pos_getValidator', {
				address: nextValidator.address,
			});
			expect(validator.commission).toBe(5000);
			const staker = await processEnv.invoke<StakerDataJSON>('pos_getStaker', {
				address: address.getLisk32AddressFromAddress(newAccount.address),
			});
			expect(staker.stakes[0].sharingCoefficients).toBeEmpty();
			expect(validator.sharingCoefficients).not.toBeEmpty();

			const claimableRewards = await processEnv.invoke<{ rewards: { reward: string }[] }>(
				'pos_getClaimableRewards',
				{ address: address.getLisk32AddressFromAddress(newAccount.address) },
			);
			const lockedReward = await processEnv.invoke<{ reward: string }>('pos_getLockedReward', {
				address: nextValidator.address,
				tokenID: `${chainID.toString('hex')}00000000`,
			});
			expect(claimableRewards.rewards[0].reward).toEqual(lockedReward.reward);
			// Reward should be 5LSK * 0.5 (50% commission) * 0.5 (50% of whole stake)
			expect(Number(lockedReward.reward)).toBeLessThanOrEqual(125000000);
			expect(Number(lockedReward.reward)).toBeGreaterThanOrEqual(124999999);
		});
	});
});

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
	createValidatorRegisterTransaction,
} from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';
import { defaultConfig } from '../../../../src/modules/token/constants';
import { EventJSON } from '../../../../src';

describe('Transaction order', () => {
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

			const events = await processEnv.invoke<EventJSON[]>('chain_getEvents', {
				height: newBlock.header.height,
			});
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

			const events = await processEnv.invoke<EventJSON[]>('chain_getEvents', {
				height: newBlock.header.height,
			});
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
});

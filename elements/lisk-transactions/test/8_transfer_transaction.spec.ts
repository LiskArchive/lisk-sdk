/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { MAX_TRANSACTION_AMOUNT } from '../src/constants';
import {
	TransferTransaction,
	TransferAsset,
} from '../src/8_transfer_transaction';
import { Account } from '../src/types';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import * as fixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as multiSigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { BaseTransaction } from '../src';
import {
	MultiSignatureAsset,
	MultisignatureTransaction,
} from '../src/12_multisignature_transaction';

describe('Transfer transaction class', () => {
	const validTransferAccount = fixture.testCases[0].input.account;
	let validTransferTestTransaction: TransferTransaction;
	let sender: Account;
	let recipient: Account;
	let store: StateStoreMock;

	beforeEach(() => {
		const buffer = Buffer.from(
			fixture.testCases[0].output.transaction,
			'base64',
		);
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<BaseTransaction>(
			BaseTransaction.BASE_SCHEMA,
			buffer,
		);
		const decodedAsset = codec.decode<TransferAsset>(
			TransferTransaction.ASSET_SCHEMA,
			decodedBaseTransaction.asset as Buffer,
		);
		validTransferTestTransaction = new TransferTransaction({
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		});
		sender = defaultAccount({
			publicKey: Buffer.from(
				fixture.testCases[0].input.account.publicKey,
				'base64',
			),
			balance: BigInt('10000000000'),
			address: Buffer.from(
				fixture.testCases[0].input.account.address,
				'base64',
			),
			nonce: BigInt(validTransferAccount.nonce),
		});

		recipient = defaultAccount({
			balance: BigInt('10000000000'),
			address: validTransferTestTransaction.asset.recipientAddress,
			nonce: BigInt(validTransferAccount.nonce),
		});

		store = new StateStoreMock([sender, recipient]);

		jest.spyOn(store.account, 'get');
		jest.spyOn(store.account, 'getOrDefault');
		jest.spyOn(store.account, 'set');
	});

	describe('#applyAsset', () => {
		it('should return no errors', () => {
			const errors = (validTransferTestTransaction as any).applyAsset(store);

			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should call state store', async () => {
			await (validTransferTestTransaction as any).applyAsset(store);
			expect(store.account.get).toHaveBeenCalledWith(
				validTransferTestTransaction.senderId,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				sender.address,
				expect.objectContaining({
					address: sender.address,
					publicKey: sender.publicKey,
				}),
			);
			expect(store.account.getOrDefault).toHaveBeenCalledWith(
				validTransferTestTransaction.asset.recipientAddress,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				recipient.address,
				expect.objectContaining({
					address: recipient.address,
					publicKey: recipient.publicKey,
				}),
			);
		});

		it('should return error when recipient balance is over maximum amount', async () => {
			store.account.set(recipient.address, {
				...recipient,
				balance: BigInt(MAX_TRANSACTION_AMOUNT),
			});
			const errors = await (validTransferTestTransaction as any).applyAsset(
				store,
			);
			expect(errors[0].message).toEqual('Invalid amount');
		});

		it('should return error when recipient balance is below minimum remaining balance', async () => {
			store.account.set(recipient.address, {
				...recipient,
				balance:
					-validTransferTestTransaction.asset.amount +
					BaseTransaction.MIN_REMAINING_BALANCE -
					BigInt(1),
			});
			const errors = await (validTransferTestTransaction as any).applyAsset(
				store,
			);
			expect(errors[0].message).toContain(
				'Account does not have enough minimum remaining LSK',
			);
		});
	});

	describe('#sign', () => {
		const networkIdentifier = Buffer.from(
			fixture.testCases[0].input.networkIdentifier,
			'base64',
		);
		const { account } = fixture.testCases[0].input;

		let validTransferInstance: BaseTransaction;

		beforeEach(() => {
			const buffer = Buffer.from(
				fixture.testCases[0].output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<TransferAsset>(
				TransferTransaction.ASSET_SCHEMA,
				decodedBaseTransaction.asset as Buffer,
			);
			validTransferInstance = new TransferTransaction({
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			});
			validTransferInstance.signatures = [];
		});

		it('should have one signature for single key pair account', () => {
			validTransferInstance.sign(
				networkIdentifier,
				account.passphrase,
				undefined,
				undefined,
			);
			expect(validTransferInstance.signatures[0]).toEqual(
				validTransferTestTransaction.signatures[0],
			);
		});

		it('should have two signatures for a multisignature account used as 2nd passphrase account', () => {
			const testCase = multiSigFixture.testCases[4];
			const { members } = testCase.input;

			const buffer = Buffer.from(testCase.output.transaction, 'base64');
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<MultiSignatureAsset>(
				MultisignatureTransaction.ASSET_SCHEMA,
				decodedBaseTransaction.asset as Buffer,
			);

			validTransferInstance.sign(
				networkIdentifier,
				undefined,
				[
					(members.mandatoryOne as any).passphrase,
					(members.mandatoryTwo as any).passphrase,
				],
				{
					...decodedAsset,
				},
			);

			expect(validTransferInstance.signatures).toHaveLength(2);
			expect(validTransferInstance.signatures).toMatchSnapshot();
		});
	});
});

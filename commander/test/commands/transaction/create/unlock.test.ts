/*
 * LiskHQ/lisk-commander
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
 *
 */
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as transactions from '@liskhq/lisk-transactions';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as readerUtils from '../../../../src/utils/reader';

describe.only('transaction:create:unlock', () => {
	const defaultSenderPublicKey =
		'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	const defaultPassphrase = '123';
	const defaultNonce = 1;
	const defaultFee = 1;
	const defaultDelegateAddress = '123L';

	const defaultUnlockTransaction = {
		nonce: defaultNonce,
		fee: defaultFee,
		passphrase: defaultPassphrase,
		networkIdentifier,
		senderPublicKey: defaultSenderPublicKey,
		type: transactions.UnlockTransaction.TYPE,
		asset: {
			unlockingObjects: [
				{
					delegateAddress: defaultDelegateAddress,
					amount: '1000000000',
					unvoteHeight: 500,
				},
			],
		},
	};

	const printMethodStub = sandbox.stub();

	const setupStub = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
			.stub(
				transactions,
				'unlockToken',
				sandbox.stub().returns(defaultUnlockTransaction),
			)
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultPassphrase),
			)
			.stdout();

	describe('transaction:create:unlock', () => {
		setupStub()
			.command(['transaction:create:unlock', '1', '100000000'])
			.catch(error => {
				return expect(error.message).to.contain(
					'At least one unlock object options must be provided.',
				);
			})
			.it('should throw an error without unlock flag');
	});

	describe('transaction:create:unlock --unlock="x,y,z"', () => {
		setupStub()
			.command([
				'transaction:create:unlock',
				'1',
				'100000000',
				'--unlock=123,1000000,100',
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'Address format does not match requirements. Expected "L" at the end.',
				);
			})
			.it('should throw an error for invalid address format in unlock object');
	});

	describe('transaction:create:unlock --unlock="x,y,z"', () => {
		setupStub()
			.command([
				'transaction:create:unlock',
				'1',
				'1',
				`--unlock=${defaultDelegateAddress},1000000000,500`,
			])
			.it('should create a unlock transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.unlockToken).to.be.calledWithExactly({
					nonce: defaultNonce.toString(),
					fee: '100000000',
					networkIdentifier,
					passphrase: defaultPassphrase,
					unlockingObjects: [
						{
							delegateAddress: defaultDelegateAddress,
							amount: '1000000000',
							unvoteHeight: 500,
						},
					],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultUnlockTransaction,
				);
			});
	});

	describe('transaction:create:unlock --unlock="x,y,z"', () => {
		setupStub()
			.command([
				'transaction:create:unlock',
				'1',
				'1',
				`--unlock=${defaultDelegateAddress},1000000000,500`,
				'--unlock=456L,1000000000,500',
			])
			.it(
				'should create a unlock transaction with multiple unlock objects',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
						'passphrase',
						true,
					);

					return expect(transactions.unlockToken).to.be.calledWithExactly({
						nonce: defaultNonce.toString(),
						fee: '100000000',
						networkIdentifier,
						passphrase: defaultPassphrase,
						unlockingObjects: [
							{
								delegateAddress: defaultDelegateAddress,
								amount: '1000000000',
								unvoteHeight: 500,
							},
							{
								delegateAddress: '456L',
								amount: '1000000000',
								unvoteHeight: 500,
							},
						],
					});
				},
			);
	});

	describe('transaction:create:unlock --unlock="x,y,z" --no-signature', () => {
		setupStub()
			.command([
				'transaction:create:unlock',
				'1',
				'1',
				`--unlock=${defaultDelegateAddress},1000000000,500`,
				'--no-signature',
			])
			.it('should create a unlock transaction without signature', () => {
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				expect(transactions.unlockToken).to.be.calledWithExactly({
					nonce: defaultNonce.toString(),
					fee: '100000000',
					networkIdentifier,
					passphrase: undefined,
					unlockingObjects: [
						{
							delegateAddress: defaultDelegateAddress,
							amount: '1000000000',
							unvoteHeight: 500,
						},
					],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultUnlockTransaction,
				);
			});
	});

	describe('transaction:create:unlock --unlock="x,y,z" --passphrase=123', () => {
		setupStub()
			.command([
				'transaction:create:unlock',
				'1',
				'1',
				`--unlock=${defaultDelegateAddress},1000000000,500`,
				'--passphrase=123',
			])
			.it(
				'should create a unlock transaction with the passphrase from the flag',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(transactions.unlockToken).to.be.calledWithExactly({
						nonce: defaultNonce.toString(),
						fee: '100000000',
						networkIdentifier,
						passphrase: defaultPassphrase,
						unlockingObjects: [
							{
								delegateAddress: defaultDelegateAddress,
								amount: '1000000000',
								unvoteHeight: 500,
							},
						],
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultUnlockTransaction,
					);
				},
			);
	});
});

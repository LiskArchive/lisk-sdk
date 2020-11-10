/*
 * LiskHQ/lisk-commander
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
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as transactions from '@liskhq/lisk-transactions';
import * as config from '../../../../src/utils/config';
import * as printUtils from '../../../../src/utils/print';
import * as readerUtils from '../../../../src/utils/reader';

describe('transaction:create:delegate', () => {
	const defaultUsername = 'user-light';
	const defaultInputs = '123';
	const defaultTransaction = {
		nonce: '0',
		fee: '10000000',
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 0,
		recipientPublicKey: null,
		asset: {},
	};
	const testnetNetworkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
			.stub(
				transactions,
				'registerDelegate',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:delegate', () => {
		setupTest()
			.command(['transaction:create:delegate'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 3 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:delegate username', () => {
		setupTest()
			.command(['transaction:create:delegate', '1', '100', defaultUsername])
			.it('create a transaction with the username', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerDelegate).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: defaultInputs,
					username: defaultUsername,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:delegate username --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:delegate',
				'1',
				'100',
				defaultUsername,
				'--passphrase=123',
			])
			.it(
				'create a transaction with the username with the passphrase from flag',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(transactions.registerDelegate).to.be.calledWithExactly({
						nonce: '1',
						fee: '10000000000',
						networkIdentifier: testnetNetworkIdentifier,
						passphrase: defaultInputs,
						username: defaultUsername,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:delegate username --no-signature', () => {
		setupTest()
			.command([
				'transaction:create:delegate',
				'1',
				'100',
				defaultUsername,
				'--no-signature',
			])
			.it('create a transaction with the username without signature', () => {
				expect(transactions.registerDelegate).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: undefined,
					username: defaultUsername,
				});
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});
});

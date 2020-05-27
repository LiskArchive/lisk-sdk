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

describe('transaction:create:pom', () => {
	const defaultHeader1 = {
		version: 2,
		timestamp: 2000000,
		previousBlockId: '10620616195853047363',
		seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
		height: 300000,
		maxHeightPreviouslyForged: 90000,
		maxHeightPrevoted: 100000,
		numberOfTransactions: 0,
		totalAmount: '0',
		totalFee: '10000000000',
		reward: '10000000000',
		payloadLength: 0,
		transactionRoot:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		blockSignature:
			'd87f2eafb2f8022d4a1171fa5735466f5fa5749dfc6d2a3978d69d266aadfe4929a65925daaf380c1323d34049bc0aef5d5ad12916ab137c8829ef42f12d400b',
	};
	const defaultHeader2 = {
		version: 2,
		timestamp: 3000000,
		previousBlockId: '10620616195853047363',
		seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
		height: 200000,
		maxHeightPreviouslyForged: 100000,
		maxHeightPrevoted: 100000,
		numberOfTransactions: 0,
		totalAmount: '0',
		totalFee: '10000000000',
		reward: '10000000000',
		payloadLength: 0,
		transactionRoot:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		blockSignature:
			'c86e638c27d39c033cc8bb107c5a5a19f6e95361314d2d74b715d96ddfac6d156ea77d798dbd34203920e33525c5645ac01931043e3c0021a6da068048fa770a',
	};

	const defaultInputs = '123';
	const defaultTransaction = {
		nonce: '0',
		fee: '10000000',
		amount: '10000000000',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 15,
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
				'reportMisbehavior',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:pom', () => {
		setupTest()
			.command(['transaction:create:pom'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 4 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:delegate nonce fee header1 header2', () => {
		setupTest()
			.command([
				'transaction:create:pom',
				'1',
				'100',
				JSON.stringify(defaultHeader1),
				JSON.stringify(defaultHeader2),
			])
			.it('create a transaction with the header 1 and header 2', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.reportMisbehavior).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: defaultInputs,
					header1: defaultHeader1,
					header2: defaultHeader2,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:pom nonce fee header1 header2 --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:create:pom',
				'1',
				'100',
				JSON.stringify(defaultHeader1),
				JSON.stringify(defaultHeader2),
				'--passphrase=123',
			])
			.it(
				'create a transaction with the headers with the passphrase from flag',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					expect(transactions.reportMisbehavior).to.be.calledWithExactly({
						nonce: '1',
						fee: '10000000000',
						networkIdentifier: testnetNetworkIdentifier,
						passphrase: defaultInputs,
						header1: defaultHeader1,
						header2: defaultHeader2,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultTransaction,
					);
				},
			);
	});

	describe('transaction:create:pom nonce fee header1 header2 --no-signature', () => {
		setupTest()
			.command([
				'transaction:create:pom',
				'1',
				'100',
				JSON.stringify(defaultHeader1),
				JSON.stringify(defaultHeader2),
				'--no-signature',
			])
			.it('create a transaction with the username without signature', () => {
				expect(transactions.reportMisbehavior).to.be.calledWithExactly({
					nonce: '1',
					fee: '10000000000',
					networkIdentifier: testnetNetworkIdentifier,
					passphrase: undefined,
					header1: defaultHeader1,
					header2: defaultHeader2,
				});
				expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});
});

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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as readerUtils from '../../../src/utils/reader';

describe('transaction:sign', () => {
	const defaultTransaction = {
		type: 8,
		nonce: '0',
		fee: '10000000',
		senderPublicKey:
			'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		asset: {
			recipientId: '18141291412139607230L',
			amount: '1234567890',
			data: 'random data',
		},
	};

	const invalidTransaction = 'invalid transaction';
	const firstPassphrase =
		'wear protect skill sentence lift enter wild sting lottery power floor neglect';
	const anotherUserPassphrase =
		'inherit moon normal relief spring bargain hobby join baby flash fog blood';
	const KeyOne =
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe';
	const KeyTwo =
		'eb06e0a8cbb848f81f126b538794eb122ae8035917ded1da3e5c85618602f3ba';

	const defaultSignedTransaction = {
		...defaultTransaction,
		senderId: '2129300327344985743L',
		signatures: [
			'483cc0efdb019d4910ea577d44d95f7115c4bfe179a26d3f8bbbca4d9141b38143d85219a5a9cb5eff712553e0ec2e2cf3f3b570fd841030aa7289b995a1c301',
		],
		id: '10364209962572784824',
	};

	const signedTransaction = {
		id: '17223119605214098703',
		type: 8,
		senderPublicKey:
			'eb06e0a8cbb848f81f126b538794eb122ae8035917ded1da3e5c85618602f3ba',
		nonce: '1',
		fee: '100000000',
		signatures: [
			'a3cc97079e17bdd15852695faf8af7bbcb167f5ddd9f96c129f60afa252911a30c8db42d5d2a60648947082097c79cb966c7f0b267842b27397b59a92af11c05',
		],
		asset: {
			data: '{"lisk":"zug"}',
			amount: '100000000000',
			recipientId: '5553317242494141914L',
		},
	};

	const expectedMultiSignedTransaction = {
		id: '13203830993805353722',
		type: 8,
		senderPublicKey:
			'eb06e0a8cbb848f81f126b538794eb122ae8035917ded1da3e5c85618602f3ba',
		senderId: '5553317242494141914L',
		nonce: '1',
		fee: '100000000',
		signatures: [
			'a3cc97079e17bdd15852695faf8af7bbcb167f5ddd9f96c129f60afa252911a30c8db42d5d2a60648947082097c79cb966c7f0b267842b27397b59a92af11c05',
			'984c703b9766c9c72a4d68a54d24c14e75b682dc0a8f31fc0b7aa49a876a91abd265d46d7e8dc25219f3dc9e7c3c0cc015639067093b5a2db48f311cb1e0bf06',
		],
		asset: {
			data: '{"lisk":"zug"}',
			amount: '100000000000',
			recipientId: '5553317242494141914L',
		},
	};

	const mandatoryKey =
		'eb06e0a8cbb848f81f126b538794eb122ae8035917ded1da3e5c85618602f3ba';
	const optionalKey =
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe';

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
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox
					.stub()
					.resolves(firstPassphrase)
					.onSecondCall()
					.resolves(anotherUserPassphrase),
			)
			.stdout();

	describe('transaction:sign', () => {
		setupTest()
			.stub(
				readerUtils,
				'readStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error');
	});

	describe('transaction:sign transaction', () => {
		setupTest()
			.command(['transaction:sign', invalidTransaction])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error');

		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify({
					...defaultTransaction,
					asset: { ...defaultTransaction.asset, amount: '-1' },
				}),
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'Transaction: 2690216869766549278 failed at .asset.amount',
				);
			})
			.it('should throw an error when transaction is invalid');

		setupTest()
			.command(['transaction:sign', JSON.stringify(defaultTransaction)])
			.it('should take transaction from arg to sign', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction:sign transaction --passphrase=xxx', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				`--passphrase=${firstPassphrase}`,
			])
			.it(
				'should take transaction from arg and passphrase from flag to sign',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=xxx --passphrase=yyy --mandatory-key=aaa --mandatory-key=bbb --number-of-passphrases=2', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				`--passphrase=${firstPassphrase}`,
				`--passphrase=${anotherUserPassphrase}`,
				`--mandatory-key=${KeyOne}`,
				`--mandatory-key=${KeyTwo}`,
				`--number-of-passphrases=2`,
			])
			.catch(error => {
				return expect(error.message).to.contain(
					'--passphrase= cannot also be provided when using --number-of-passphrases=',
				);
			})
			.it(
				'should throw error when --number-of-passphrases flag is used in combination with --passphrase flag',
			);
	});

	describe('transaction:sign transaction --passphrase=xxx --mandatory-key=aaa', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(signedTransaction),
				`--passphrase=${anotherUserPassphrase}`,
				`--mandatory-key=${KeyOne}`,
			])
			.catch(error => {
				return expect(error.message).to.contain('Cannot read property');
			})
			.it('should throw error when optionalKey flag is missing');
	});

	describe('transaction:sign transaction --passphrase=xxx --optional-key=aaa', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(signedTransaction),
				`--passphrase=${anotherUserPassphrase}`,
				`--optional-key=${KeyOne}`,
			])
			.catch(error => {
				return expect(error.message).to.contain('Cannot read property');
			})
			.it('should throw error when mandatoryKey flag is missing');
	});

	describe('transaction:sign transaction --passphrase=yyy --mandatory-key=aaa --optional-key=bbb', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(signedTransaction),
				`--passphrase=${anotherUserPassphrase}`,
				`--mandatory-key=${mandatoryKey}`,
				`--optional-key=${optionalKey}`,
			])
			.it(
				'should take transaction from arg to and passphrase, mandatoryKey, optionalKey and numberOfSignature to sign',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).not.to.be.called;
					return expect(printMethodStub).to.be.calledWithExactly(
						expectedMultiSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=yyy --mandatory-key=aaa --optional-key=bbb', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(signedTransaction),
				`--mandatory-key=${mandatoryKey}`,
				`--optional-key=${optionalKey}`,
				`--number-of-passphrases=2`,
			])
			.it(
				'should take transaction from arg, passphrase from prompt and rest of of the flags mandatoryKey, optionalKey and numberOfSignature to sign',
				() => {
					expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
						'passphrase',
						true,
					);
					expect(readerUtils.getPassphraseFromPrompt).to.be.callCount(2);
					return expect(printMethodStub).to.be.calledWithExactly(
						expectedMultiSignedTransaction,
					);
				},
			);
	});
});

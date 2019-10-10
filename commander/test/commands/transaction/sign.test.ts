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
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as inputModule from '../../../src/utils/input/utils';
import * as inputUtils from '../../../src/utils/input';

describe('transaction:sign', () => {
	const defaultTransaction = {
		timestamp: 106582966,
		type: 0,
		senderPublicKey:
			'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
		asset: {
			recipientId: '123L',
			amount: '10000000000',
			data: undefined,
		},
		id: '14814738582865173524',
	};

	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase: '123',
	};

	const defaultInputsWithSecondPassphrase = {
		...defaultInputs,
		secondPassphrase: '456',
	};

	const defaultSignedTransaction = {
		...defaultTransaction,
		fee: '10000000',
		senderId: '12475940823804898745L',
		signatures: [],
		signature:
			'bc7bbaef2cf4bb2a3b19c0958ac3b43e102cf611af1cba3928f03a6940d663976b60902a52cb29c5e01294fa873a551211bba6d9207fcd0df0fa93305cc4d503',
	};

	const defaultSecondSignedTransaction = {
		...defaultSignedTransaction,
		id: '11148343814295761202',
		signSignature:
			'3247d8dd5de5e1a5246148c05555281e0292ac04e8bfa1fdebb9ee7411a3d8a73629e88c20b1a18b88b391869bc78bfefe78cbbbbe8a0cf8a72f1f72234cd50f',
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:sign', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
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
					'Provided transaction is invalid.',
				);
			})
			.it('should throw an error when transaction is invalid');

		setupTest()
			.command(['transaction:sign', JSON.stringify(defaultTransaction)])
			.it('should take transaction from arg to sign', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction:sign transaction --passphrase=pass:xxx', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
			])
			.it(
				'should take transaction from arg and passphrase from flag to sign',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=pass:xxx --second-passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputsWithSecondPassphrase),
			)
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'should take transaction from arg and passphrase and second passphrase from flag to sign',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:456',
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSecondSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign', () => {
		setupTest()
			.stub(inputModule, 'getStdIn', sandbox.stub().resolves({}))
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when stdin is empty');

		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: invalidTransaction }),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error when std is an invalid JSON format');

		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:sign'])
			.it('should take transaction from stdin and sign', () => {
				expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: undefined,
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction | transaction:sign --passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command(['transaction:sign', '--passphrase=pass:123'])
			.it(
				'should take transaction from stdin and sign with passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: undefined,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign --passphrase=pass:xxx --second-passphrase=pass:xxx', () => {
		setupTest()
			.stub(
				inputModule,
				'getStdIn',
				sandbox.stub().resolves({ data: JSON.stringify(defaultTransaction) }),
			)
			.command([
				'transaction:sign',
				'--passphrase=pass:abc',
				'--second-passphrase=pass:def',
			])
			.it(
				'should take transaction from stdin and sign with passphrase and second passphrase from flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:abc',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:def',
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});
});

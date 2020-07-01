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

// This needs to be re-implemented using codec with https://github.com/LiskHQ/lisk-core/issues/254
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('transaction:create:multisignature', () => {
	const nonce = '1';
	const fee = '0.5';
	const defaultInputs = '123';
	const defaultSenderPublicKey =
		'5674667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164451ca6';
	const mandatoryKeys = [
		'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
		'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
	];
	const optionalKeys = [
		'456d667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164451bca',
		'768abfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1c356',
	];
	const numberOfSignatures = 3;
	const testnetNetworkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	const defaultTransaction = {
		nonce,
		fee: '1000000000000000',
		passphrase: defaultInputs,
		networkIdentifier: testnetNetworkIdentifier,
		senderPublicKey: defaultSenderPublicKey,
		type: 12,
		asset: {
			mandatoryKeys: [],
			optionalKeys: [],
			numberOfSignatures: 0,
		},
	};
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
				'registerMultisignature',
				sandbox.stub().returns(defaultTransaction),
			)
			.stub(
				readerUtils,
				'getPassphraseFromPrompt',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:create:multisignature', () => {
		setupTest()
			.command(['transaction:create:multisignature'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 2 required args');
			})
			.it('should throw an error');
	});

	describe('transaction:create:multisignature nonce', () => {
		setupTest()
			.command(['transaction:create:multisignature', nonce])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('transaction:create:multisignature nonce fee', () => {
		setupTest()
			.command(['transaction:create:multisignature', nonce, fee])
			.it('should create a multisignature transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerMultisignature).to.be.calledWithExactly({
					nonce,
					fee: '50000000',
					networkIdentifier: testnetNetworkIdentifier,
					senderPassphrase: defaultInputs,
					numberOfSignatures: 0,
					mandatoryKeys: [],
					optionalKeys: [],
					passphrases: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe(`transaction:create:multisignature nonce fee --number-of-signatures ${numberOfSignatures}`, () => {
		setupTest()
			.command([
				'transaction:create:multisignature',
				nonce,
				fee,
				`--number-of-signatures=${numberOfSignatures}`,
			])
			.it('should create a multisignature transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerMultisignature).to.be.calledWithExactly({
					nonce,
					fee: '50000000',
					networkIdentifier: testnetNetworkIdentifier,
					senderPassphrase: defaultInputs,
					numberOfSignatures,
					mandatoryKeys: [],
					optionalKeys: [],
					passphrases: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe(`transaction:create:multisignature nonce fee --mandatory-key=${mandatoryKeys[0]} --mandatory-key=${mandatoryKeys[1]}`, () => {
		setupTest()
			.command([
				'transaction:create:multisignature',
				nonce,
				fee,
				`--mandatory-key=${mandatoryKeys[0]}`,
				`--mandatory-key=${mandatoryKeys[1]}`,
			])
			.it('should create a multisignature transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerMultisignature).to.be.calledWithExactly({
					nonce,
					fee: '50000000',
					networkIdentifier: testnetNetworkIdentifier,
					senderPassphrase: defaultInputs,
					numberOfSignatures: 0,
					mandatoryKeys,
					optionalKeys: [],
					passphrases: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe(`transaction:create:multisignature nonce fee --optional-key=${optionalKeys[0]} --optional-key=${optionalKeys[1]}`, () => {
		setupTest()
			.command([
				'transaction:create:multisignature',
				nonce,
				fee,
				`--optional-key=${optionalKeys[0]}`,
				`--optional-key=${optionalKeys[1]}`,
			])
			.it('should create a multisignature transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerMultisignature).to.be.calledWithExactly({
					nonce,
					fee: '50000000',
					networkIdentifier: testnetNetworkIdentifier,
					senderPassphrase: defaultInputs,
					numberOfSignatures: 0,
					mandatoryKeys: [],
					optionalKeys,
					passphrases: [],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});

	describe('transaction:create:multisignature nonce fee --member-passphrase=yyy --member-passphrase=zzz', () => {
		setupTest()
			.command([
				'transaction:create:multisignature',
				nonce,
				fee,
				'--member-passphrase=yyy',
				'--member-passphrase=zzz',
			])
			.it('should create a multisignature transaction', () => {
				expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly(
					'passphrase',
					true,
				);
				expect(transactions.registerMultisignature).to.be.calledWithExactly({
					nonce,
					fee: '50000000',
					networkIdentifier: testnetNetworkIdentifier,
					senderPassphrase: defaultInputs,
					numberOfSignatures: 0,
					mandatoryKeys: [],
					optionalKeys: [],
					passphrases: ['yyy', 'zzz'],
				});
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultTransaction,
				);
			});
	});
});

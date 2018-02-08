/*
 * Copyright © 2017 Lisk Foundation
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
import {
	signTransaction,
	multiSignTransaction,
	verifyTransaction,
} from 'transactions/utils';

import cryptoModule from 'cryptography';

const getTransactionHash = require('transactions/utils/getTransactionHash');

describe('signAndVerify transaction utils', () => {
	const defaultPassphrase =
		'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPublicKey =
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultSecondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSignature =
		'bb3f2d12d098c59a0af03bb1157eeb7bc7141b21cea57861c4eac72a7c55f122b5befb1391c3f8509b562fa748fdc7359f6e6051526d979915157c5bcba34e01';
	const defaultSecondSignature =
		'897090248c0ecdad749d869ddeae59e5029bdbe4806da92d82d6eb7142b624011f4302941db184a2e70bd29a6adac5ce0b4cf780af893db2f504375bdef6850b';
	const defaultHash = Buffer.from(
		'c62214460d66eeb1d9db3fb708e31040d2629fbdb6c93887c5eb0f3243912f91',
		'hex',
	);

	let defaultTransaction;
	let cryptoSignDataStub;
	let cryptoVerifyDataStub;
	let getTransactionHashStub;

	beforeEach(() => {
		defaultTransaction = {
			type: 0,
			amount: 1000,
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: defaultPublicKey,
		};

		cryptoSignDataStub = sandbox
			.stub(cryptoModule, 'signData')
			.returns(defaultSignature);
		cryptoVerifyDataStub = sandbox
			.stub(cryptoModule, 'verifyData')
			.returns(true);
		getTransactionHashStub = sandbox
			.stub(getTransactionHash, 'default')
			.returns(defaultHash);
	});

	describe('#signTransaction', () => {
		let transaction;
		let signature;

		beforeEach(() => {
			transaction = Object.assign({}, defaultTransaction);
			signature = signTransaction(transaction, defaultPassphrase);
		});

		it('should get the transaction hash', () => {
			return getTransactionHashStub.should.be.calledWithExactly(transaction);
		});

		it('should sign the transaction hash with the passphrase', () => {
			return cryptoSignDataStub.should.be.calledWithExactly(
				defaultHash,
				defaultPassphrase,
			);
		});

		it('should return the signature', () => {
			signature.should.be.equal(defaultSignature);
		});
	});

	describe('#multiSignTransaction', () => {
		const defaultMultisignatureHash = Buffer.from(
			'd43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760',
			'hex',
		);

		let multiSignatureTransaction;
		let signature;

		beforeEach(() => {
			multiSignatureTransaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey:
					'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature:
					'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature:
					'508a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};
			getTransactionHashStub.returns(defaultMultisignatureHash);
			signature = multiSignTransaction(
				multiSignatureTransaction,
				defaultPassphrase,
			);
		});

		it('should remove the signature and second signature before getting transaction hash', () => {
			getTransactionHashStub.args[0].should.not.have.property('signature');
			return getTransactionHashStub.args[0].should.not.have.property(
				'signSignature',
			);
		});

		it('should sign the transaction hash with the passphrase', () => {
			return cryptoSignDataStub.should.be.calledWithExactly(
				defaultMultisignatureHash,
				defaultPassphrase,
			);
		});

		it('should return the signature', () => {
			return signature.should.be.equal(defaultSignature);
		});
	});

	describe('#verifyTransaction', () => {
		let transaction;

		describe('with a single signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: defaultSignature,
				});
			});

			it('should remove the signature before getting transaction hash', () => {
				verifyTransaction(transaction);
				return getTransactionHashStub.args[0].should.not.have.property(
					'signature',
				);
			});

			it('should verify the transaction using the hash, the signature and the public key', () => {
				verifyTransaction(transaction);
				return cryptoVerifyDataStub.should.be.calledWithExactly(
					defaultHash,
					defaultSignature,
					defaultPublicKey,
				);
			});

			it('should return false for an invalid signature', () => {
				cryptoVerifyDataStub.returns(false);
				const verification = verifyTransaction(transaction);
				return verification.should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(transaction);
				return verification.should.be.true();
			});
		});

		describe('with a second signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: defaultSignature,
					signSignature: defaultSecondSignature,
				});
				getTransactionHashStub
					.onFirstCall()
					.returns(
						Buffer.from(
							'951bb4580dcb6a412de28844e0e06439c5c51dfea2a16730fd94ff20e355f1bd',
							'hex',
						),
					);
			});

			it('should throw if attempting to verify without a secondPublicKey', () => {
				return verifyTransaction
					.bind(null, transaction)
					.should.throw('Cannot verify signSignature without secondPublicKey.');
			});

			it('should remove the second signature before getting the first transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				return getTransactionHashStub.firstCall.args[0].should.not.have.property(
					'signSignature',
				);
			});

			it('should remove the first signature before getting the second transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				return getTransactionHashStub.secondCall.args[0].should.not.have.property(
					'signature',
				);
			});

			it('should return false for an invalid second signature', () => {
				cryptoVerifyDataStub.returns(false);
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.false();
			});

			it('should return false for an invalid first signature', () => {
				cryptoVerifyDataStub.onSecondCall().returns(false);
				getTransactionHashStub
					.onFirstCall()
					.returns(
						Buffer.from(
							'aef147521619556572f204585332aac247dc2b024cb975518d847e4587bab756',
							'hex',
						),
					);
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				return verification.should.be.true();
			});
		});
	});
});

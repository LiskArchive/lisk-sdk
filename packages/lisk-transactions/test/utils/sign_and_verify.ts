/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import cryptography from '@liskhq/lisk-cryptography';
import {
	signTransaction,
	multiSignTransaction,
	verifyTransaction,
} from '../../src/utils';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import fixtureTransactions from '../../fixtures/transactions.json';
import {
	PartialTransaction,
	BaseTransaction,
} from '../../src/transaction_types';
import * as getTransactionHashModule from '../../src/utils/get_transaction_hash';
// Require is used for stubbing
const validTransactions = fixtureTransactions as ReadonlyArray<BaseTransaction>;

describe('signAndVerify module', () => {
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

		let defaultTransaction: PartialTransaction;
		let cryptoSignDataStub: sinon.SinonStub;
		let cryptoVerifyDataStub: sinon.SinonStub;
		let getTransactionHashStub: sinon.SinonStub;

		beforeEach(() => {
			defaultTransaction = {
				type: 0,
				amount: '1000',
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				id: '13987348420913138422',
				senderPublicKey: defaultPublicKey,
			};

			cryptoSignDataStub = sandbox
				.stub(cryptography, 'signData')
				.returns(defaultSignature);
			cryptoVerifyDataStub = sandbox
				.stub(cryptography, 'verifyData')
				.returns(true);
			getTransactionHashStub = sandbox
				.stub(getTransactionHashModule, 'getTransactionHash')
				.returns(defaultHash);
			return Promise.resolve();
		});

		describe('#signTransaction', () => {
			let transaction: BaseTransaction;
			let signature: string;

			beforeEach(() => {
				transaction = { ...defaultTransaction } as BaseTransaction;
				signature = signTransaction(transaction, defaultPassphrase);
				return Promise.resolve();
			});

			it('should get the transaction hash', () => {
				return expect(getTransactionHashStub).to.be.calledWithExactly(
					transaction,
				);
			});

			it('should sign the transaction hash with the passphrase', () => {
				return expect(cryptoSignDataStub).to.be.calledWithExactly(
					defaultHash,
					defaultPassphrase,
				);
			});

			it('should return the signature', () => {
				return expect(signature).to.be.equal(defaultSignature);
			});
		});

		describe('#multiSignTransaction', () => {
			const defaultMultisignatureHash = Buffer.from(
				'd43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760',
				'hex',
			);

			let multiSignatureTransaction: BaseTransaction;
			let signature: string;

			beforeEach(() => {
				multiSignatureTransaction = {
					type: 0,
					amount: '1000',
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
				} as BaseTransaction;
				getTransactionHashStub.returns(defaultMultisignatureHash);
				signature = multiSignTransaction(
					multiSignatureTransaction,
					defaultPassphrase,
				);
				return Promise.resolve();
			});

			it('should remove the signature and second signature before getting transaction hash', () => {
				expect(getTransactionHashStub.args[0]).not.to.have.property(
					'signature',
				);
				return expect(getTransactionHashStub.args[0]).not.to.have.property(
					'signSignature',
				);
			});

			it('should sign the transaction hash with the passphrase', () => {
				return expect(cryptoSignDataStub).to.be.calledWithExactly(
					defaultMultisignatureHash,
					defaultPassphrase,
				);
			});

			it('should return the signature', () => {
				return expect(signature).to.be.equal(defaultSignature);
			});
		});

		describe('#verifyTransaction', () => {
			let transaction: BaseTransaction;

			describe('with a single signed transaction', () => {
				beforeEach(() => {
					transaction = {
						...defaultTransaction,
						signature: defaultSignature,
					} as BaseTransaction;
					return Promise.resolve();
				});

				it('should throw if attempting to verify without a secondPublicKey', () => {
					const { signature, ...invalidTransaction } = transaction;
					return expect(
						verifyTransaction.bind(null, invalidTransaction),
					).to.throw('Cannot verify transaction without signature.');
				});

				it('should remove the signature before getting transaction hash', () => {
					verifyTransaction(transaction);
					return expect(getTransactionHashStub.args[0]).not.to.have.property(
						'signature',
					);
				});

				it('should verify the transaction using the hash, the signature and the public key', () => {
					verifyTransaction(transaction);
					return expect(cryptoVerifyDataStub).to.be.calledWithExactly(
						defaultHash,
						defaultSignature,
						defaultPublicKey,
					);
				});

				it('should return false for an invalid signature', () => {
					cryptoVerifyDataStub.returns(false);
					const verification = verifyTransaction(transaction);
					return expect(verification).to.be.false;
				});

				it('should return true for a valid signature', () => {
					const verification = verifyTransaction(transaction);
					return expect(verification).to.be.true;
				});
			});

			describe('with a second signed transaction', () => {
				beforeEach(() => {
					transaction = {
						...defaultTransaction,
						signature: defaultSignature,
						signSignature: defaultSecondSignature,
					} as BaseTransaction;
					return getTransactionHashStub
						.onFirstCall()
						.returns(
							Buffer.from(
								'951bb4580dcb6a412de28844e0e06439c5c51dfea2a16730fd94ff20e355f1bd',
								'hex',
							),
						);
				});

				it('should throw if attempting to verify without a secondPublicKey', () => {
					const { signature, ...invalidTransaction } = transaction;
					return expect(
						verifyTransaction.bind(null, invalidTransaction),
					).to.throw('Cannot verify transaction without signature.');
				});

				it('should throw if attempting to verify without a secondPublicKey', () => {
					return expect(verifyTransaction.bind(null, transaction)).to.throw(
						'Cannot verify signSignature without secondPublicKey.',
					);
				});

				it('should remove the second signature before getting the first transaction hash', () => {
					verifyTransaction(transaction, defaultSecondPublicKey);
					return expect(
						getTransactionHashStub.firstCall.args[0],
					).not.to.have.property('signSignature');
				});

				it('should remove the first signature before getting the second transaction hash', () => {
					verifyTransaction(transaction, defaultSecondPublicKey);
					return expect(
						getTransactionHashStub.secondCall.args[0],
					).not.to.have.property('signature');
				});

				it('should return false for an invalid second signature', () => {
					cryptoVerifyDataStub.returns(false);
					const verification = verifyTransaction(
						transaction,
						defaultSecondPublicKey,
					);
					return expect(verification).to.be.false;
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
					return expect(verification).to.be.false;
				});

				it('should return true for a valid signature', () => {
					const verification = verifyTransaction(
						transaction,
						defaultSecondPublicKey,
					);
					return expect(verification).to.be.true;
				});
			});
		});
	});

	describe('integration sign and verify', () => {
		describe('given a set of transactions', () => {
			describe('#signTransaction', () => {
				describe('given a passphrase and a second passphrase', () => {
					const passphrase =
						'wagon stock borrow episode laundry kitten salute link globe zero feed marble';
					const secondPassphrase =
						'trouble float modify long valve group ozone possible remove dirt bicycle riot';

					describe('when tested on the first signature', () => {
						it('should create the correct signature', () => {
							return validTransactions.forEach(transaction => {
								const { signature, signSignature, ...rawTx } = transaction;
								return expect(signTransaction(rawTx, passphrase)).to.be.equal(
									signature,
								);
							});
						});
					});

					describe('when tested on the second signature', () => {
						it('should create the correct signature', () => {
							return validTransactions.forEach(transaction => {
								const { signSignature } = transaction;
								if (signSignature) {
									const { signSignature, ...rawTx } = transaction;
									return expect(
										signTransaction(rawTx, secondPassphrase),
									).to.be.equal(signSignature);
								}
								return true;
							});
						});
					});
				});
			});

			describe('#verifyTransaction', () => {
				describe('when executed', () => {
					const secondPublicKey =
						'f9666bfed9ef2ff52a04408f22f2bfffaa81384c9433463697330224f10032a4';
					it('should verify all the transactions', () => {
						return validTransactions.forEach(transaction => {
							return expect(verifyTransaction(transaction, secondPublicKey)).to
								.be.true;
						});
					});
				});
			});
		});
	});
});

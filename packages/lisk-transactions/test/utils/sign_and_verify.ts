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
import * as cryptography from '@liskhq/lisk-cryptography';
import {
	signTransaction,
	multiSignTransaction,
	verifyMultisignatures,
	verifySignature,
	verifyTransaction,
} from '../../src/utils';
import { TransactionError } from '../../src/errors';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import fixtureTransactions from '../../fixtures/transactions.json';
import { TransactionJSON } from '../../src/transaction_types';
import * as getTransactionHashModule from '../../src/utils/get_transaction_hash';
// Require is used for stubbing
const validTransactions = (fixtureTransactions as unknown) as ReadonlyArray<
	TransactionJSON
>;

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

		let defaultTransaction: TransactionJSON;
		let cryptoSignDataStub: sinon.SinonStub;
		let cryptoVerifyDataStub: sinon.SinonStub;
		let getTransactionHashStub: sinon.SinonStub;

		beforeEach(() => {
			defaultTransaction = {
				type: 0,
				amount: '1000',
				fee: '1',
				recipientId: '58191285901858109L',
				recipientPublicKey: '',
				senderId: '',
				timestamp: 141738,
				asset: {},
				id: '13987348420913138422',
				senderPublicKey: defaultPublicKey,
				receivedAt: new Date(),
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
			let transaction: TransactionJSON;
			let signature: string;

			beforeEach(() => {
				transaction = { ...defaultTransaction } as TransactionJSON;
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

			let multiSignatureTransaction: TransactionJSON;
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
				} as TransactionJSON;
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

		describe('#verifySignature', () => {
			const defaultTransaction = {
				amount: '10000000000',
				recipientId: '13356260975429434553L',
				senderId: '',
				senderPublicKey:
					'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8',
				timestamp: 80685381,
				type: 0,
				fee: '10000000',
				recipientPublicKey: '',
				asset: {},
				signature:
					'3357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
				signSignature:
					'11f77b8596df14400f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
				id: '11638517642515821734',
				receivedAt: new Date(),
			};

			beforeEach(() => {
				cryptoVerifyDataStub.restore();
			});

			const defaultSecondPublicKey =
				'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8';

			const defaultTransactionBytes = Buffer.from(
				'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b5402000000',
				'hex',
			);

			describe('given a valid signature', () => {
				it('should return an object with verified = true', () => {
					const { verified } = verifySignature(
						defaultTransaction.senderPublicKey,
						defaultTransaction.signature,
						defaultTransactionBytes,
					);

					return expect(verified).to.be.true;
				});
			});

			describe('given an invalid signature', () => {
				let invalidSignature = defaultTransaction.signature.replace('1', '0');

				it('should return an object with verified = false', () => {
					const { verified } = verifySignature(
						defaultTransaction.senderPublicKey,
						invalidSignature,
						Buffer.from(defaultTransactionBytes),
					);

					return expect(verified).to.be.false;
				});

				it('should return an object with transaction error', () => {
					const { error } = verifySignature(
						defaultTransaction.senderPublicKey,
						invalidSignature,
						Buffer.from(defaultTransactionBytes),
					);

					return expect(error).to.be.instanceof(TransactionError);
				});
			});

			const defaultSecondSignatureTransactionBytes = Buffer.from(
				'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b54020000003357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
				'hex',
			);

			describe('given a valid signSignature', () => {
				it('should return an object with verfied = true', () => {
					const { verified } = verifySignature(
						defaultSecondPublicKey,
						defaultTransaction.signSignature,
						defaultSecondSignatureTransactionBytes,
					);
					return expect(verified).to.be.true;
				});
			});

			describe('given an invalid signSignature', () => {
				let invalidSignature = defaultTransaction.signSignature.replace(
					'1',
					'0',
				);

				it('should return an object with verified = false', () => {
					const { verified } = verifySignature(
						defaultSecondPublicKey,
						invalidSignature,
						defaultSecondSignatureTransactionBytes,
					);

					return expect(verified).to.be.false;
				});

				it('should return an object with transaction error', () => {
					const { error } = verifySignature(
						defaultSecondPublicKey,
						invalidSignature,
						defaultSecondSignatureTransactionBytes,
					);

					return expect(error).to.be.instanceof(TransactionError);
				});
			});
		});

		describe('#verifyMultisignatures', () => {
			const defaultMemberPublicKeys = [
				'c44a88e68196e4d2f608873467c7350fb92b954eb7c3b31a989b1afd8d55ebdb',
				'2eca11a4786f35f367299e1defd6a22ac4eb25d2552325d6c5126583a3bdd0fb',
				'a17e03f21bfa187d2a30fe389aa78431c587bf850e9fa851b3841274fc9f100f',
				'758fc45791faf5796e8201e49950a9ee1ee788192714b935be982f315b1af8cd',
				'9af12d260cf5fcc49bf8e8fce2880b34268c7a4ac8915e549c07429a01f2e4a5',
			];

			const defaultTransaction = {
				id: '15181013796707110990',
				type: 0,
				timestamp: 77612766,
				senderPublicKey:
					'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
				senderId: '4368107197830030479L',
				recipientId: '4368107197830030479L',
				recipientPublicKey:
					'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
				amount: '100000000',
				fee: '10000000',
				signature:
					'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08',
				signatures: [
					'2df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
					'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
					'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
				],
				asset: {
					data: 'the real test',
				},
				receivedAt: new Date(),
			};

			beforeEach(() => {
				cryptoVerifyDataStub.restore();
			});

			const defaultTransactionBytes = Buffer.from(
				'00de46a00424193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d3c9ea25a6b7c648f00e1f50500000000746865207265616c2074657374',
				'hex',
			);

			describe('given valid multisignatures', () => {
				beforeEach(() => {
					cryptoVerifyDataStub.restore();

					return Promise.resolve();
				});

				it('should return an object with verfied = true', () => {
					const { verified } = verifyMultisignatures(
						defaultMemberPublicKeys,
						defaultTransaction.signatures,
						3,
						defaultTransactionBytes,
					);
					return expect(verified).to.be.true;
				});

				describe('when not enough valid signatures', () => {
					it('should return a verification fail response', () => {
						const { verified, errors } = verifyMultisignatures(
							defaultMemberPublicKeys,
							defaultTransaction.signatures.slice(0, 1),
							3,
							defaultTransactionBytes,
						);

						const errorsArray = errors as ReadonlyArray<TransactionError>;

						expect(errors).to.be.an('array');
						errorsArray.forEach(error =>
							expect(error).to.be.instanceof(TransactionError),
						);
						return expect(verified).to.be.false;
					});
				});
			});

			describe('given an invalid multisignatures', () => {
				let invalidSignatures: ReadonlyArray<string>;
				beforeEach(() => {
					invalidSignatures = defaultTransaction.signatures.map(signature =>
						signature.replace('1', '0'),
					);

					return Promise.resolve();
				});

				it('should return a verification fail response', () => {
					const { verified, errors } = verifyMultisignatures(
						defaultMemberPublicKeys,
						invalidSignatures,
						3,
						defaultTransactionBytes,
					);
					const errorsArray = errors as ReadonlyArray<TransactionError>;

					expect(errors).to.be.an('array');
					errorsArray.forEach(error =>
						expect(error).to.be.instanceof(TransactionError),
					);
					return expect(verified).to.be.false;
				});
			});
		});

		describe('#verifyTransaction', () => {
			let transaction: TransactionJSON;

			describe('with a single signed transaction', () => {
				beforeEach(() => {
					transaction = {
						...defaultTransaction,
						signature: defaultSignature,
					} as TransactionJSON;
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
					} as TransactionJSON;
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

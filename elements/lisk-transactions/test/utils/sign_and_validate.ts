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
import { expect } from 'chai';
import * as cryptography from '@liskhq/lisk-cryptography';
import { addTransactionFields } from '../helpers';
import {
	signTransaction,
	multiSignTransaction,
	validateMultisignatures,
	validateSignature,
	verifyTransaction,
} from '../../src/utils';
import { TransactionError, TransactionPendingError } from '../../src/errors';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import * as fixtureTransactions from '../../fixtures/transactions.json';
import { Account, TransactionJSON } from '../../src/transaction_types';
import * as getTransactionHashModule from '../../src/utils/get_transaction_hash';
import {
	validMultisignatureAccount as defaultMultisignatureAccount,
	validMultisignatureTransaction,
	validSecondSignatureTransaction,
} from '../../fixtures';

// Require is used for stubbing
const validTransactions = (fixtureTransactions as unknown) as ReadonlyArray<
	TransactionJSON
>;

describe('signAndVerify module', () => {
	describe('#validateSignature', () => {
		const defaultSecondSignatureTransaction = addTransactionFields(
			validSecondSignatureTransaction,
		);
		const defaultSecondSignatureTransactionBytes = Buffer.from(
			'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b54020000003357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
			'hex',
		);
		const defaultSecondPublicKey =
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8';
		const defaultTransactionBytes = Buffer.from(
			'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b5402000000',
			'hex',
		);

		it('should call cryptography hash', async () => {
			const cryptographyHashStub = sandbox
				.stub(cryptography, 'hash')
				.returns(
					Buffer.from(
						'62b13b81836f3f1e371eba2f7f8306ff23d00a87d9473793eda7f742f4cfc21c',
						'hex',
					),
				);

			validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(cryptographyHashStub).to.be.calledOnce;
		});

		it('should call cryptography verifyData', async () => {
			const cryptographyVerifyDataStub = sandbox
				.stub(cryptography, 'verifyData')
				.returns(true);

			validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(cryptographyVerifyDataStub).to.be.calledOnce;
		});

		it('should return a valid response with valid signature', async () => {
			const { valid } = validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(valid).to.be.true;
		});

		it('should return an unvalid response with invalid signature', async () => {
			const { valid, error } = validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature.replace('1', '0'),
				Buffer.from(defaultTransactionBytes),
			);

			expect(valid).to.be.false;
			expect(error)
				.to.be.instanceof(TransactionError)
				.and.have.property(
					'message',
					`Failed to validate signature ${defaultSecondSignatureTransaction.signature.replace(
						'1',
						'0',
					)}`,
				);
		});

		it('should return a valid response with valid signSignature', async () => {
			const { valid } = validateSignature(
				defaultSecondPublicKey,
				defaultSecondSignatureTransaction.signSignature,
				defaultSecondSignatureTransactionBytes,
			);

			expect(valid).to.be.true;
		});

		it('should return an unvalid response with invalid signSignature', async () => {
			const { valid, error } = validateSignature(
				defaultSecondPublicKey,
				defaultSecondSignatureTransaction.signSignature.replace('1', '0'),
				defaultSecondSignatureTransactionBytes,
			);

			expect(valid).to.be.false;
			expect(error)
				.to.be.instanceof(TransactionError)
				.and.have.property(
					'message',
					`Failed to validate signature ${defaultSecondSignatureTransaction.signSignature.replace(
						'1',
						'0',
					)}`,
				);
		});
	});

	describe('#validateMultisignatures', () => {
		const defaultMultisignatureTransaction = addTransactionFields(
			validMultisignatureTransaction,
		);
		const defaultTransactionBytes = Buffer.from(
			'002c497801500660b67a2ade1e2528b7f648feef8f3b46e2f4f90ca7f5439101b5119f309d572c095724f7f2b7600a3a4200000000',
			'hex',
		);

		const {
			membersPublicKeys: memberPublicKeys,
		} = defaultMultisignatureAccount as Account;

		it('should return a valid response with valid signatures', async () => {
			const { valid } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures,
				2,
				defaultTransactionBytes,
			);

			expect(valid).to.be.true;
		});

		it('should return a verification fail response with invalid signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures.map((signature: string) =>
					signature.replace('1', '0'),
				),
				2,
				defaultTransactionBytes,
			);

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach((error, i) => {
				expect(error)
					.to.be.instanceof(TransactionError)
					.and.have.property(
						'message',
						`Failed to validate signature ${defaultMultisignatureTransaction.signatures[
							i
						].replace('1', '0')}`,
					);
			});
		});

		it('should return a verification fail response with invalid extra signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				[
					...defaultMultisignatureTransaction.signatures,
					'f321799c2d30d2be6e7b70aa29b57f9b1d6f2801d3fccf5c99623ffe45526104b1f0652c2cb586c7ae201d2557d8041b41b60154f079180bb9b85f8d06b3010c',
				],
				2,
				defaultTransactionBytes,
			);

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).to.be.instanceof(TransactionError);
			});
		});

		it('should return a verification fail response with duplicate signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				[
					...defaultMultisignatureTransaction.signatures,
					defaultMultisignatureTransaction.signatures[0],
				],
				2,
				defaultTransactionBytes,
			);

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).to.be.instanceof(TransactionError);
			});
		});

		it('should return a transaction pending error when missing signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures.slice(0, 2),
				3,
				defaultTransactionBytes,
			);

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error)
					.to.be.instanceof(TransactionPendingError)
					.and.have.property('message', 'Missing signatures');
			});
		});
	});

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
				signatures: [],
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

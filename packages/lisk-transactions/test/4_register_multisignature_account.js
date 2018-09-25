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
import cryptography from 'lisk-cryptography';
import registerMultisignatureAccount from '../src/4_register_multisignature_account';
// Require is used for stubbing
const time = require('../src/utils/time');

describe('#registerMultisignatureAccount transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const transactionType = 4;
	const keys = {
		publicKey:
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		privateKey:
			'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const timeWithOffset = 38350076;
	const fee = (15 * fixedPoint).toString();
	const amount = '0';
	const lifetime = 5;
	const minimum = 2;

	let tooShortPublicKeyKeysgroup;
	let plusPrependedPublicKeyKeysgroup;
	let keysgroup;
	let getTimeWithOffsetStub;
	let registerMultisignatureTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		keysgroup = [
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
		];
		plusPrependedPublicKeyKeysgroup = [
			'+5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		];
		tooShortPublicKeyKeysgroup = [
			'd019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9',
		];
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			registerMultisignatureTransaction = registerMultisignatureAccount({
				passphrase,
				keysgroup,
				lifetime,
				minimum,
			});
			return Promise.resolve();
		});

		it('should create a register multisignature transaction', () => {
			return expect(registerMultisignatureTransaction).to.be.ok;
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerMultisignatureAccount({
				passphrase,
				keysgroup,
				lifetime,
				minimum,
				timeOffset: offset,
			});

			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(offset);
		});

		describe('returned register multisignature transaction', () => {
			it('should be an object', () => {
				return expect(registerMultisignatureTransaction).to.be.an('object');
			});

			it('should have id string', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('id')
					.and.be.a('string');
			});

			it('should have type number equal to 4', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('type')
					.and.be.a('number')
					.and.equal(transactionType);
			});

			it('should have amount string equal to 0', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('amount')
					.and.be.a('string')
					.and.equal(amount);
			});

			it('should have fee string equal to 15 LSK', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('fee')
					.and.be.a('string')
					.and.equal(fee);
			});

			it('should have recipientId string equal to empty string', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('recipientId')
					.and.equal('');
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('senderPublicKey')
					.and.be.hexString.and.equal(keys.publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('timestamp')
					.and.be.a('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return expect(registerMultisignatureTransaction).to.have.property(
					'signature',
				).and.be.hexString;
			});

			it('should have asset', () => {
				return expect(registerMultisignatureTransaction).to.have.property(
					'asset',
				).and.not.be.empty;
			});

			it('should not have a second signature', () => {
				return expect(registerMultisignatureTransaction).not.to.have.property(
					'signSignature',
				);
			});

			describe('multisignature asset', () => {
				it('should be object', () => {
					return expect(registerMultisignatureTransaction.asset)
						.to.have.property('multisignature')
						.and.be.an('object');
				});

				it('should have a min number equal to provided minimum', () => {
					return expect(registerMultisignatureTransaction.asset.multisignature)
						.to.have.property('min')
						.and.be.a('number')
						.and.be.equal(minimum);
				});

				it('should have a lifetime number equal to provided lifetime', () => {
					return expect(registerMultisignatureTransaction.asset.multisignature)
						.to.have.property('lifetime')
						.and.be.a('number')
						.and.be.equal(lifetime);
				});

				it('should have a keysgroup array with plus prepended', () => {
					const expectedArray = [
						'+5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
						'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					];
					return expect(registerMultisignatureTransaction.asset.multisignature)
						.to.have.property('keysgroup')
						.and.be.eql(expectedArray);
				});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			registerMultisignatureTransaction = registerMultisignatureAccount({
				passphrase,
				secondPassphrase,
				keysgroup,
				lifetime,
				minimum,
			});
			return Promise.resolve();
		});

		it('should have the second signature property as hex string', () => {
			return expect(registerMultisignatureTransaction).to.have.property(
				'signSignature',
			).and.be.hexString;
		});
	});

	describe('when the register multisignature account transaction is created with one too short public key', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignatureAccount.bind(null, {
					passphrase,
					secondPassphrase,
					keysgroup: tooShortPublicKeyKeysgroup,
					lifetime,
					minimum: 1,
				}),
			).to.throw(
				'Public key d019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9 length differs from the expected 32 bytes for a public key.',
			);
		});
	});

	describe('when the register multisignature account transaction is created with one plus prepended public key', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignatureAccount.bind(null, {
					passphrase,
					secondPassphrase,
					keysgroup: plusPrependedPublicKeyKeysgroup,
					lifetime,
					minimum: 1,
				}),
			).to.throw('Argument must be a valid hex string.');
		});
	});

	describe('when the register multisignature account transaction is created with one empty keysgroup', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignatureAccount.bind(null, {
					passphrase,
					secondPassphrase,
					keysgroup: [],
					lifetime,
					minimum,
				}),
			).to.throw(
				'Minimum number of signatures is larger than the number of keys in the keysgroup.',
			);
		});
	});

	describe('when the register multisignature account transaction is created with 17 public keys in keysgroup', () => {
		beforeEach(() => {
			keysgroup = Array(17)
				.fill()
				.map(
					(_, index) =>
						cryptography.getPrivateAndPublicKeyFromPassphrase(index.toString())
							.publicKey,
				);
			return Promise.resolve();
		});

		it('should throw an error', () => {
			return expect(
				registerMultisignatureAccount.bind(null, {
					passphrase,
					secondPassphrase,
					keysgroup,
					lifetime,
					minimum,
				}),
			).to.throw('Expected between 1 and 15 public keys in the keysgroup.');
		});
	});

	describe('when the register multisignature account transaction is created with duplicated public keys', () => {
		beforeEach(() => {
			keysgroup = [keys.publicKey, keys.publicKey];
			return Promise.resolve();
		});

		it('should throw an error', () => {
			return expect(
				registerMultisignatureAccount.bind(null, {
					passphrase,
					secondPassphrase,
					keysgroup,
					lifetime,
					minimum,
				}),
			).to.throw(
				'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
			);
		});
	});

	describe('unsigned register multisignature account transaction', () => {
		describe('when the register multisignature transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerMultisignatureTransaction = registerMultisignatureAccount({
					keysgroup,
					lifetime,
					minimum,
				});
				return Promise.resolve();
			});

			describe('validation errors', () => {
				describe('when lifetime', () => {
					const lifetimeErrorMessage =
						'Please provide a valid lifetime value. Expected integer between 1 and 72.';

					it('was not provided', () => {
						return expect(
							registerMultisignatureAccount.bind(null, {
								keysgroup,
							}),
						).to.throw(lifetimeErrorMessage);
					});

					it('is float', () => {
						return expect(
							registerMultisignatureAccount.bind(null, {
								keysgroup,
								lifetime: 23.45,
							}),
						).to.throw(lifetimeErrorMessage);
					});

					it('is not number type', () => {
						return expect(
							registerMultisignatureAccount.bind(null, {
								keysgroup,
								lifetime: '123',
							}),
						).to.throw(lifetimeErrorMessage);
					});

					it('was more than expected', () => {
						return expect(
							registerMultisignatureAccount.bind(null, {
								keysgroup,
								lifetime: 73,
							}),
						).to.throw(lifetimeErrorMessage);
					});

					it('was less than expected', () => {
						return expect(
							registerMultisignatureAccount.bind(null, {
								keysgroup,
								lifetime: -1,
							}),
						).to.throw(lifetimeErrorMessage);
					});
				});
			});

			describe('when minimum', () => {
				const minimumErrorMessage =
					'Please provide a valid minimum value. Expected integer between 1 and 15.';

				it('was not provided', () => {
					return expect(
						registerMultisignatureAccount.bind(null, {
							keysgroup,
							lifetime,
						}),
					).to.throw(minimumErrorMessage);
				});

				it('is float', () => {
					return expect(
						registerMultisignatureAccount.bind(null, {
							keysgroup,
							lifetime,
							minimum: 1.45,
						}),
					).to.throw(minimumErrorMessage);
				});

				it('is not number type', () => {
					return expect(
						registerMultisignatureAccount.bind(null, {
							keysgroup,
							lifetime,
							minimum: '12',
						}),
					).to.throw(minimumErrorMessage);
				});

				it('was more than expected', () => {
					return expect(
						registerMultisignatureAccount.bind(null, {
							keysgroup,
							lifetime,
							minimum: 16,
						}),
					).to.throw(minimumErrorMessage);
				});

				it('was less than expected', () => {
					return expect(
						registerMultisignatureAccount.bind(null, {
							keysgroup,
							lifetime,
							minimum: -1,
						}),
					).to.throw(minimumErrorMessage);
				});
			});

			it('should have the type', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('fee')
					.equal(fee);
			});

			it('should have the recipient id', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('recipientId')
					.equal('');
			});

			it('should have the sender public key', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.property('senderPublicKey')
					.equal(null);
			});

			it('should have the timestamp', () => {
				return expect(registerMultisignatureTransaction).to.have.property(
					'timestamp',
				);
			});

			it('should have the asset with the multisignature with the min, lifetime and keysgroup', () => {
				return expect(registerMultisignatureTransaction)
					.to.have.nested.property('asset.multisignature')
					.with.all.keys('min', 'lifetime', 'keysgroup');
			});

			it('should not have the signature', () => {
				return expect(registerMultisignatureTransaction).not.to.have.property(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerMultisignatureTransaction).not.to.have.property(
					'id',
				);
			});
		});
	});
});

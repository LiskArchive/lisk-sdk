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
import * as cryptography from '@liskhq/lisk-cryptography';
import { registerMultisignature } from '../src/register_multisignature_account';
// import { MultiSignatureAsset } from '../src/12_multisignature_transaction';
import { TransactionJSON } from '../src/transaction_types';

describe.skip('#registerMultisignature transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const transactionType = 12;
	const keys = {
		publicKey:
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		privateKey:
			'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const fee = (15 * fixedPoint).toString();
	const nonce = '0';
	const lifetime = 5;
	const minimum = 2;
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let tooShortPublicKeyKeysgroup: Array<string>;
	let plusPrependedPublicKeyKeysgroup: Array<string>;
	let keysgroup: Array<string>;
	let registerMultisignatureTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
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
			registerMultisignatureTransaction = registerMultisignature({
				networkIdentifier,
				passphrase,
				keysgroup,
				lifetime,
				minimum,
				fee,
				nonce,
			});
			return Promise.resolve();
		});

		it('should create a register multisignature transaction', () => {
			return expect(registerMultisignatureTransaction).toBeTruthy();
		});

		describe('returned register multisignature transaction', () => {
			it('should be an object', () => {
				return expect(registerMultisignatureTransaction).toBeObject();
			});

			it('should have id string', () => {
				return expect(registerMultisignatureTransaction.id).toBeString();
			});

			it('should have type number equal to 4', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have fee string equal to 15 LSK', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'fee',
					fee,
				);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'senderPublicKey',
					keys.publicKey,
				);
			});

			it('should have signatures hex string', () => {
				return expect(registerMultisignatureTransaction.signatures).toBeArray();
			});

			it('should have asset', () => {
				return expect(
					Object.keys(registerMultisignatureTransaction),
				).not.toHaveLength(0);
			});

			describe('multisignature asset', () => {
				it('should have a min number equal to the provided minimum', () => {});

				it('should have a lifetime number equal to the provided lifetime', () => {});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			registerMultisignatureTransaction = registerMultisignature({
				networkIdentifier,
				passphrase,
				keysgroup,
				lifetime,
				minimum,
				fee,
				nonce,
			});
			return Promise.resolve();
		});
	});

	describe('when the register multisignature account transaction is created with one too short public key', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignature.bind(null, {
					networkIdentifier,
					passphrase,
					keysgroup: tooShortPublicKeyKeysgroup,
					lifetime,
					minimum: 1,
					fee,
					nonce,
				}),
			).toThrowError(
				'Public key d019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9 length differs from the expected 32 bytes for a public key.',
			);
		});
	});

	describe('when the register multisignature account transaction is created with one plus prepended public key', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignature.bind(null, {
					networkIdentifier,
					passphrase,
					keysgroup: plusPrependedPublicKeyKeysgroup,
					lifetime,
					minimum: 1,
					fee,
					nonce,
				}),
			).toThrowError('Argument must be a valid hex string.');
		});
	});

	describe('when the register multisignature account transaction is created with one empty keysgroup', () => {
		it('should throw an error', () => {
			return expect(
				registerMultisignature.bind(null, {
					networkIdentifier,
					passphrase,
					keysgroup: [],
					lifetime,
					minimum,
					fee,
					nonce,
				}),
			).toThrowError(
				'Minimum number of signatures is larger than the number of keys in the keysgroup.',
			);
		});
	});

	describe('when the register multisignature account transaction is created with 17 public keys in keysgroup', () => {
		beforeEach(() => {
			keysgroup = Array(17)
				.fill(0)
				.map(
					(_: number, index: number) =>
						cryptography.getPrivateAndPublicKeyFromPassphrase(index.toString())
							.publicKey,
				);
			return Promise.resolve();
		});

		it('should throw an error', () => {
			return expect(
				registerMultisignature.bind(null, {
					networkIdentifier,
					passphrase,
					keysgroup,
					lifetime,
					minimum,
					fee,
					nonce,
				}),
			).toThrowError('Expected between 1 and 15 public keys in the keysgroup.');
		});
	});

	describe('when the register multisignature account transaction is created with duplicated public keys', () => {
		beforeEach(() => {
			keysgroup = [keys.publicKey, keys.publicKey];
			return Promise.resolve();
		});

		it('should throw an error', () => {
			return expect(
				registerMultisignature.bind(null, {
					networkIdentifier,
					passphrase,
					keysgroup,
					lifetime,
					minimum,
					fee,
					nonce,
				}),
			).toThrowError(
				'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
			);
		});
	});

	describe('unsigned register multisignature account transaction', () => {
		describe('when the register multisignature transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerMultisignatureTransaction = registerMultisignature({
					networkIdentifier,
					keysgroup,
					lifetime,
					minimum,
					fee,
					nonce,
				});
				return Promise.resolve();
			});

			describe('validation errors', () => {
				describe('when lifetime', () => {
					const lifetimeErrorMessage =
						'Please provide a valid lifetime value. Expected integer between 1 and 72.';

					it('was not provided', () => {
						return expect(
							registerMultisignature.bind(null, {
								keysgroup,
								fee,
								nonce,
							} as any),
						).toThrowError(lifetimeErrorMessage);
					});

					it('is float', () => {
						return expect(
							registerMultisignature.bind(null, {
								keysgroup,
								lifetime: 23.45,
								fee,
								nonce,
							} as any),
						).toThrowError(lifetimeErrorMessage);
					});

					it('is not number type', () => {
						return expect(
							registerMultisignature.bind(null, {
								keysgroup,
								lifetime: '123',
								fee,
								nonce,
							} as any),
						).toThrowError(lifetimeErrorMessage);
					});

					it('was more than expected', () => {
						return expect(
							registerMultisignature.bind(null, {
								keysgroup,
								lifetime: 73,
								fee,
								nonce,
							} as any),
						).toThrowError(lifetimeErrorMessage);
					});

					it('was less than expected', () => {
						return expect(
							registerMultisignature.bind(null, {
								keysgroup,
								lifetime: -1,
								fee,
								nonce,
							} as any),
						).toThrowError(lifetimeErrorMessage);
					});
				});
			});

			describe('when minimum', () => {
				const minimumErrorMessage =
					'Please provide a valid minimum value. Expected integer between 1 and 15.';

				it('was not provided', () => {
					return expect(
						registerMultisignature.bind(null, {
							keysgroup,
							lifetime,
							fee,
							nonce,
						} as any),
					).toThrowError(minimumErrorMessage);
				});

				it('is float', () => {
					return expect(
						registerMultisignature.bind(null, {
							networkIdentifier,
							keysgroup,
							lifetime,
							minimum: 1.45,
							fee,
							nonce,
						}),
					).toThrowError(minimumErrorMessage);
				});

				it('is not number type', () => {
					return expect(
						registerMultisignature.bind(null, {
							keysgroup,
							lifetime,
							minimum: '12',
							fee,
							nonce,
						} as any),
					).toThrowError(minimumErrorMessage);
				});

				it('was more than expected', () => {
					return expect(
						registerMultisignature.bind(null, {
							networkIdentifier,
							keysgroup,
							lifetime,
							minimum: 16,
							fee,
							nonce,
						}),
					).toThrowError(minimumErrorMessage);
				});

				it('was less than expected', () => {
					return expect(
						registerMultisignature.bind(null, {
							networkIdentifier,
							keysgroup,
							lifetime,
							minimum: -1,
							fee,
							nonce,
						}),
					).toThrowError(minimumErrorMessage);
				});
			});

			it('should have the type', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the fee', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'fee',
					fee,
				);
			});

			it('should have the nonce', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'nonce',
					nonce,
				);
			});

			it('should have the sender public key', () => {
				return expect(registerMultisignatureTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset with the multisignature with the minimum, lifetime and keysgroup', () => {
				return expect(
					Object.keys(registerMultisignatureTransaction.asset as any),
				).toEqual(['min', 'lifetime', 'keysgroup']);
			});

			it('should not have the signature', () => {
				return expect(registerMultisignatureTransaction).not.toHaveProperty(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerMultisignatureTransaction).not.toHaveProperty(
					'id',
				);
			});
		});
	});
});

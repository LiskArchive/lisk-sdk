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
// import * as cryptography from '@liskhq/lisk-cryptography';
// import { registerMultisignature } from '../src/register_multisignature_account';
// import { MultiSignatureAsset } from '../src/12_multisignature_transaction';
// import { TransactionJSON } from '../src/transaction_types';

describe.skip('#registerMultisignature transaction', () => {
	beforeEach(() => {
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			return Promise.resolve();
		});

		it('should create a register multisignature transaction', () => {});

		describe('returned register multisignature transaction', () => {
			it('should be an object', () => {});

			it('should have id string', () => {});

			it('should have type number equal to 4', () => {});

			it('should have fee string equal to 15 LSK', () => {});

			it('should have senderPublicKey hex string equal to sender public key', () => {});

			it('should have signature hex string', () => {});

			it('should have asset', () => {});

			it('second signature property should be undefined', () => {});

			describe('multisignature asset', () => {
				it('should have a min number equal to the provided minimum', () => {});

				it('should have a lifetime number equal to the provided lifetime', () => {});
			});
		});
	});

	describe('when the register multisignature account transaction is created with one too short public key', () => {
		it('should throw an error', () => {});
	});

	describe('when the register multisignature account transaction is created with one plus prepended public key', () => {
		it('should throw an error', () => {});
	});

	describe('when the register multisignature account transaction is created with one empty keysgroup', () => {
		it('should throw an error', () => {});
	});

	describe('when the register multisignature account transaction is created with 17 public keys in keysgroup', () => {
		beforeEach(() => {
			return Promise.resolve();
		});

		it('should throw an error', () => {});
	});

	describe('when the register multisignature account transaction is created with duplicated public keys', () => {
		beforeEach(() => {
			return Promise.resolve();
		});

		it('should throw an error', () => {});
	});

	describe('unsigned register multisignature account transaction', () => {
		describe('when the register multisignature transaction is created without a passphrase', () => {
			beforeEach(() => {});

			describe('validation errors', () => {
				describe('when lifetime', () => {
					it('was not provided', () => {});

					it('is float', () => {});

					it('is not number type', () => {});

					it('was more than expected', () => {});

					it('was less than expected', () => {});
				});
			});

			describe('when minimum', () => {
				it('was not provided', () => {});

				it('is float', () => {});

				it('is not number type', () => {});

				it('was more than expected', () => {});

				it('was less than expected', () => {});
			});

			it('should have the type', () => {});

			it('should have the fee', () => {});

			it('should have the nonce', () => {});

			it('should have the sender public key', () => {});

			it('should have the asset with the multisignature with the minimum, lifetime and keysgroup', () => {});

			it('should not have the signature', () => {});

			it('should not have the id', () => {});
		});
	});
});

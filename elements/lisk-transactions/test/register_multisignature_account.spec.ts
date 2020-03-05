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

import { registerMultisignature } from '../src/register_multisignature_account';
import * as multisigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { TransactionJSON } from '../src/transaction_types';

describe('#registerMultisignature transaction', () => {
	let registrationTx: Partial<TransactionJSON>;
	const validMultisigRegistrationTx = multisigFixture.testCases.output;
	const registerMultisignatureInput = {
		senderPassphrase:
			'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		passphrases: [
			'trim elegant oven term access apple obtain error grain excite lawn neck',
			'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
			'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
			'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		],
		mandatoryKeys: [
			'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
			'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
		],
		optionalKeys: [
			'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		],
		numberOfSignatures: 4,
		networkIdentifier:
			'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		nonce: '1',
		fee: '1500000000',
	};

	describe('register multisignature account', () => {
		beforeEach(async () => {
			registrationTx = registerMultisignature(registerMultisignatureInput);
		});

		it('should be an object', async () => {
			expect(registrationTx).toBeObject();
		});

		it('should have id string', async () => {
			expect(registrationTx.id).toBeString();
			expect(registrationTx.id).toBe(validMultisigRegistrationTx.id);
		});

		it('should have type number equal to 12', async () => {
			expect(registrationTx.type).toBe(validMultisigRegistrationTx.type);
			expect(registrationTx.type).toBe(12);
		});

		it('should have fee string equal to 15 LSK', async () => {
			expect(registrationTx.fee).toBe(validMultisigRegistrationTx.fee);
		});

		it('should have senderPublicKey hex string equal to sender public key', async () => {
			expect(registrationTx.senderPublicKey).toBe(
				validMultisigRegistrationTx.senderPublicKey,
			);
		});

		it('should have signatures as hex string', async () => {
			registrationTx.signatures?.forEach(aSig => {
				expect(aSig).toBeString();
				expect(aSig).toHaveLength(128);
			});
		});

		it('multisignature asset should match protocol spec', async () => {
			expect(registrationTx.asset).toStrictEqual(
				validMultisigRegistrationTx.asset,
			);
		});
	});

	describe('registrar multisignature account validation', () => {
		it('should throw when nonce is invalid', async () => {});
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

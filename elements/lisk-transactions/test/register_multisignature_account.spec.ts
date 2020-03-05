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

import {
	registerMultisignature,
	RegisterMultisignatureInputs,
} from '../src/register_multisignature_account';
import * as multisigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { TransactionJSON } from '../src/transaction_types';
import cloneDeep = require('lodash.clonedeep');

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
		let input: RegisterMultisignatureInputs;
		beforeEach(async () => {
			input = cloneDeep(registerMultisignatureInput);
		});

		it('should throw when nonce is invalid', async () => {
			(input as any).nonce = 'invalid_shold_be_number_string';
			expect(() => registerMultisignature(input)).toThrow(
				'Nonce must be a valid number in string format.',
			);
		});

		it('should throw when fee is invalid', async () => {
			(input as any).fee = 'invalid_shold_be_number_string';
			expect(() => registerMultisignature(input)).toThrow(
				'Fee must be a valid number in string format.',
			);
		});

		it('should throw when number of signatures is less than lower limit', async () => {
			(input as any).numberOfSignatures = 0;
			expect(() => registerMultisignature(input)).toThrow(
				'Please provide a valid numberOfSignatures value. Expected integer between 1 and 64.',
			);
		});

		it('should throw when number of signatures is more than higher limit', async () => {
			(input as any).numberOfSignatures = 65;
			expect(() => registerMultisignature(input)).toThrow(
				'Please provide a valid numberOfSignatures value. Expected integer between 1 and 64.',
			);
		});

		it('should throw when number of signatures less than mandatory keys', async () => {
			(input as any).mandatoryKeys.push('fffffffffffffffffffff');
			(input as any).numberOfSignatures = 2;
			expect(() => registerMultisignature(input)).toThrow(
				'The numberOfSignatures should be more than or equal to the number of mandatory passphrases.',
			);
		});

		it('should throw when number of signatures is bigger than the count of optional and mandatory keys', async () => {
			(input as any).numberOfSignatures = 5;
			expect(() => registerMultisignature(input)).toThrow(
				'Please provide a valid numberOfSignatures. numberOfSignatures (5) is bigger than the count of optional (2) and mandatory (2) keys.',
			);
		});

		it('should throw error if Network Identifier is empty', async () => {
			(input as any).networkIdentifier = '';
			expect(() => registerMultisignature(input)).toThrow(
				'Network identifier can not be empty.',
			);
		});

		it('should throw error if duplicate keys are found', async () => {
			(input as any).optionalKeys[0] = (input as any).mandatoryKeys[0];
			expect(() => registerMultisignature(input)).toThrow(
				`There are repeated values in optional and mandatory keys: '4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39'`,
			);
		});

		it('should throw error if repeated mandatory keys exists', async () => {
			(input as any).mandatoryKeys[0] = (input as any).mandatoryKeys[1];
			expect(() => registerMultisignature(input)).toThrow(
				'There are repeated mandatory public keys',
			);
		});

		it('should throw error if repeated mandatory keys exists', async () => {
			(input as any).optionalKeys[0] = (input as any).optionalKeys[1];
			expect(() => registerMultisignature(input)).toThrow(
				'There are repeated optional public keys',
			);
		});
	});

	describe('register multisignature with some passphrases only', () => {
		let input: RegisterMultisignatureInputs;
		beforeEach(async () => {
			input = cloneDeep(registerMultisignatureInput);
		});

		it('should assign empty string for signatures of missing passphrases', async () => {
			// Keep only passphrases for 2nd mandatory and 1st optional
			(input as any).passphrases = [input.passphrases[0], input.passphrases[2]];
			const tx = registerMultisignature(input) as any;
			expect(tx.signatures[1]).toBe('');
			expect(tx.signatures[3]).toBe('');
		});

		it('should contain only sender signature if passphrses is empty', async () => {
			(input as any).passphrases = [];
			const tx = registerMultisignature(input) as any;
			const [senderSignature, ...emptySignatures] = tx.signatures;
			expect(senderSignature).toBe(validMultisigRegistrationTx.signatures[0]);
			expect(emptySignatures).toStrictEqual(['', '', '', '']);
		});

		it('should return basic transaction with no passphrases at all', async () => {
			(input as any).passphrases = [];
			delete (input as any).senderPassphrase;
			const tx = registerMultisignature(input) as any;
			expect(tx.id).toBe(undefined);
			expect(tx.senderId).toBe('');
			expect(tx.signatures).toStrictEqual([]);
			expect(tx.asset.mandatoryKeys.sort()).toStrictEqual(
				validMultisigRegistrationTx.asset.mandatoryKeys.sort(),
			);
			expect(tx.asset.optionalKeys.sort()).toStrictEqual(
				validMultisigRegistrationTx.asset.optionalKeys.sort(),
			);
			expect(tx.asset.numberOfSignatures).toBe(
				validMultisigRegistrationTx.asset.numberOfSignatures,
			);
		});
	});
});

/*
 * Copyright © 2020 Lisk Foundation
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
import { signMultiSignatureTransaction } from '../src/sign_multi_signature_transaction';
import * as multisigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { TransactionJSON } from '../src/transaction_types';
import { TransferTransaction } from '../src';

import cloneDeep = require('lodash.clonedeep');

describe('#sign multi signature transaction', () => {
	let registrationTx: Partial<TransactionJSON>;
	const validMultisigRegistrationTx = multisigFixture.testCases.output;
	// This fixture represents the transaction generated and signed by the sender
	const registerMultisignatureInput = {
		senderPassphrase:
			'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		passphrases: [],
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

	describe('Members signing', () => {
		beforeEach(() => {
			registrationTx = registerMultisignature(registerMultisignatureInput);
		});

		it('should return a transaction signed by first mandatory key', () => {
			const txMissingMemberSignatures = cloneDeep(registrationTx) as any;

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: txMissingMemberSignatures,
				passphrase:
					'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures[1]).toBe(
				validMultisigRegistrationTx.signatures[1],
			);
		});

		it('should return a transaction signed by second mandatory key', () => {
			const txMissingMemberSignatures = cloneDeep(registrationTx) as any;

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: txMissingMemberSignatures,
				passphrase:
					'trim elegant oven term access apple obtain error grain excite lawn neck',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures[2]).toBe(
				validMultisigRegistrationTx.signatures[2],
			);
		});

		it('should return a transaction signed by first optional key', () => {
			const txMissingMemberSignatures = cloneDeep(registrationTx) as any;

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: txMissingMemberSignatures,
				passphrase:
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures[3]).toBe(
				validMultisigRegistrationTx.signatures[3],
			);
		});

		it('should return a transaction signed by second optional key', () => {
			const txMissingMemberSignatures = cloneDeep(registrationTx) as any;

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: txMissingMemberSignatures,
				passphrase:
					'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures[4]).toBe(
				validMultisigRegistrationTx.signatures[4],
			);
		});

		it('should return a transaction with third signature and empty string for the rest', () => {
			const validTransfer = new TransferTransaction({
				id: 123,
				senderPublicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				asset: {
					amount: '500000000',
					recipientId: '13360160607553818129L',
				},
			});

			const partiallySignedTransaction: any = validTransfer.toJSON();

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: partiallySignedTransaction,
				passphrase:
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures).toStrictEqual([
				'',
				'',
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07',
				'',
			]);
		});

		it('should return a transaction with third signature added and existing ones unmodified', () => {
			const validTransfer = new TransferTransaction({
				id: 123,
				senderPublicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				asset: {
					amount: '500000000',
					recipientId: '13360160607553818129L',
				},
			});

			// Add signature from 'sugar object slender confirm clock peanut auto spice carbon knife increase estate'
			const partiallySignedTransaction: any = validTransfer.toJSON();
			partiallySignedTransaction.signatures = [];
			partiallySignedTransaction.signatures[2] =
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07';

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: partiallySignedTransaction,
				passphrase:
					'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures).toStrictEqual([
				'',
				'',
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07',
				'5fbfd1e0f35a230356f3544856b5b9ed288d40c9a7096af7f72e624562f3528ff4381956f7ed6ffe88b60df8d2b6baedfe176beae786a3889f98d4af2190c80b',
			]);
		});

		it('should return a transaction with no modifications if signature already present', () => {
			const validTransfer = new TransferTransaction({
				senderPublicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				asset: {
					amount: '500000000',
					recipientId: '13360160607553818129L',
				},
			});

			// Add signature from 'sugar object slender confirm clock peanut auto spice carbon knife increase estate'
			const partiallySignedTransaction: any = validTransfer.toJSON();
			partiallySignedTransaction.signatures = [];
			partiallySignedTransaction.signatures[2] =
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07';

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: partiallySignedTransaction,
				passphrase:
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures).toStrictEqual([
				'',
				'',
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07',
				'',
			]);
		});

		it('should return signature in the correct position', () => {
			const validTransfer = new TransferTransaction({
				senderPublicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				asset: {
					amount: '500000000',
					recipientId: '13360160607553818129L',
				},
			});

			// Add signature from 'sugar object slender confirm clock peanut auto spice carbon knife increase estate'
			const partiallySignedTransaction: any = validTransfer.toJSON();

			const txSignedByMember = signMultiSignatureTransaction({
				transaction: partiallySignedTransaction,
				passphrase:
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				keys: {
					mandatoryKeys: [
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
					],
				},
			});

			expect(txSignedByMember.signatures[2]).toBe(
				'15161b9fcd6813f0ec42c8119ce63376093438b4fb9ade1e4e9873c15dbf8ec21a2cd534430d98cb24dc615e8d6e106fb80ac46251db2ec91ba75415fc4cbe07',
			);
		});
	});
});

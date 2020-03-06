import { registerMultisignature } from '../src/register_multisignature_account';
import { signMultiSignatureTransaction } from '../src/sign_multi_signature_transaction';
import * as multisigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { TransactionJSON } from '../src/transaction_types';
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
		beforeEach(async () => {
			registrationTx = registerMultisignature(registerMultisignatureInput);
		});

		it('should return a transaction signed by first mandatory key', async () => {
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
					numberOfSignatures: 4,
				},
			});

			expect(txSignedByMember.signatures[1]).toBe(
				validMultisigRegistrationTx.signatures[1],
			);
		});

		it('should return a transaction signed by second mandatory key', async () => {
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
					numberOfSignatures: 4,
				},
			});

			expect(txSignedByMember.signatures[2]).toBe(
				validMultisigRegistrationTx.signatures[2],
			);
		});

		it('should return a transaction signed by first optional key', async () => {
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
					numberOfSignatures: 4,
				},
			});

			expect(txSignedByMember.signatures[3]).toBe(
				validMultisigRegistrationTx.signatures[3],
			);
		});

		it('should return a transaction signed by second optional key', async () => {
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
					numberOfSignatures: 4,
				},
			});

			expect(txSignedByMember.signatures[4]).toBe(
				validMultisigRegistrationTx.signatures[4],
			);
		});
	});
});

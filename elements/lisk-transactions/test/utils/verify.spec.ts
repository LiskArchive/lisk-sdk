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
import { addTransactionFields } from '../helpers';
import {
	verifySenderPublicKey,
	verifyMinRemainingBalance,
	isMultisignatureAccount,
	validateKeysSignatures,
	verifyMultiSignatureTransaction,
} from '../../src/utils';
import { TransactionError } from '../../src/errors';
import { TransferTransaction } from '../../src';
import * as multisigFixture from '../../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';

const getMemberPublicKeys = (members: any): string[] =>
	Object.values(members).map((member: any) => member.publicKey);

describe('#verify', () => {
	const defaultId = '4838520211125422557';

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	const multiSigTransaction = multisigFixture.testCases.output;
	// Remove first signature to handle multi sign transaction scenario
	multiSigTransaction.signatures.shift();

	const defaultTransferTransaction = addTransactionFields(multiSigTransaction);

	const validTestTransaction = new TransferTransaction({
		...defaultTransferTransaction,
		networkIdentifier,
	});

	const defaultTransferTransactionBytes = Buffer.concat([
		cryptography.hexToBuffer(networkIdentifier),
		(validTestTransaction as any).getSigningBytes(),
	]);

	describe('#verifySenderPublicKey', () => {
		it('should return undefined when sender public key and public key is the same', () => {
			const publicKey = 'sender-public-key';
			expect(
				verifySenderPublicKey(defaultId, { publicKey } as any, publicKey),
			).toBeUndefined();
		});

		it('should return TransactionError when sender public key and account public key is not the same', () => {
			const publicKey = 'sender-public-key';
			const result = verifySenderPublicKey(
				defaultId,
				{ publicKey } as any,
				'different public key',
			);
			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty('dataPath', '.senderPublicKey');
		});
	});

	describe('#verifyMinRemainingBalance', () => {
		it('should return undefined when account balance is greater than minimum remaining balance', () => {
			const minRemainingBalance = BigInt('1000');
			expect(
				verifyMinRemainingBalance(
					defaultId,
					{ balance: BigInt('100000000') } as any,
					minRemainingBalance,
				),
			).toBeUndefined();
		});

		it('should return transaction errorr when account balance is less than minimum remaining balance', () => {
			const minRemainingBalance = BigInt('100000000');
			const result = verifyMinRemainingBalance(
				defaultId,
				{ balance: BigInt('1000') } as any,
				minRemainingBalance,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty('dataPath', '.balance');
		});
	});

	describe('#isMultisignatureAccount', () => {
		it('should return false for non multi signature account', () => {
			expect(
				isMultisignatureAccount({
					keys: { mandatoryKeys: [], optionalKeys: [], numberOfSignatures: 0 },
				} as any),
			).toBeFalse();
		});

		it('should return true for multi signature account', () => {
			const senderAccount = {
				...defaultTransferTransaction,
				keys: defaultTransferTransaction.asset,
			};
			expect(isMultisignatureAccount(senderAccount)).toBeTrue();
		});
	});

	describe('#validateKeysSignatures', () => {
		it('should return errors when signatures has invalid signature', () => {
			const { senderPublicKey, signatures } = defaultTransferTransaction;
			const invalidSignature = signatures[0].replace(0, 1);
			const [result] = validateKeysSignatures(
				[senderPublicKey],
				[invalidSignature],
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Failed to validate signature ${invalidSignature}`,
			);
		});

		it('should return empty array when signatures are valid', () => {
			const { signatures, asset: keys } = defaultTransferTransaction;
			const result = validateKeysSignatures(
				keys,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty();
		});
	});

	describe('#verifyMultiSignatureTransaction', () => {
		it('should return empty array when signatures ok', () => {
			const validTransfer = new TransferTransaction({
				senderPublicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				asset: {
					amount: '500000000',
					recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
				},
			});

			validTransfer.sign(
				'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				undefined,
				[
					'trim elegant oven term access apple obtain error grain excite lawn neck',
					'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
					'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				],
				{
					mandatoryKeys: [
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
						'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
					],
					optionalKeys: [
						'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
					],
				},
			);

			const senderAccount = {
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
			} as any;

			const validTransferBytes = Buffer.concat([
				cryptography.hexToBuffer(networkIdentifier),
				(validTransfer as any).getSigningBytes(),
			]);

			const result = verifyMultiSignatureTransaction(
				validTransfer.id,
				senderAccount,
				validTransfer.signatures,
				validTransferBytes,
			);

			expect(result).toStrictEqual([]);
		});

		it('should return error when signatures does not have required number of signatures', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = getMemberPublicKeys(
				multisigFixture.testCases.input.members,
			);
			const numberOfSignatures = 10;
			const senderAccount = {
				keys: {
					mandatoryKeys: publicKeys,
					optionalKeys: [],
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				defaultTransferTransaction.id,
				senderAccount,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction signatures does not match required number of signatures: ${numberOfSignatures}`,
			);
		});

		it('should return error when signatures are missing than expected', () => {
			const senderAccount = {
				...defaultTransferTransaction,
				keys: defaultTransferTransaction.asset,
			};

			const [result] = verifyMultiSignatureTransaction(
				senderAccount.id,
				senderAccount,
				[...senderAccount.signatures, ...senderAccount.signatures],
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction signatures does not match required number of signatures: ${defaultTransferTransaction.asset.numberOfSignatures}`,
			);
		});

		it('should return error when mandatoryKeys signatures has invalid signature', () => {
			const senderAccount = {
				...defaultTransferTransaction,
				keys: defaultTransferTransaction.asset,
			};
			const { signatures } = senderAccount;
			const firstSignature = signatures.shift();
			signatures.push(firstSignature);

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Failed to validate signature ${senderAccount.signatures[0]}`,
			);
		});

		it('should return error when optionalKeys signatures has invalid signature', () => {
			const senderAccount = {
				...defaultTransferTransaction,
				keys: defaultTransferTransaction.asset,
			};
			const { signatures } = senderAccount;
			const lastSignature = signatures.pop();
			signatures.unshift(lastSignature);

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				senderAccount.signatures.map((s: any) => s.replace(0, 1)),
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Failed to validate signature ${senderAccount.signatures[0].replace(
					0,
					1,
				)}`,
			);
		});

		it('should return error when mandatoryKeys and optionalKeys signatures has invalid signature', () => {
			const senderAccount = {
				...defaultTransferTransaction,
				keys: defaultTransferTransaction.asset,
			};

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				senderAccount.signatures.map((s: any) => s.replace(0, 1)),
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Failed to validate signature ${senderAccount.signatures[0].replace(
					0,
					1,
				)}`,
			);
		});
	});
});

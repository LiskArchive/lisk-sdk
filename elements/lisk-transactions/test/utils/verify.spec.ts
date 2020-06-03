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
import { hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	verifyMinRemainingBalance,
	isMultisignatureAccount,
	validateKeysSignatures,
	verifyMultiSignatureTransaction,
} from '../../src/utils';
import { TransactionError } from '../../src/errors';
import { TransferTransaction, BaseTransaction } from '../../src';
import * as fixture from '../../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as multisigFixture from '../../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import {
	MultiSignatureAsset,
	MultisignatureTransaction,
} from '../../src/12_multisignature_transaction';
import { TransferAsset } from '../../src/8_transfer_transaction';
import { defaultAccount } from './state_store_mock';

const getMemberPublicKeys = (members: any): Buffer[] =>
	Object.values(members).map((member: any) =>
		Buffer.from(member.publicKey, 'base64'),
	);

describe('#verify', () => {
	const defualtTestCase = multisigFixture.testCases[0];
	const defaultId = Buffer.from('5WaL4UpmLlb+1LbzPVr1uCV3+/E=', 'base64');

	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	let defaultTransferTransactionBytes: Buffer;
	let validTestTransaction: TransferTransaction;
	let validMultisignatureTestTransaction: MultisignatureTransaction;

	beforeEach(() => {
		{
			const buffer = Buffer.from(
				fixture.testCases[0].output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<TransferAsset>(
				TransferTransaction.ASSET_SCHEMA,
				decodedBaseTransaction.asset as Buffer,
			);
			validTestTransaction = new TransferTransaction({
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			});
			defaultTransferTransactionBytes = Buffer.concat([
				networkIdentifier,
				validTestTransaction.getSigningBytes(),
			]);
		}
		{
			const buffer = Buffer.from(defualtTestCase.output.transaction, 'base64');
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<MultiSignatureAsset>(
				MultisignatureTransaction.ASSET_SCHEMA,
				decodedBaseTransaction.asset as Buffer,
			);
			const decodedMultiSignature = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
			validMultisignatureTestTransaction = new MultisignatureTransaction(
				decodedMultiSignature,
			);
		}
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
				{ balance: BigInt('1000'), address: Buffer.from('address') } as any,
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
			const senderAccount = defaultAccount({
				keys: validMultisignatureTestTransaction.asset as any,
			});
			expect(isMultisignatureAccount(senderAccount)).toBeTrue();
		});
	});

	describe('#validateKeysSignatures', () => {
		it('should return errors when signatures has invalid signature', () => {
			const {
				senderPublicKey,
				signatures,
			} = validMultisignatureTestTransaction;
			const invalidSignature = signatures[0];
			(invalidSignature as any)[0] = 20;
			const [result] = validateKeysSignatures(
				[senderPublicKey],
				[invalidSignature as any],
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				expect.stringContaining('Failed to validate signature'),
			);
		});

		it('should return empty array when signatures are valid', () => {
			const { signatures, asset: keys } = validMultisignatureTestTransaction;
			const result = validateKeysSignatures(
				keys as any,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty();
		});
	});

	describe('#verifyMultiSignatureTransaction', () => {
		it('should return empty array when signatures ok', () => {
			const validTransfer = new TransferTransaction({
				fee: BigInt(100),
				nonce: BigInt(0),
				senderPublicKey: Buffer.from(
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
					'hex',
				),
				asset: {
					amount: BigInt('500000000'),
					recipientAddress: Buffer.from(
						'3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
						'hex',
					),
					data: '',
				},
			});

			validTransfer.sign(
				Buffer.from(
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
					'hex',
				),
				undefined,
				[
					'trim elegant oven term access apple obtain error grain excite lawn neck',
					'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
					'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				],
				{
					mandatoryKeys: [
						Buffer.from(
							'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							'hex',
						),
						Buffer.from(
							'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
							'hex',
						),
					],
					optionalKeys: [
						Buffer.from(
							'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
							'hex',
						),
						Buffer.from(
							'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
							'hex',
						),
					],
				},
			);

			const senderAccount = defaultAccount({
				keys: {
					mandatoryKeys: [
						Buffer.from(
							'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
							'hex',
						),
						Buffer.from(
							'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
							'hex',
						),
					],
					optionalKeys: [
						Buffer.from(
							'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
							'hex',
						),
						Buffer.from(
							'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
							'hex',
						),
					],
					numberOfSignatures: 4,
				},
			});

			const validTransferBytes = Buffer.concat([
				networkIdentifier,
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
			const { signatures } = validMultisignatureTestTransaction;
			const publicKeys = getMemberPublicKeys(defualtTestCase.input.members);
			const numberOfSignatures = 10;
			const senderAccount = {
				keys: {
					mandatoryKeys: publicKeys,
					optionalKeys: [],
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				validMultisignatureTestTransaction.id,
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
			const senderAccount = defaultAccount({
				keys: validMultisignatureTestTransaction.asset as any,
			});

			const [result] = verifyMultiSignatureTransaction(
				validMultisignatureTestTransaction.id,
				senderAccount,
				[
					...validMultisignatureTestTransaction.signatures,
					...validMultisignatureTestTransaction.signatures,
				],
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction signatures does not match required number of signatures: ${validMultisignatureTestTransaction.asset.numberOfSignatures}`,
			);
		});

		it('should return error when mandatoryKeys signatures has invalid signature', () => {
			const senderAccount = defaultAccount({
				keys: validMultisignatureTestTransaction.asset as any,
			});
			const invalidSignature = validMultisignatureTestTransaction.signatures.slice(
				1,
			) as Buffer[];
			const firstSignature = invalidSignature.shift();
			invalidSignature.push(firstSignature as Buffer);

			const [result] = verifyMultiSignatureTransaction(
				validMultisignatureTestTransaction.id,
				senderAccount,
				invalidSignature,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				expect.stringContaining('Failed to validate signature'),
			);
		});

		it('should return error when optionalKeys signatures has invalid signature', () => {
			const senderAccount = defaultAccount({
				keys: validMultisignatureTestTransaction.asset as any,
			});
			const { signatures } = validMultisignatureTestTransaction;
			const lastSignature = signatures.pop();
			signatures.unshift(lastSignature as Buffer);

			const invalidSignature = validMultisignatureTestTransaction.signatures.slice(
				1,
			) as Buffer[];
			invalidSignature[0][0] = 10;

			const [result] = verifyMultiSignatureTransaction(
				validMultisignatureTestTransaction.id,
				senderAccount,
				invalidSignature,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				expect.stringContaining('Failed to validate signature'),
			);
		});

		it('should return error when mandatoryKeys and optionalKeys signatures has invalid signature', () => {
			const senderAccount = defaultAccount({
				keys: validMultisignatureTestTransaction.asset as any,
			});

			const invalidSignature = validMultisignatureTestTransaction.signatures.slice(
				1,
			) as Buffer[];
			invalidSignature[0][0] = 10;

			const [result] = verifyMultiSignatureTransaction(
				validMultisignatureTestTransaction.id,
				senderAccount,
				invalidSignature,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				expect.stringContaining('Failed to validate signature'),
			);
		});
	});
});

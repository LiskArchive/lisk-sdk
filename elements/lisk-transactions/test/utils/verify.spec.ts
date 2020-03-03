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
import * as transferFixture from '../../fixtures/transaction_network_id_and_change_order/transfer_transaction_with_multi_signature_validate.json';

describe('#verify', () => {
	const defaultId = '4838520211125422557';

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	const defaultTransferTransaction = addTransactionFields(
		transferFixture.testCases[0].output,
	);
	const validTestTransaction = new TransferTransaction({
		...defaultTransferTransaction,
		networkIdentifier,
	});

	const defaultTransferTransactionBytes = Buffer.concat([
		cryptography.hexToBuffer(networkIdentifier),
		(validTestTransaction as any).getBasicBytes(),
	]);

	describe('#verifySenderPublicKey', () => {
		it('should return undefined when sender public key and public key is the same', async () => {
			const publicKey = 'sender-public-key';
			expect(
				verifySenderPublicKey(defaultId, { publicKey } as any, publicKey),
			).toBeUndefined();
		});

		it('should return TransactionError when sender public key and account public key is not the same', async () => {
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
		it('should return undefined when account balance is greater than minimum remaining balance', async () => {
			const minRemainingBalance = BigInt('1000');
			expect(
				verifyMinRemainingBalance(
					defaultId,
					{ balance: BigInt('100000000') } as any,
					minRemainingBalance,
				),
			).toBeUndefined();
		});

		it('should return transaction errorr when account balance is less than minimum remaining balance', async () => {
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
		it('should return false for non multi signature account', async () => {
			expect(
				isMultisignatureAccount({
					keys: { mandatoryKeys: [], optionalKeys: [], numberOfSignatures: 0 },
				} as any),
			).toBeFalse;
		});

		it('should return true for multi signature account', async () => {
			expect(
				isMultisignatureAccount({
					keys: { mandatoryKeys: ['covid'], numberOfSignatures: 1 },
				} as any),
			).toBeFalse;
		});

		it('should return true for multi signature account', async () => {
			expect(
				isMultisignatureAccount({
					keys: {
						mandatoryKeys: [],
						optionalKeys: ['19'],
						numberOfSignatures: 1,
					},
				} as any),
			).toBeFalse;
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
				`Failed to validate signature ${invalidSignature}`,
			);
		});

		it('should return empty array when signatures are valid', () => {
			const { signatures } = defaultTransferTransaction;
			const keys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const [result] = validateKeysSignatures(
				keys,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty;
		});
	});

	describe('#verifyMultiSignatureTransaction', () => {
		it('should return error when signatures array is empty', () => {
			const [result] = verifyMultiSignatureTransaction(
				defaultTransferTransaction.id,
				defaultTransferTransaction,
				[],
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				'Transaction has empty signatures',
			);
		});

		it('should return error when signatures does not have required number of signatures', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
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
				`Transaction signatures does not have required number of transactions: ${numberOfSignatures}`,
			);
		});

		it('should return error when mandatoryKeys signatures has invalid signature', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const numberOfSignatures = signatures.length;
			const senderAccount = {
				keys: {
					mandatoryKeys: publicKeys,
					optionalKeys: [],
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures.map((s: any) => s.replace(0, 1)),
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				`Failed to validate signature ${signatures[0].replace(0, 1)}`,
			);
		});

		it('should return error when optionalKeys signatures has invalid signature', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const numberOfSignatures = signatures.length;
			const senderAccount = {
				keys: {
					mandatoryKeys: [],
					optionalKeys: publicKeys,
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures.map((s: any) => s.replace(0, 1)),
				defaultTransferTransactionBytes,
			);

			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty(
				'message',
				`Failed to validate signature ${signatures[0].replace(0, 1)}`,
			);
		});

		it('should return no errors when all the mandatoryKeys signatures are valid', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const numberOfSignatures = signatures.length;
			const senderAccount = {
				keys: {
					mandatoryKeys: publicKeys,
					optionalKeys: [],
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty;
		});

		it('should return no errors when all the optionalKeys signatures are valid', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const numberOfSignatures = signatures.length;
			const senderAccount = {
				keys: {
					mandatoryKeys: [],
					optionalKeys: publicKeys,
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty;
		});

		it('should return no errors when all the mandatoryKeys and optionalKeys signatures are valid', () => {
			const { signatures } = defaultTransferTransaction;
			const publicKeys = transferFixture.testCases[0].input.coSigners.map(
				a => a.publicKey,
			);
			const numberOfSignatures = signatures.length;
			const senderAccount = {
				keys: {
					mandatoryKeys: [publicKeys[0]],
					optionalKeys: [publicKeys[1]],
					numberOfSignatures,
				},
			} as any;

			const [result] = verifyMultiSignatureTransaction(
				'id',
				senderAccount,
				signatures,
				defaultTransferTransactionBytes,
			);

			expect(result).toBeEmpty;
		});
	});
});

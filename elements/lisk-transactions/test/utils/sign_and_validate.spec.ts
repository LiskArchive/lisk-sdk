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
import { addTransactionFields } from '../helpers';
import { validateMultisignatures } from '../../src/utils';
import { TransactionError, TransactionPendingError } from '../../src/errors';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import {
	validMultisignatureAccount as defaultMultisignatureAccount,
	validMultisignatureTransaction,
} from '../../fixtures';

describe('signAndVerify module', () => {
	describe('#validateMultisignatures', () => {
		const defaultMultisignatureTransaction = addTransactionFields(
			validMultisignatureTransaction,
		);
		const defaultTransactionBytes = Buffer.from(
			'002c497801500660b67a2ade1e2528b7f648feef8f3b46e2f4f90ca7f5439101b5119f309d572c095724f7f2b7600a3a4200000000',
			'hex',
		);

		const {
			membersPublicKeys: memberPublicKeys,
		} = defaultMultisignatureAccount;

		it('should return a valid response with valid signatures', async () => {
			const { valid } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures,
				2,
				defaultTransactionBytes,
			);

			expect(valid).toBe(true);
		});

		it('should return a verification fail response with invalid signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures.map((signature: string) =>
					signature.replace('1', '0'),
				),
				2,
				defaultTransactionBytes,
			);

			expect(valid).toBe(false);
			(errors as ReadonlyArray<TransactionError>).forEach((error, i) => {
				expect(error).toBeInstanceOf(TransactionError);
				expect(error).toHaveProperty(
					'message',
					`Failed to validate signature ${defaultMultisignatureTransaction.signatures[
						i
					].replace('1', '0')}`,
				);
			});
		});

		it('should return a verification fail response with invalid extra signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				[
					...defaultMultisignatureTransaction.signatures,
					'f321799c2d30d2be6e7b70aa29b57f9b1d6f2801d3fccf5c99623ffe45526104b1f0652c2cb586c7ae201d2557d8041b41b60154f079180bb9b85f8d06b3010c',
				],
				2,
				defaultTransactionBytes,
			);

			expect(valid).toBe(false);
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).toBeInstanceOf(TransactionError);
			});
		});

		it('should return a verification fail response with duplicate signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				[
					...defaultMultisignatureTransaction.signatures,
					defaultMultisignatureTransaction.signatures[0],
				],
				2,
				defaultTransactionBytes,
			);

			expect(valid).toBe(false);
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).toBeInstanceOf(TransactionError);
			});
		});

		it('should return a transaction pending error when missing signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures.slice(0, 2),
				3,
				defaultTransactionBytes,
			);

			expect(valid).toBe(false);
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).toBeInstanceOf(TransactionPendingError);
				expect(error).toHaveProperty('message', 'Missing signatures');
			});
		});
	});
});

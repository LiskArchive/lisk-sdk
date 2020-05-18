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
import { validateSignature } from '../../src/utils';
import { TransactionError } from '../../src/errors';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import * as transferFixture from '../../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import { TransferTransaction } from '../../src';

describe('signAndVerify module', () => {
	// TODO: Update after updating protocol-specs
	describe.skip('#validateSignature', () => {
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

		it('should call cryptography verifyData', () => {
			const cryptographyVerifyDataStub = jest
				.spyOn(cryptography, 'verifyData')
				.mockReturnValue(true);

			validateSignature(
				defaultTransferTransaction.senderPublicKey,
				defaultTransferTransaction.signatures[0],
				defaultTransferTransactionBytes,
			);

			expect(cryptographyVerifyDataStub).toHaveBeenCalledTimes(1);
		});

		it('should return a valid response with valid signature', () => {
			const { valid } = validateSignature(
				defaultTransferTransaction.senderPublicKey,
				defaultTransferTransaction.signatures[0],
				defaultTransferTransactionBytes,
			);

			expect(valid).toBe(true);
		});

		it('should return an invalid response with invalid signature', () => {
			const { valid, error } = validateSignature(
				defaultTransferTransaction.senderPublicKey,
				defaultTransferTransaction.signatures[0].replace('1', '0'),
				Buffer.from(defaultTransferTransactionBytes),
			);

			expect(valid).toBe(false);
			expect(error).toBeInstanceOf(TransactionError);
			expect(error).toHaveProperty(
				'message',
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Failed to validate signature ${defaultTransferTransaction.signatures[0].replace(
					'1',
					'0',
				)}`,
			);
		});
	});
});

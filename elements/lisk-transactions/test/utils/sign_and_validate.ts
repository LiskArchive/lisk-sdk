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
import { expect } from 'chai';
import * as cryptography from '@liskhq/lisk-cryptography';
import { addTransactionFields } from '../helpers';
import { validateMultisignatures, validateSignature } from '../../src/utils';
import { TransactionError, TransactionPendingError } from '../../src/errors';
// The list of valid transactions was created with lisk-js v0.5.1
// using the below mentioned passphrases.
import { Account } from '../../src/transaction_types';
import {
	validMultisignatureAccount as defaultMultisignatureAccount,
	validMultisignatureTransaction,
	validSecondSignatureTransaction,
} from '../../fixtures';

describe('signAndVerify module', () => {
	describe('#validateSignature', () => {
		const defaultSecondSignatureTransaction = addTransactionFields(
			validSecondSignatureTransaction,
		);
		const defaultSecondSignatureTransactionBytes = Buffer.from(
			'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b54020000003357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
			'hex',
		);
		const defaultSecondPublicKey =
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8';
		const defaultTransactionBytes = Buffer.from(
			'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b5402000000',
			'hex',
		);

		it('should call cryptography hash', async () => {
			const cryptographyHashStub = sandbox
				.stub(cryptography, 'hash')
				.returns(
					Buffer.from(
						'62b13b81836f3f1e371eba2f7f8306ff23d00a87d9473793eda7f742f4cfc21c',
						'hex',
					),
				);

			validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(cryptographyHashStub).to.be.calledOnce;
		});

		it('should call cryptography verifyData', async () => {
			const cryptographyVerifyDataStub = sandbox
				.stub(cryptography, 'verifyData')
				.returns(true);

			validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(cryptographyVerifyDataStub).to.be.calledOnce;
		});

		it('should return a valid response with valid signature', async () => {
			const { valid } = validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature,
				defaultTransactionBytes,
			);

			expect(valid).to.be.true;
		});

		it('should return an unvalid response with invalid signature', async () => {
			const { valid, error } = validateSignature(
				defaultSecondSignatureTransaction.senderPublicKey,
				defaultSecondSignatureTransaction.signature.replace('1', '0'),
				Buffer.from(defaultTransactionBytes),
			);

			expect(valid).to.be.false;
			expect(error)
				.to.be.instanceof(TransactionError)
				.and.have.property(
					'message',
					`Failed to validate signature ${defaultSecondSignatureTransaction.signature.replace(
						'1',
						'0',
					)}`,
				);
		});

		it('should return a valid response with valid signSignature', async () => {
			const { valid } = validateSignature(
				defaultSecondPublicKey,
				defaultSecondSignatureTransaction.signSignature,
				defaultSecondSignatureTransactionBytes,
			);

			expect(valid).to.be.true;
		});

		it('should return an unvalid response with invalid signSignature', async () => {
			const { valid, error } = validateSignature(
				defaultSecondPublicKey,
				defaultSecondSignatureTransaction.signSignature.replace('1', '0'),
				defaultSecondSignatureTransactionBytes,
			);

			expect(valid).to.be.false;
			expect(error)
				.to.be.instanceof(TransactionError)
				.and.have.property(
					'message',
					`Failed to validate signature ${defaultSecondSignatureTransaction.signSignature.replace(
						'1',
						'0',
					)}`,
				);
		});
	});

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
		} = defaultMultisignatureAccount as Account;

		it('should return a valid response with valid signatures', async () => {
			const { valid } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures,
				2,
				defaultTransactionBytes,
			);

			expect(valid).to.be.true;
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

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach((error, i) => {
				expect(error)
					.to.be.instanceof(TransactionError)
					.and.have.property(
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

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).to.be.instanceof(TransactionError);
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

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).to.be.instanceof(TransactionError);
			});
		});

		it('should return a transaction pending error when missing signatures', async () => {
			const { valid, errors } = validateMultisignatures(
				memberPublicKeys as ReadonlyArray<string>,
				defaultMultisignatureTransaction.signatures.slice(0, 2),
				3,
				defaultTransactionBytes,
			);

			expect(valid).to.be.false;
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error)
					.to.be.instanceof(TransactionPendingError)
					.and.have.property('message', 'Missing signatures');
			});
		});
	});
});

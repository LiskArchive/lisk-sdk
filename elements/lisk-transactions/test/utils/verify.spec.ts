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
import { verifySenderPublicKey, verifyBalance } from '../../src/utils';
import { TransactionError } from '../../src/errors';

describe('#verify', () => {
	const defaultId = '4838520211125422557';

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

	describe('#verifyBalance', () => {
		const defaultAccount = { balance: '1000000000' } as any;
		it('should return undefined when sender has exact amount', async () => {
			expect(
				verifyBalance(defaultId, defaultAccount, BigInt('1000000000')),
			).toBeUndefined();
		});

		it('should return undefined when sender has enoguh balance', async () => {
			expect(
				verifyBalance(defaultId, defaultAccount, BigInt('100')),
			).toBeUndefined();
		});

		it('should return TransactionError when sender does not have enoguh balance', async () => {
			const result = verifyBalance(
				defaultId,
				defaultAccount,
				BigInt('1000000001'),
			);
			expect(result).toBeInstanceOf(TransactionError);
			expect(result).toHaveProperty('dataPath', '.balance');
		});
	});

	describe('#verifyMultiSignatures', () => {
		it('should return FAIL status with error if sender is not multi-signature account but more than one signature is provided', async () => {});

		it('should return NONMULTISIGNATURE status without error if sender is not multi-signature account and signatures are not provided', async () => {});

		it('should call validateMultisignature with correct argument', async () => {});

		it('should return FAIL status with errors', async () => {});
	});
});

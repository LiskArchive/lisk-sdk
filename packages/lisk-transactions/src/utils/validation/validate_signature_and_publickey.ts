/*
 * Copyright © 2018 Lisk Foundation
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
import { validatePublicKey } from '.';
import { TransactionError } from '../../errors';
import { IsValidResponse } from '../../transaction_types';

export const validateSignatureAndPublicKey = (
	signature: string,
	publicKey?: string,
	id?: string,
): IsValidResponse => {
	const errors: TransactionError[] = [];

	if (!/^[a-f0-9]{128}$/i.test(signature)) {
		errors.push(new TransactionError(`Invalid signature.`, id, '.signature'));
    }
    
    if(publicKey) {
        try {
            validatePublicKey(publicKey);
        } catch (err) {
            errors.push(
                new TransactionError(
                    `Public key ${publicKey} length differs from the expected 32 bytes for a public key.`,
                    id,
                    '.publicKey',
                ),
            );
        }
    }

	return {
		valid: errors.length === 0 ? true : false,
		errors,
	};
};

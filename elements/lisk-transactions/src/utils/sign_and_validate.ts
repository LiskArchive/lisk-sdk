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
import { verifyData } from '@liskhq/lisk-cryptography';

import { TransactionError } from '../errors';
import { IsValidResponseWithError } from '../types';

export const validateSignature = (
	publicKey: Buffer,
	signature: Buffer,
	bytes: Buffer,
	id?: Buffer,
): IsValidResponseWithError => {
	const valid = verifyData(bytes, signature, publicKey);

	return {
		valid,
		error: !valid
			? new TransactionError(
					`Failed to validate signature ${signature.toString('base64')}`,
					id,
					'.signatures',
			  )
			: undefined,
	};
};

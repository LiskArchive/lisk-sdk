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

import { TransactionError } from '../errors';
import { IsValidResponseWithError } from '../transaction_types';

export const validateSignature = (
	publicKey: string,
	signature: string,
	bytes: Buffer,
	id?: string,
): IsValidResponseWithError => {
	const valid = cryptography.verifyData(bytes, signature, publicKey);

	return {
		valid,
		error: !valid
			? new TransactionError(
					`Failed to validate signature ${signature}`,
					id,
					'.signatures',
			  )
			: undefined,
	};
};

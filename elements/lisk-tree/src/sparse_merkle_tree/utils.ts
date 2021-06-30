/*
 * Copyright © 2021 Lisk Foundation
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
 */

import { InclusionProofQueryResult } from './types';

export const sortByBitmapAndKey = (
	queries: InclusionProofQueryResult[],
): InclusionProofQueryResult[] =>
	queries.sort((q1, q2) => {
		if (q1.bitmap.byteLength === q2.bitmap.byteLength) {
			return q1.key.byteLength - q2.key.byteLength;
		}

		return q2.bitmap.byteLength - q1.bitmap.byteLength;
	});

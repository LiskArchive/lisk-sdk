/*
 * Copyright © 2023 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';

export const shuffleValidatorList = <
	T extends {
		readonly address: Buffer;
		weight: bigint;
	},
>(
	roundSeed: Buffer,
	addresses: T[],
): (T & { roundHash: Buffer })[] => {
	const validatorList = [...addresses].map(validator => ({
		...validator,
		roundHash: Buffer.from([]),
	})) as (T & { roundHash: Buffer })[];

	for (const validator of validatorList) {
		const seedSource = Buffer.concat([roundSeed, validator.address]);
		validator.roundHash = utils.hash(seedSource);
	}

	validatorList.sort((validator1, validator2) => {
		const diff = validator1.roundHash.compare(validator2.roundHash);
		if (diff !== 0) {
			return diff;
		}

		return validator1.address.compare(validator2.address);
	});

	return validatorList;
};

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

import { Validator } from '../../abi';

export const isEmptyConsensusUpdate = (
	preCommitThreshold: bigint,
	certificateThreshold: bigint,
	nextValidators: Validator[],
): boolean =>
	nextValidators.length === 0 &&
	preCommitThreshold === BigInt(0) &&
	certificateThreshold === BigInt(0);

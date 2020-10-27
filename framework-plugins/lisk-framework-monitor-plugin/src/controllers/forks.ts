/*
 * Copyright © 2020 Lisk Foundation
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
import { Request, Response } from 'express';
import { SharedState } from '../types';

export const getForkStats = (state: SharedState) => async (
	_req: Request,
	res: Response,
	// eslint-disable-next-line @typescript-eslint/require-await
): Promise<void> => {
	const { forks } = state;
	res.json({
		data: {
			forkEventCount: forks.forkEventCount,
			blockHeaders: forks.blockHeaders,
		},
		meta: {},
	});
};

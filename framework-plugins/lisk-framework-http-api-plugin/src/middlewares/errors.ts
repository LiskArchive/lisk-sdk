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
import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = () => (
	err: Error | Error[],
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	const errors = Array.isArray(err) ? err : [err];
	for (const error of errors) {
		// Include message property in response
		Object.defineProperty(error, 'message', { enumerable: true });
	}
	res.status(500).send({ errors });
};

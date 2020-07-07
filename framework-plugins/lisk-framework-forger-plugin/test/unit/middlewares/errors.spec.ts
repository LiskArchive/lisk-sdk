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
import { Request, NextFunction } from 'express';
import { errorMiddleware } from '../../../src/middlewares/errors';

describe('Errors middleware', () => {
	let res: { status: jest.Mock };
	let sendFn: jest.Mock;

	beforeEach(() => {
		sendFn = jest.fn();
		res = {
			status: jest.fn().mockReturnValue({ send: sendFn }),
		};
	});

	describe('when single error is provided', () => {
		it('should send 500 and with error messages', () => {
			const error = new Error('Some error');
			errorMiddleware()(
				error,
				{} as Request,
				res as any,
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				(() => {}) as NextFunction,
			);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(sendFn).toHaveBeenCalledWith({ errors: [error] });
		});
	});

	describe('when array of error is provided', () => {
		it('should send 500 and with error messages', () => {
			const errors = [
				new Error('array of errors'),
				new Error('array of errors 2'),
			];
			errorMiddleware()(
				errors,
				{} as Request,
				res as any,
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				(() => {}) as NextFunction,
			);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(sendFn).toHaveBeenCalledWith({ errors });
		});
	});
});

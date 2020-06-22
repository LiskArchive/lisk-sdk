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

import { whiteListMiddleware } from '../../../src/middlewares/whitelist';
import { Request, Response } from 'express';

describe('WhiteList middleware', () => {
	let next: jest.Mock;

	beforeEach(() => {
		next = jest.fn();
		jest.spyOn(console, 'error').mockReturnValue();
	});

	describe('when empty whitelist is provided', () => {
		it('should pass middleware without error', () => {
			whiteListMiddleware()(
				{ ip: '192.168.12.1' } as Request,
				{} as Response,
				next,
			);
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});
	});

	describe('when valid ip is provided', () => {
		it('should call next with error if it matches', () => {
			whiteListMiddleware({ whiteList: ['192.168.12.1'] })(
				{ ip: '192.168.12.1' } as Request,
				{} as Response,
				next,
			);
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
		});

		it('should pass middleware without error', () => {
			whiteListMiddleware({ whiteList: ['192.168.12.1'] })(
				{ ip: '127.0.0.1' } as Request,
				{} as Response,
				next,
			);
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(new Error('Access Denied'));
		});
	});

	describe('when invalid ip is provided', () => {
		it('should call next with error if ipv6 is provided', () => {
			whiteListMiddleware({ whiteList: ['::ffff:0808:0808'] })(
				{ ip: '8.8.8.8' } as Request,
				{} as Response,
				next,
			);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(new Error('Access Denied'));
		});

		it('should pass middleware without error', () => {
			whiteListMiddleware({ whiteList: ['random white list'] })(
				{ ip: '127.0.0.1' } as Request,
				{} as Response,
				next,
			);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(new Error('Access Denied'));
		});
	});
});

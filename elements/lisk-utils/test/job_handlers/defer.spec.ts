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
 */
import { Defer } from '../../src/job_handlers/defer';

describe('Defer', () => {
	let defer: Defer<boolean>;

	it('should create a promise which is not resolved', () => {
		defer = new Defer<boolean>(1000);

		expect(defer.promise).toBeInstanceOf(Promise);
		expect(defer.isResolved).toEqual(false);
		defer.resolve();
	});

	it('should mark as resolved on invoking resolve', () => {
		defer = new Defer<boolean>(1000);
		defer.resolve();

		expect(defer.isResolved).toEqual(true);
	});

	it('should mark as resolved on invoking reject', async () => {
		defer = new Defer<boolean>(1000);
		defer.reject();
		await expect(defer.promise).rejects.toBeUndefined();
		expect(defer.isResolved).toEqual(true);
	});

	it('should be rejected after given timeout with default message', async () => {
		defer = new Defer<boolean>(1000);

		await expect(defer.promise).rejects.toThrow('Defer timeout occurred');
	});

	it('should be rejected after given timeout wit given message', async () => {
		defer = new Defer<boolean>(1000, 'My timeout occurred');

		await expect(defer.promise).rejects.toThrow('My timeout occurred');
	});
});

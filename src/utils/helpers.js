/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
export const deAlias = type => (
	type === 'address'
		? 'account'
		: type
);

export const shouldUseJsonOutput = (config, options) =>
	(options.json === true || config.json === true)
		&& options.json !== false;

export const createErrorHandler = prefix => ({ message }) => ({
	error: `${prefix}: ${message}`,
});

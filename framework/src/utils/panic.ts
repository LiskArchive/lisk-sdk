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

import { Logger } from '../logger';

export const panic = (logger: Logger, error?: Error): void => {
	logger.fatal(
		{ error: error ?? new Error('Something unexpected happened') },
		'Raising panic and shutting down the application',
	);
	process.exit(1);
};

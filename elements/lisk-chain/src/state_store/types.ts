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

import { IterateOptions } from '@liskhq/lisk-db';

export interface DatabaseReader {
	get: (key: Buffer) => Promise<Buffer>;
	has: (key: Buffer) => Promise<boolean>;
	createReadStream: (options?: IterateOptions) => NodeJS.ReadableStream;
}

export interface DatabaseWriter {
	set: (key: Buffer, value: Buffer) => void;
	del: (key: Buffer) => void;
}

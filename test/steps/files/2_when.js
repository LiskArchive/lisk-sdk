/*
 * LiskHQ/lisk-commander
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
import { readJSONSync, writeJSONSync } from '../../../src/utils/fs';

export function theJSONIsRead() {
	const { filePath } = this.test.ctx;
	this.test.ctx.returnValue = readJSONSync(filePath);
}

export function theJSONIsWritten() {
	const { filePath, objectToWrite } = this.test.ctx;
	this.test.ctx.returnValue = writeJSONSync(filePath, objectToWrite);
}

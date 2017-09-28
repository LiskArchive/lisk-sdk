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
import {
	readJsonSync,
	writeJsonSync,
} from '../../src/utils/fs';
import { printResult } from '../../src/utils/print';
import tablify from '../../src/utils/tablify';

export function whenTheResultIsPrinted() {
	this.test.ctx.returnValue = printResult(this.test.ctx.vorpal)(this.test.ctx.result);
}

export function whenTheResultIsPrintedWithTheJSONOptionSetToTrue() {
	this.test.ctx.returnValue = printResult(this.test.ctx.vorpal, { json: true })(this.test.ctx.result);
}

export function whenTheQueryInstanceGetsABlockUsingTheID() {
	this.test.ctx.returnValue = this.test.ctx.queryInstance.isBlockQuery(this.test.ctx.blockId);
}

export function whenTheQueryInstanceGetsAnAccountUsingTheAddress() {
	this.test.ctx.returnValue = this.test.ctx.queryInstance.isAccountQuery(this.test.ctx.address);
}

export function whenTheQueryInstanceGetsATransactionUsingTheID() {
	this.test.ctx.returnValue = this.test.ctx.queryInstance.isTransactionQuery(this.test.ctx.transactionId);
}

export function whenTheQueryInstanceGetsADelegateUsingTheUsername() {
	this.test.ctx.returnValue = this.test.ctx.queryInstance.isDelegateQuery(this.test.ctx.delegateUsername);
}

export function whenTheJSONIsRead() {
	this.test.ctx.returnValue = readJsonSync(this.test.ctx.path);
}

export function whenTheJSONIsWritten() {
	this.test.ctx.returnValue = writeJsonSync(this.test.ctx.path, this.test.ctx.objectToWrite);
}

export function whenTheObjectIsTablified() {
	this.test.ctx.returnValue = tablify(this.test.ctx.testObject);
}

export function whenTheArrayIsTablified() {
	this.test.ctx.returnValue = tablify(this.test.ctx.testArray);
}

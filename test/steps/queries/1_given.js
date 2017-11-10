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
import liskAPIInstance from '../../../src/utils/api';
import queryInstance from '../../../src/utils/query';
import {
	getFirstQuotedString,
} from '../utils';

export function aResultWithError() {
	const error = getFirstQuotedString(this.test.parent.title);
	const result = { error };
	this.test.ctx.result = result;
}

export function aResultWithABlock() {
	const block = { height: 123 };
	const result = { block };

	this.test.ctx.block = block;
	this.test.ctx.result = result;
}

export function aQueryInstanceHasBeenInitialised() {
	const queryResult = {
		some: 'result',
		testing: 123,
	};

	queryInstance.getAccount.resolves({ account: queryResult });
	queryInstance.getBlock.resolves({ block: queryResult });
	queryInstance.getDelegate.resolves({ delegate: queryResult });
	queryInstance.getTransaction.resolves({ transaction: queryResult });

	this.test.ctx.queryResult = queryResult;
	this.test.ctx.queryInstance = queryInstance;
}

export function aQueryInstance() {
	this.test.ctx.queryInstance = queryInstance;
	sandbox.stub(liskAPIInstance, 'sendRequest');
}

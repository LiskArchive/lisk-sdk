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
import liskInstance from '../../src/utils/liskInstance';
import { printResult } from '../../src/utils/print';

export const whenTheLiskInstanceIsImported = () => {
	context.liskInstance = liskInstance;
};

export const whenTheResultIsPrinted = () => {
	context.returnValue = printResult(context.vorpal)(context.result);
};

export const whenTheResultIsPrintedWithTheJSONOptionSetToTrue = () => {
	context.returnValue = printResult(context.vorpal, { json: true })(context.result);
};

export const whenTheQueryInstanceGetsABlockUsingTheID = () => {
	context.returnValue = context.queryInstance.isBlockQuery(context.blockId);
};

export const whenTheQueryInstanceGetsAnAccountUsingTheAddress = () => {
	context.returnValue = context.queryInstance.isAccountQuery(context.address);
};

export const whenTheQueryInstanceGetsATransactionUsingTheID = () => {
	context.returnValue = context.queryInstance.isTransactionQuery(context.transactionId);
};

export const whenTheQueryInstanceGetsADelegateUsingTheUsername = () => {
	context.returnValue = context.queryInstance.isDelegateQuery(context.delegateUsername);
};

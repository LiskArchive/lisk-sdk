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
import queryInstance from '../../src/utils/query';
import { getFirstQuotedString } from './utils';

export const givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog = () => {
	context.vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
};

export const givenThereIsAResultToPrint = () => {
	context.result = { lisk: 'JS' };
};

export const givenALiskInstance = () => {
	context.liskInstance = liskInstance;
};

export const givenAQueryInstance = () => {
	context.queryInstance = queryInstance;
	sandbox.stub(liskInstance, 'sendRequest');
};

export function givenABlockID() {
	context.blockID = getFirstQuotedString(this.test.parent.title);
}

export function givenAnAddress() {
	context.address = getFirstQuotedString(this.test.parent.title);
}

export function givenATransactionID() {
	context.transactionId = getFirstQuotedString(this.test.parent.title);
}

export function givenADelegateUsername() {
	context.delegateUsername = getFirstQuotedString(this.test.parent.title);
}

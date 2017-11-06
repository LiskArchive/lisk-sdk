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
	getFirstQuotedString,
	getQuotedStrings,
	getFirstNumber,
} from '../utils';

export function aKeysgroupWithKeys() {
	const keysgroup = getQuotedStrings(this.test.parent.title);
	this.test.ctx.keysgroup = keysgroup;
}

export function aLifetimeOfHoursAsNotANumber() {
	const lifetime = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.lifetime = lifetime;
}

export function aLifetimeOfHours() {
	const lifetime = getFirstNumber(this.test.parent.title);
	this.test.ctx.lifetime = lifetime;
}

export function aMinimumOfSignaturesAsNotANumber() {
	const minimum = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.minimum = minimum;
}

export function aMinimumOfSignatures() {
	const minimum = getFirstNumber(this.test.parent.title);
	this.test.ctx.minimum = minimum;
}

export function anAlias() {
	this.test.ctx.alias = getFirstQuotedString(this.test.parent.title);
}

export function aType() {
	const type = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.type = type;
}

export const anUnknownType = aType;

export function aTypeWithAlias() {
	const [type, alias] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.type = type;
	this.test.ctx.alias = alias;
}

export function aTypeWithNoAlias() {
	const type = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.type = type;
}

export function aValue() {
	const value = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.value = value;
}

export const anUnknownValue = aValue;

export function aVariable() {
	const variable = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.variable = variable;
}

export const anUnknownVariable = aVariable;

export function aBlockID() {
	this.test.ctx.blockID = getFirstQuotedString(this.test.parent.title);
}

export function anAddress() {
	this.test.ctx.address = getFirstQuotedString(this.test.parent.title);
}

export function aTransactionID() {
	this.test.ctx.transactionId = getFirstQuotedString(this.test.parent.title);
}

export function aDelegateUsername() {
	this.test.ctx.delegateUsername = getFirstQuotedString(this.test.parent.title);
}

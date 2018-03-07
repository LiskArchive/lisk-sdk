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
import {
	getFirstQuotedString,
	getQuotedStrings,
	getFirstNumber,
} from '../utils';

export function publicKeysThatShouldBeVotedFor() {
	this.test.ctx.votePublicKeys = getQuotedStrings(this.test.parent.title);
}

export const aPublicKeyThatShouldBeVotedFor = publicKeysThatShouldBeVotedFor;

export function publicKeysThatShouldBeUnvotedFor() {
	this.test.ctx.unvotePublicKeys = getQuotedStrings(this.test.parent.title);
}

export function publicKeys() {
	this.test.ctx.publicKeys = getQuotedStrings(this.test.parent.title);
}

export const invalidPublicKeys = publicKeys;

export function anAmount() {
	this.test.ctx.amount = getFirstQuotedString(this.test.parent.title);
}

export function anAmountWithNormalizedAmount() {
	const [amount, normalizedAmount] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.amount = amount;
	this.test.ctx.normalizedAmount = normalizedAmount;
}

export const anInvalidAmount = anAmount;

export function aKeysgroupWithKeys() {
	const keysgroup = getQuotedStrings(this.test.parent.title);
	this.test.ctx.keysgroup = keysgroup;
}

export function aLifetimeOfHours() {
	let lifetime;
	try {
		lifetime = getFirstNumber(this.test.parent.title);
	} catch (e) {
		lifetime = getFirstQuotedString(this.test.parent.title);
	}
	this.test.ctx.lifetime = lifetime;
}

export const anInvalidLifetimeOfHours = aLifetimeOfHours;

export function aStringLifetimeOfHours() {
	this.test.ctx.lifetime = getFirstQuotedString(this.test.parent.title);
}

export const anInvalidStringLifetimeOfHours = aStringLifetimeOfHours;

export function aMinimumOfSignatures() {
	let minimum;
	try {
		minimum = getFirstNumber(this.test.parent.title);
	} catch (e) {
		minimum = getFirstQuotedString(this.test.parent.title);
	}
	this.test.ctx.minimum = minimum;
}

export const anInvalidMinimumOfSignatures = aMinimumOfSignatures;

export function aStringMinimumOfSignatures() {
	this.test.ctx.minimum = getFirstQuotedString(this.test.parent.title);
}

export const anInvalidStringMinimumOfSignatures = aStringMinimumOfSignatures;

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

export function anAddress() {
	this.test.ctx.address = getFirstQuotedString(this.test.parent.title);
}

export const anInvalidAddress = anAddress;

export function aDelegateUsername() {
	this.test.ctx.delegateUsername = getFirstQuotedString(this.test.parent.title);
}

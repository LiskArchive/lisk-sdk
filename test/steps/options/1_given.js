/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
	getFirstBoolean,
	getBooleans,
} from '../utils';

export function anOptionsObjectWithSignatureSetTo() {
	const signature = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { signature };
}

export function anArrayOfOptions() {
	const options = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = options;
}

export function anOptionsObjectWithUnvotesSetToPassphraseSetToAndSecondPassphraseSetTo() {
	const [unvotes, passphrase, secondPassphrase] = getQuotedStrings(
		this.test.parent.title,
	);
	this.test.ctx.options = {
		unvotes,
		passphrase,
		'second-passphrase': secondPassphrase,
	};
}

export function anOptionsObjectWithVotesSetToPassphraseSetToAndSecondPassphraseSetTo() {
	const [votes, passphrase, secondPassphrase] = getQuotedStrings(
		this.test.parent.title,
	);
	this.test.ctx.options = {
		votes,
		passphrase,
		'second-passphrase': secondPassphrase,
	};
}

export function anOptionsObjectWithUnvotesSetToAndPassphraseSetTo() {
	const [unvotes, passphrase] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = { unvotes, passphrase };
}

export function anOptionsObjectWithVotesSetToAndPassphraseSetTo() {
	const [votes, passphrase] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = { votes, passphrase };
}

export function anOptionsObjectWithVotesSetToAndUnvotesSetTo() {
	const [votes, unvotes] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = { votes, unvotes };
}

export function anOptionsObjectWithUnvotesSetTo() {
	const unvotes = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { unvotes };
}

export function anOptionsObjectWithVotesSetTo() {
	const votes = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { votes };
}

export function anOptionsObjectWithSignatureSetToAndVotesSetTo() {
	const votes = getFirstQuotedString(this.test.parent.title);
	const signature = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { votes, signature };
}

export function anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo() {
	const [passphraseSource, secondPassphraseSource] = getQuotedStrings(
		this.test.parent.title,
	);
	this.test.ctx.options = {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	};
}

export function anOptionsObjectWithSecondPublicKeySetTo() {
	const key = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { 'second-public-key': key };
}

export function anOptionsObjectWithKeySetToBoolean() {
	const key = getFirstQuotedString(this.test.parent.title);
	const value = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { [key]: value };
}

export function theOptionsObjectHasKeySetToBoolean() {
	const key = getFirstQuotedString(this.test.parent.title);
	const value = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options[key] = value;
}

export function theOptionsObjectHasAField() {
	const field = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options[field] = {};
}

export function theOptionsObjectHasAFieldWithKeySetToString() {
	const [field, key, value] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options[field] = { [key]: value };
}

export function theOptionsObjectHasAFieldWithKeySetToBoolean() {
	const [field, key] = getQuotedStrings(this.test.parent.title);
	const value = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options[field] = { [key]: value };
}

export function anOptionsObjectWithOutputPublicKeySetToBoolean() {
	const outputPublicKey = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { 'output-public-key': outputPublicKey };
}

export function anOptionsObjectWithPassphraseSetToAndPasswordSetTo() {
	const [passphrase, password] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = { passphrase, password };
}

export function anOptionsObjectWithPasswordSetTo() {
	const passwordSource = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { password: passwordSource };
}

export function anOptionsObjectWithPassphraseSetToAndMessageSetTo() {
	const [passphraseSource, messageSource] = getQuotedStrings(
		this.test.parent.title,
	);
	this.test.ctx.options = {
		passphrase: passphraseSource,
		message: messageSource,
	};
}

export function anOptionsObjectWithMessageSetTo() {
	const message = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { message };
}

export function anOptionsObjectWithPassphraseSetTo() {
	const passphraseSource = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { passphrase: passphraseSource };
}

export function anOptionsObjectWithSecondPassphraseSetTo() {
	const secondPassphraseSource = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { 'second-passphrase': secondPassphraseSource };
}

export function anOptionsObjectWithJsonSetTo() {
	const json = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { json };
}

export function anOptionsObjectWithTableSetTo() {
	const table = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { table };
}

export function anOptionsObjectWithJsonSetToAndTableSetTo() {
	const [json, table] = getBooleans(this.test.parent.title);
	this.test.ctx.options = { json, table };
}

export function anOptionsObjectWithPrettySetTo() {
	const pretty = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { pretty };
}

export function anOptionsObject() {
	this.test.ctx.options = {};
}

export const anEmptyOptionsObject = anOptionsObject;

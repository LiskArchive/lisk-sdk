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
import * as inputUtils from '../../../src/utils/input/utils';
import {
	getFirstQuotedString,
	getQuotedStrings,
	getFirstBoolean,
	hasAncestorWithTitleMatching,
} from '../utils';

export function anArrayOfOptions() {
	const options = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = options;
}

export function anOptionsObjectWithVoteSetToAndUnvoteSetTo() {
	const [vote, unvote] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.options = { vote, unvote };
}

export function anOptionsObjectWithUnvoteSetTo() {
	const unvote = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { unvote };
}

export function anOptionsObjectWithVoteSetTo() {
	const vote = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { vote };
}

export function anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo() {
	const { secondPassphrase, passphrase } = this.test.ctx;
	const [passphraseSource, secondPassphraseSource] = getQuotedStrings(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.onFirstCall().resolves(passphrase);
		inputUtils.getPassphrase.onSecondCall().resolves(secondPassphrase);
	}
	this.test.ctx.options = { passphrase: passphraseSource, 'second-passphrase': secondPassphraseSource };
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
	const { password } = this.test.ctx;
	const passwordSource = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		if (hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/)) {
			inputUtils.getPassphrase.onFirstCall().resolves(password);
		} else {
			inputUtils.getPassphrase.onSecondCall().resolves(password);
		}
	}
	this.test.ctx.options = { password: passwordSource };
}

export function anOptionsObjectWithPassphraseSetToAndMessageSetTo() {
	const { passphrase } = this.test.ctx;
	const [passphraseSource, messageSource] = getQuotedStrings(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.resolves(passphrase);
	}
	this.test.ctx.options = { passphrase: passphraseSource, message: messageSource };
}

export function anOptionsObjectWithMessageSetTo() {
	const message = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = { message };
}

export function anOptionsObjectWithPassphraseSetTo() {
	const { passphrase } = this.test.ctx;
	const passphraseSource = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		if (!hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/)) {
			inputUtils.getPassphrase.onFirstCall().resolves(passphrase);
			this.test.ctx.getGetPassphrasePassphraseCall = () => inputUtils.getPassphrase.firstCall;
		}
	}
	this.test.ctx.options = { passphrase: passphraseSource };
}

export function anOptionsObjectWithSecondPassphraseSetTo() {
	const { secondPassphrase } = this.test.ctx;
	const secondPassphraseSource = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.onSecondCall().resolves(secondPassphrase);
	}
	this.test.ctx.options = { 'second-passphrase': secondPassphraseSource };
}

export function anOptionsObjectWithJsonSetTo() {
	const json = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { json };
}

export function anOptionsObjectWithPrettySetTo() {
	const pretty = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { pretty };
}

export function anOptionsObject() {
	this.test.ctx.options = {};
}

export const anEmptyOptionsObject = anOptionsObject;

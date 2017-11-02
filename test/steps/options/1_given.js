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
import * as inputUtils from '../../../src/utils/input';
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

export function anOptionsObjectWithPasswordSetToUnknownSource() {
	const password = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		const error = new Error('Unknown password source type. Must be one of `file`, or `stdin`.');
		if (hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/)) {
			inputUtils.getPassphrase.onFirstCall().rejects(error);
		} else {
			inputUtils.getPassphrase.onSecondCall().rejects(error);
		}
	}
	this.test.ctx.options = { password };
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

export function anOptionsObjectWithMessageSetToUnknownSource() {
	const message = getFirstQuotedString(this.test.parent.title);
	inputUtils.getData.rejects(new Error('Unknown data source type. Must be one of `file`, or `stdin`.'));
	this.test.ctx.options = { message };
}

export function anOptionsObjectWithEncryptedPassphraseSetTo() {
	const { passphrase } = this.test.ctx;
	const passphraseSource = getFirstQuotedString(this.test.parent.title);
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.onSecondCall().resolves(passphrase);
		this.test.ctx.getGetPassphrasePassphraseCall = () => inputUtils.getPassphrase.secondCall;
	}
	this.test.ctx.options = { passphrase: passphraseSource };
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

export function anOptionsObjectWithSecondPassphraseSetToUnknownSource() {
	const secondPassphrase = getFirstQuotedString(this.test.parent.title);
	inputUtils.getPassphrase.onSecondCall().rejects(new Error('Unknown second passphrase source type. Must be one of `file`, or `stdin`.'));
	this.test.ctx.options = { 'second-passphrase': secondPassphrase };
}

export function anOptionsObjectWithPassphraseSetToUnknownSource() {
	const passphrase = getFirstQuotedString(this.test.parent.title);
	inputUtils.getPassphrase.onFirstCall().rejects(new Error('Unknown passphrase source type. Must be one of `file`, or `stdin`.'));
	this.test.ctx.options = { passphrase };
}

export function anOptionsObjectWithJsonSetTo() {
	const json = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { json };
}

export function anOptionsObjectWithPrettySetTo() {
	const pretty = getFirstBoolean(this.test.parent.title);
	this.test.ctx.options = { pretty };
}

export function anEmptyOptionsObject() {
	this.test.ctx.options = {};
}

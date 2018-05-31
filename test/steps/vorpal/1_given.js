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
import Vorpal from 'vorpal';
import commonOptions from '../../../src/utils/options';
import {
	DEFAULT_ERROR_MESSAGE,
	getFirstQuotedString,
	getQuotedStrings,
	getActionCreator,
} from '../utils';

export function vorpalIsInInteractiveMode() {
	delete process.env.NON_INTERACTIVE_MODE;
}

export function vorpalIsInNonInteractiveMode() {
	process.env.NON_INTERACTIVE_MODE = true;
}

export function anAction() {
	const { vorpal } = this.test.ctx;
	const actionName = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.action = getActionCreator(actionName)(vorpal);
}

export function anOptionsListIncluding() {
	const options = getQuotedStrings(this.test.parent.title);
	this.test.ctx.optionsList = options.map(
		optionName => commonOptions[optionName],
	);
}

export function aDescription() {
	this.test.ctx.description = getFirstQuotedString(this.test.parent.title);
}

export function anAutocompleteListIncluding() {
	this.test.ctx.autocompleteList = getQuotedStrings(this.test.parent.title);
}

export function aCommand() {
	this.test.ctx.command = getFirstQuotedString(this.test.parent.title);
}

export function anActiveCommandThatCanLog() {
	this.test.ctx.activeCommand = {
		log: sinon.spy(),
	};
}

export function anActionCreatorThatCreatesAnActionThatResolvesToAnObject() {
	const testObject = {
		lisk: 'js',
		testing: 123,
	};
	this.test.ctx.testObject = testObject;
	this.test.ctx.actionCreator = sandbox
		.stub()
		.returns(sandbox.stub().resolves(testObject));
}

export function anActionCreatorThatCreatesAnActionThatRejectsWithAnError() {
	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.actionCreator = sandbox
		.stub()
		.returns(sandbox.stub().rejects(new Error(DEFAULT_ERROR_MESSAGE)));
}

export function aParametersObjectWithTheOptions() {
	const { options } = this.test.ctx;
	this.test.ctx.parameters = { options };
}

export function aVorpalInstance() {
	const vorpal = new Vorpal();
	const capturedOutput = [];
	this.test.ctx.capturedOutput = capturedOutput;
	this.test.ctx.vorpal = vorpal;
}

export function aVorpalInstanceThatCanLog() {
	this.test.ctx.vorpal = {
		log: sandbox.spy(),
	};
}

export function aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt() {
	this.test.ctx.vorpal = {
		ui: {},
		activeCommand: {
			prompt: sandbox.stub(),
		},
	};
}

export function theVorpalInstanceHasNoUIParent() {
	const { vorpal } = this.test.ctx;
	delete vorpal.ui.parent;
}

export function theVorpalInstanceHasAUIParent() {
	const { vorpal } = this.test.ctx;
	const parent = { existing: 'parent' };

	this.test.ctx.vorpalUIParent = parent;
	vorpal.ui.parent = parent;
}

export function aLiskCommanderInstance() {
	const liskCommander = {
		log: sandbox.spy(),
	};
	this.test.ctx.liskCommander = liskCommander;
}

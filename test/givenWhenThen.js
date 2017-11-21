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
const getTestFn = (rootTestFn, { only, skip } = {}) => {
	if (only) return rootTestFn.only;
	if (skip) return rootTestFn.skip;
	return rootTestFn;
};

const createPreStep = (prefix, modifiers) => (description, beforeEachHook, suiteBody) => {
	const suiteFn = getTestFn(describe, modifiers);
	suiteFn(`${prefix} ${description}`, () => {
		beforeEach(beforeEachHook);
		suiteBody();
	});
};

const createAssertionStep = modifiers => (description, testBody) => {
	const testFn = getTestFn(it, modifiers);
	testFn(`Then ${description}`, testBody);
};

global.Given = createPreStep('Given');
global.When = createPreStep('When');
global.Then = createAssertionStep();

Given.only = createPreStep('Given', { only: true });
When.only = createPreStep('When', { only: true });
Then.only = createAssertionStep({ only: true });

Given.skip = createPreStep('Given', { skip: true });
When.skip = createPreStep('When', { skip: true });
Then.skip = createAssertionStep({ skip: true });

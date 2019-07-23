/*
 * Copyright © 2019 Lisk Foundation
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
const ROOT_DIR = Cypress.env('ROOT_DIR');
const FORCE_RELOAD = true;

const throwFailuresInWindow = win => {
	const failures = win.parent.document
		.getElementById(`Your App: '${ROOT_DIR}'`)
		.contentDocument.getElementsByClassName('fail');

	if (failures.length) {
		const failuresHTML = Array.from(failures).map(el => el.outerHTML);
		let errorString;
		try {
			errorString = failuresHTML.map(decodeURIComponent).join('\n');
		} catch (error) {
			errorString = failuresHTML.join('\n');
		}
		throw new Error(errorString);
	}
};

const testPage = page => () => {
	cy.visit(page);
	cy.reload(FORCE_RELOAD);
	cy.get('#done').should('contain', 'DONE');
	cy.window().then(throwFailuresInWindow);
};

describe('Browser tests', () => {
	it('should pass without minification', testPage('/browsertest.html'));
	it('should pass with minification', testPage('/browsertest.min.html'));
});

/*
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
const ROOT_DIR = Cypress.env('ROOT_DIR');

const throwFailuresInWindow = (win) => {
	const failures = win
		.parent
		.document
		.getElementById(`Your App: '${ROOT_DIR}'`)
		.contentDocument
		.getElementsByClassName('fail');

	if (failures.length) {
		const failuresHTML = Array.from(failures).map(el => el.outerHTML);
		throw new Error(failuresHTML.join('\n'));
	}
};

describe('Browser tests', () => {
	it('should pass without minification', () => {
		cy.visit('/browsertest.html');
		cy.get('#result').should('contain', 'DONE');
		cy.window().then(throwFailuresInWindow);
	});
	it('should pass with minification', () => {
		cy.visit('/browsertest.min.html');
		cy.get('#result').should('contain', 'DONE');
		cy.window().then(throwFailuresInWindow);
	});
});

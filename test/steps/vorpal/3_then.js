/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import commonOptions from '../../../src/utils/options';
import { getCommandInstance } from '../utils';

export function theVorpalCommandInstanceShouldHaveTheAlias() {
	const { vorpal, command, alias } = this.test.ctx;
	const { _aliases } = getCommandInstance(vorpal, command);
	return expect(_aliases).to.eql([alias]);
}

export function theVorpalCommandInstanceShouldHaveTheAutocompleteList() {
	const { vorpal, command, autocompleteList } = this.test.ctx;
	const { _autocomplete } = getCommandInstance(vorpal, command);
	return expect(_autocomplete).to.equal(autocompleteList);
}

export function theVorpalCommandInstanceShouldHaveTheDescription() {
	const { vorpal, command, description } = this.test.ctx;
	const { _description } = getCommandInstance(vorpal, command);
	return expect(_description).to.equal(description);
}

export function theVorpalCommandInstanceShouldHaveTheProvidedOptions() {
	const { vorpal, command, optionsList } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return optionsList.forEach(myOption =>
		expect(options).to.matchAny(option => option.flags === `${myOption[0]}`),
	);
}

export function theVorpalCommandInstanceShouldHaveTheJsonOption() {
	const { vorpal, command } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return expect(options).to.matchAny(
		option => option.flags === commonOptions.json[0],
	);
}

export function theVorpalCommandInstanceShouldHaveTheTableOption() {
	const { vorpal, command } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return expect(options).to.matchAny(
		option => option.flags === commonOptions.table[0],
	);
}

export function theVorpalCommandInstanceShouldHaveThePrettyOption() {
	const { vorpal, command } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return expect(options).to.matchAny(
		option => option.flags === commonOptions.pretty[0],
	);
}

export function theVorpalInstanceShouldHaveTheCommand() {
	const { vorpal, command } = this.test.ctx;
	const commandInstance = getCommandInstance(vorpal, command);
	return expect(commandInstance).to.ok;
}

export function aUIParentShouldBeSet() {
	const { vorpal } = this.test.ctx;
	return expect(vorpal.ui.parent).to.equal(vorpal);
}

export function theUIParentShouldBeMaintained() {
	const { vorpal, vorpalUIParent } = this.test.ctx;
	return expect(vorpal.ui.parent).to.equal(vorpalUIParent);
}

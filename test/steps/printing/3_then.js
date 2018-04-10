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
import chalk from 'chalk';
import {
	shouldUseJSONOutput,
	shouldUsePrettyOutput,
} from '../../../src/utils/helpers';
import tablify from '../../../src/utils/tablify';

export function consoleErrorShouldBeCalledWithTheFirstStringInRedAndTheOtherArguments() {
	const { testArguments } = this.test.ctx;
	const redArgument = chalk.red(testArguments[0]);
	expect(console.error).to.be.calledWithExactly(
		redArgument,
		...testArguments.slice(1),
	);
}

export function consoleErrorShouldBeCalledWithTheStringsInRed() {
	const { testArguments } = this.test.ctx;
	const redArguments = testArguments.map(arg => chalk.red(arg));
	expect(console.error).to.be.calledWithExactly(...redArguments);
}

export function consoleWarnShouldBeCalledWithTheFirstStringInYellowAndTheOtherArguments() {
	const { testArguments } = this.test.ctx;
	const yellowArgument = chalk.yellow(testArguments[0]);
	expect(console.warn).to.be.calledWithExactly(
		yellowArgument,
		...testArguments.slice(1),
	);
}

export function consoleWarnShouldBeCalledWithTheStringsInYellow() {
	const { testArguments } = this.test.ctx;
	const yellowArguments = testArguments.map(arg => chalk.yellow(arg));
	expect(console.warn).to.be.calledWithExactly(...yellowArguments);
}

export function itShouldPrintTheErrorMessageInRed() {
	const { testError: { message }, errorMessage } = this.test.ctx;
	return expect(message).to.equal(chalk.red(errorMessage));
}

export function theErrorShouldBePrintedWithThePrefix() {
	const { printFunction, errorMessage, prefix } = this.test.ctx;
	return expect(printFunction).to.be.calledWithExactly({
		error: `${prefix}: ${errorMessage}`,
	});
}

export function theActiveCommandShouldBeUsedToLog() {
	const { activeCommand } = this.test.ctx;
	return expect(activeCommand.log).to.be.calledOnce;
}

export function theObjectShouldBePrinted() {
	const { printFunction, testObject } = this.test.ctx;
	return expect(printFunction).to.be.calledWithExactly(testObject);
}

export function aTableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	return expect(vorpal.log).to.be.calledWithExactly(tableOutput);
}

export function prettyJSONOutputShouldBeLoggedWithoutANSICodes() {
	const { resultWithoutANSICodes, vorpal } = this.test.ctx;
	const prettyJSONOutput = JSON.stringify(resultWithoutANSICodes, null, '\t');
	return expect(vorpal.log).to.be.calledWithExactly(prettyJSONOutput);
}

export function jsonOutputShouldBeLoggedWithoutANSICodes() {
	const { resultWithoutANSICodes, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(resultWithoutANSICodes);
	return expect(vorpal.log).to.be.calledWithExactly(jsonOutput);
}

export function prettyJSONOutputsShouldBeLoggedWithoutANSICodes() {
	const { resultsWithoutANSICodes, vorpal } = this.test.ctx;
	const prettyJSONOutput = JSON.stringify(resultsWithoutANSICodes, null, '\t');
	return expect(vorpal.log).to.be.calledWithExactly(prettyJSONOutput);
}

export function jsonOutputsShouldBeLoggedWithoutANSICodes() {
	const { resultsWithoutANSICodes, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(resultsWithoutANSICodes);
	return expect(vorpal.log).to.be.calledWithExactly(jsonOutput);
}

export function shouldUseJSONOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject() {
	const { config } = this.test.ctx;
	return expect(shouldUseJSONOutput).to.be.calledWithExactly(config, {});
}

export function shouldUsePrettyOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject() {
	const { config } = this.test.ctx;
	return expect(shouldUsePrettyOutput).to.be.calledWithExactly(config, {});
}

export function shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions() {
	const { config, options } = this.test.ctx;
	return expect(shouldUseJSONOutput).to.be.calledWithExactly(config, options);
}

export function shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions() {
	const { config, options } = this.test.ctx;
	return expect(shouldUsePrettyOutput).to.be.calledWithExactly(config, options);
}

export function theReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue.options)
		.to.have.property('head')
		.eql([]);
}

export function theReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.have.length(0);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	return expect(returnValue.options)
		.to.have.property('head')
		.eql(keys);
}

export function theReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	return expect(returnValue[0]).to.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedKeys() {
	const { returnValue } = this.test.ctx;
	const keys = [
		'root',
		'nested.object',
		'nested.testing',
		'nested.nullValue',
		'nested.keys.more',
	];
	return expect(returnValue.options)
		.to.have.property('head')
		.eql(keys);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedValues() {
	const { returnValue } = this.test.ctx;
	const values = ['value', 'values', 123, null, 'publicKey1\npublicKey2'];
	return expect(returnValue[0]).to.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	return expect(returnValue.options)
		.to.have.property('head')
		.eql(keys);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectsNestedKeys() {
	const { returnValue, testArrayKeysResult } = this.test.ctx;
	return expect(returnValue.options)
		.to.have.property('head')
		.eql(testArrayKeysResult);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const values = Object.values(testObject);
		return expect(returnValue[i]).to.eql(values);
	});
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectNestedValues() {
	const { returnValue, testArray, testArrayValuesResult } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		return expect(returnValue[i]).to.eql(testArrayValuesResult[i]);
	});
}

export function theReturnedTableShouldHaveAHeadWithEveryUniqueKey() {
	const { returnValue, testArray } = this.test.ctx;
	const uniqueKeys = testArray.reduce((keys, testObject) => {
		const newKeys = Object.keys(testObject).filter(key => !keys.includes(key));
		return [...keys, ...newKeys];
	}, []);
	return expect(returnValue.options)
		.to.have.property('head')
		.eql(uniqueKeys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const row = returnValue[i];
		const values = Object.values(testObject);

		values.forEach(value => expect(row).to.include(value));
		return row
			.filter(value => !values.includes(value))
			.forEach(value => expect(value).to.be.undefined);
	});
}

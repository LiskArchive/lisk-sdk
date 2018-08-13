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

export function theReturnedTableShouldHaveARowWithTheObjectKeyValues() {
	const { returnValue, testObject } = this.test.ctx;
	return Object.entries(testObject).forEach(([key, value], arrayKey) => {
		expect({ [key]: value }).to.eql(returnValue[arrayKey]);
	});
}

export function theReturnedTableShouldHaveARowWithTheObjectKeyAndStringifiedNestedValues() {
	const { returnValue, testObject } = this.test.ctx;
	return Object.entries(testObject).forEach(([key, value], arrayKey) => {
		const strValue =
			typeof value === 'object' && value !== null
				? Object.entries(value)
						.map(
							([vKey, vValue]) =>
								`${vKey}: ${JSON.stringify(vValue, null, ' ')}`,
						)
						.join('\n')
				: value;
		expect({ [key]: strValue }).to.eql(returnValue[arrayKey]);
	});
}

export function theReturnedTableShouldHaveHeaderRows() {
	const { returnValue, testArray } = this.test.ctx;
	testArray.forEach((value, key) => {
		expect(
			returnValue[key * (Object.keys(value).length + 1)][0],
		).to.have.property('colSpan');
	});
}

export function theReturnedTableShouldHaveRowsWithTheObjectKeyAndStringifiedValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((values, i) => {
		Object.keys(values).forEach((key, keyIndex) => {
			expect(returnValue[i * testArray.length + 1 + keyIndex]).eql({
				[key]: values[key],
			});
		});
	});
}

export function theReturnedTableShouldHaveRowsWithTheObjectKeyAndStringifiedNestedValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((values, i) => {
		const innerObjectKeys = Object.keys(values);
		innerObjectKeys.forEach((key, keyIndex) => {
			let strValue = values[key];
			if (Array.isArray(values[key])) {
				strValue = values[key].join('\n');
			} else if (typeof values[key] === 'object') {
				strValue = Object.entries(values[key])
					.map(
						([vKey, vValue]) => `${vKey}: ${JSON.stringify(vValue, null, ' ')}`,
					)
					.join('\n');
			}
			expect(returnValue[i * (innerObjectKeys.length + 1) + keyIndex + 1]).eql({
				[key]: strValue,
			});
		});
	});
}

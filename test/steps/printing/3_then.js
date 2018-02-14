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
	console.error.should.be.calledWithExactly(
		redArgument,
		...testArguments.slice(1),
	);
}

export function consoleErrorShouldBeCalledWithTheStringsInRed() {
	const { testArguments } = this.test.ctx;
	const redArguments = testArguments.map(arg => chalk.red(arg));
	console.error.should.be.calledWithExactly(...redArguments);
}

export function consoleWarnShouldBeCalledWithTheFirstStringInYellowAndTheOtherArguments() {
	const { testArguments } = this.test.ctx;
	const yellowArgument = chalk.yellow(testArguments[0]);
	console.warn.should.be.calledWithExactly(
		yellowArgument,
		...testArguments.slice(1),
	);
}

export function consoleWarnShouldBeCalledWithTheStringsInYellow() {
	const { testArguments } = this.test.ctx;
	const yellowArguments = testArguments.map(arg => chalk.yellow(arg));
	console.warn.should.be.calledWithExactly(...yellowArguments);
}

export function itShouldPrintTheErrorMessageInRed() {
	const { testError: { message }, errorMessage } = this.test.ctx;
	return message.should.be.equal(chalk.red(errorMessage));
}

export function theErrorShouldBePrintedWithThePrefix() {
	const { printFunction, errorMessage, prefix } = this.test.ctx;
	return printFunction.should.be.calledWithExactly({
		error: `${prefix}: ${errorMessage}`,
	});
}

export function theActiveCommandShouldBeUsedToLog() {
	const { activeCommand } = this.test.ctx;
	return activeCommand.log.should.be.calledOnce;
}

export function theObjectShouldBePrinted() {
	const { printFunction, testObject } = this.test.ctx;
	return printFunction.should.be.calledWithExactly(testObject);
}

export function aTableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	return vorpal.log.should.be.calledWithExactly(tableOutput);
}

export function prettyJSONOutputShouldBeLoggedWithoutANSICodes() {
	const { resultWithoutANSICodes, vorpal } = this.test.ctx;
	const prettyJSONOutput = JSON.stringify(resultWithoutANSICodes, null, '\t');
	return vorpal.log.should.be.calledWithExactly(prettyJSONOutput);
}

export function jsonOutputShouldBeLoggedWithoutANSICodes() {
	const { resultWithoutANSICodes, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(resultWithoutANSICodes);
	return vorpal.log.should.be.calledWithExactly(jsonOutput);
}

export function shouldUseJSONOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject() {
	const { config } = this.test.ctx;
	return shouldUseJSONOutput.should.be.calledWithExactly(config, {});
}

export function shouldUsePrettyOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject() {
	const { config } = this.test.ctx;
	return shouldUsePrettyOutput.should.be.calledWithExactly(config, {});
}

export function shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions() {
	const { config, options } = this.test.ctx;
	return shouldUseJSONOutput.should.be.calledWithExactly(config, options);
}

export function shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions() {
	const { config, options } = this.test.ctx;
	return shouldUsePrettyOutput.should.be.calledWithExactly(config, options);
}

export function theReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	return returnValue.options.should.have.property('head').eql([]);
}

export function theReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	return returnValue.should.have.length(0);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	return returnValue.options.should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	return returnValue[0].should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedKeys() {
	const { returnValue } = this.test.ctx;
	const keys = ['root', 'nested.object', 'nested.testing', 'nested.nullValue'];
	return returnValue.options.should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectDeeplyNestedKeys() {
	const { returnValue } = this.test.ctx;
	const keys = [
		'root',
		'nested.object',
		'nested.testing',
		'nested.nullValue',
		'nested.asset.publicKey',
		'nested.asset.keys.more',
	];
	return returnValue.options.should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedValues() {
	const { returnValue } = this.test.ctx;
	const values = ['value', 'values', 123, null];
	return returnValue[0].should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectDeeplyNestedValues() {
	const { returnValue } = this.test.ctx;
	const values = [
		'value',
		'values',
		123,
		null,
		'aPublicKeyString',
		'publicKey1\npublicKey2',
	];
	return returnValue[0].should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	return returnValue.options.should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const values = Object.values(testObject);
		return returnValue[i].should.eql(values);
	});
}

export function theReturnedTableShouldHaveAHeadWithEveryUniqueKey() {
	const { returnValue, testArray } = this.test.ctx;
	const uniqueKeys = testArray.reduce((keys, testObject) => {
		const newKeys = Object.keys(testObject).filter(key => !keys.includes(key));
		return [...keys, ...newKeys];
	}, []);
	return returnValue.options.should.have.property('head').eql(uniqueKeys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const row = returnValue[i];
		const values = Object.values(testObject);

		values.forEach(value => row.should.containEql(value));
		return row
			.filter(value => !values.includes(value))
			.forEach(value => should(value).be.undefined());
	});
}

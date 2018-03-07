/*
 * LiskHQ/lisk-commander
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
import { getFirstQuotedString, getFirstBoolean } from '../utils';
import logger from '../../../src/utils/logger';
import * as configUtils from '../../../src/utils/config';

export function itShouldCallSetConfigWithTheUpdatedConfig() {
	const { config } = this.test.ctx;
	return expect(configUtils.setConfig).to.be.calledWithExactly(config);
}

export function itShouldUpdateTheConfigVariableToTheFirstValue() {
	const { config, values } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	return expect(config)
		.to.have.property(variable)
		.equal(values[0]);
}

export function itShouldUpdateTheConfigNestedVariableToTheFirstValue() {
	const { config, values } = this.test.ctx;
	const nestedVariable = getFirstQuotedString(this.test.title).split('.');
	const configValue = nestedVariable.reduce(
		(currentObject, nextKey) => currentObject[nextKey],
		config,
	);
	return expect(configValue).to.equal(values[0]);
}

export function itShouldUpdateTheConfigNestedVariableToTheValues() {
	const { config, values } = this.test.ctx;
	const nestedVariable = getFirstQuotedString(this.test.title).split('.');
	const configValue = nestedVariable.reduce(
		(currentObject, nextKey) => currentObject[nextKey],
		config,
	);
	return expect(configValue).to.equal(values);
}

export function itShouldUpdateTheConfigNestedVariableToEmptyArray() {
	const { config } = this.test.ctx;
	const nestedVariable = getFirstQuotedString(this.test.title).split('.');
	const configValue = nestedVariable.reduce(
		(currentObject, nextKey) => currentObject[nextKey],
		config,
	);
	return expect(configValue).to.eql([]);
}

export function itShouldUpdateTheConfigVariableToBoolean() {
	const { config } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	const boolean = getFirstBoolean(this.test.title);
	return expect(config)
		.to.have.property(variable)
		.equal(boolean);
}

export function itShouldResolveToTheConfig() {
	const { returnValue, config } = this.test.ctx;
	return expect(returnValue).to.eventually.eql(config);
}

export function theDefaultConfigShouldBeReturned() {
	const { config, defaultConfig } = this.test.ctx;
	return expect(config).to.eql(defaultConfig);
}

export function theUsersConfigShouldBeReturned() {
	const { config, userConfig } = this.test.ctx;
	return expect(config).to.eql(userConfig);
}

export function theUserShouldBeWarnedThatTheConfigWillNotBePersisted() {
	return expect(logger.warn).to.be.calledWithMatch(
		/Your configuration will not be persisted\./,
	);
}

export function theUserShouldBeInformedThatTheConfigFileCannotBeReadOrIsNotValidJSON() {
	const { filePath } = this.test.ctx;
	return expect(logger.error).to.be.calledWithExactly(
		`Config file cannot be read or is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`,
	);
}

export function theUserShouldBeInformedThatAConfigLockfileWasFoundAtPath() {
	const path = getFirstQuotedString(this.test.title);
	return expect(logger.error).to.be.calledWithExactly(
		`Config lockfile at ${path} found. Are you running Lisky in another process?`,
	);
}

export function theUserShouldBeInformedThatTheConfigFileIsCorrupted() {
	const path = getFirstQuotedString(this.test.title);
	return expect(logger.error).to.be.calledWithExactly(
		`Config file seems to be corrupted: missing required keys. Please check ${path} or delete the file so we can create a new one from defaults.`,
	);
}

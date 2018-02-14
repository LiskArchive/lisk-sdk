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
import { getFirstQuotedString, getFirstBoolean } from '../utils';
import { logError, logWarning } from '../../../src/utils/print';

export function itShouldUpdateTheConfigVariableToTheValue() {
	const { config, value } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	return config.should.have.property(variable).equal(value);
}

export function itShouldUpdateTheConfigNestedVariableToBoolean() {
	const { config } = this.test.ctx;
	const nestedVariable = getFirstQuotedString(this.test.title).split('.');
	const boolean = getFirstBoolean(this.test.title);
	const value = nestedVariable.reduce(
		(currentObject, nextKey) => currentObject[nextKey],
		config,
	);
	return value.should.equal(boolean);
}

export function itShouldUpdateTheConfigVariableToBoolean() {
	const { config } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	const boolean = getFirstBoolean(this.test.title);
	return config.should.have.property(variable).equal(boolean);
}

export function itShouldResolveToTheConfig() {
	const { returnValue, config } = this.test.ctx;
	return returnValue.should.be.eventually.eql(config);
}

export function theDefaultConfigShouldBeExported() {
	const { config, defaultConfig } = this.test.ctx;
	return config.should.eql(defaultConfig);
}

export function theUsersConfigShouldBeExported() {
	const { config, userConfig } = this.test.ctx;
	return config.should.eql(userConfig);
}

export function theUserShouldBeWarnedThatTheConfigWillNotBePersisted() {
	return logWarning.should.be.calledWithMatch(
		/Your configuration will not be persisted\./,
	);
}

export function theUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect() {
	const { filePath } = this.test.ctx;
	return logError.should.be.calledWithExactly(
		`Could not read config file. Please check permissions for ${filePath} or delete the file so we can create a new one from defaults.`,
	);
}

export function theUserShouldBeInformedThatTheConfigFileIsNotValidJSON() {
	const { filePath } = this.test.ctx;
	return logError.should.be.calledWithExactly(
		`Config file is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`,
	);
}

export function theUserShouldBeInformedThatAConfigLockfileWasFoundAtPath() {
	const path = getFirstQuotedString(this.test.title);
	return logError.should.be.calledWithExactly(
		`Config lockfile at ${path} found. Are you running Lisky in another process?`,
	);
}

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
 */
/* eslint-disable max-classes-per-file */

export class FrameworkError extends Error {
	public name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public constructor(...args: any[]) {
		super(...args);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, FrameworkError);
	}
}

export class SchemaValidationError extends FrameworkError {
	public errors: Error[];
	public constructor(errors: Error[]) {
		super(JSON.stringify(errors, null, 2));
		this.errors = errors;
	}
}

export class DuplicateAppInstanceError extends FrameworkError {
	public appLabel: string;
	public pidPath: string;
	public constructor(appLabel: string, pidPath: string) {
		super(`Duplicate app instance for "${appLabel}"`);
		this.appLabel = appLabel;
		this.pidPath = pidPath;
	}
}

export class ImplementationMissingError extends FrameworkError {
	public constructor() {
		super('Implementation missing error');
	}
}

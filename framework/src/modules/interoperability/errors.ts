import { validNameChars } from './utils';

export class InvalidNameError extends Error {
	public constructor(name = 'name') {
		const msg = `Invalid ${name} property. It should contain only characters from the set [${validNameChars}].`;
		super(msg);

		this.name = 'InvalidNameError';
	}
}

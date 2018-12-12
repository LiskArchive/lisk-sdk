/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import { onlyDigits, validateIp, validatePort } from '../../src/utils';

describe('utils', () => {
	describe('#validateIp', () => {
		const correctIp = '127.0.0.1';
		const IpWithCharacters = '127k.0.0.1';
		const IpWithLessBlocks = '127.0.0';
		const IpWithSpaces = '127.0.0. 1';

		describe('correct ip', () => {
			it('should return true', () => {
				return expect(validateIp(correctIp)).to.be.true;
			});
		});

		describe('ip with characters', () => {
			it('should return false', () => {
				return expect(validateIp(IpWithCharacters)).to.be.false;
			});
		});

		describe('ip with less blocks', () => {
			it('should return false', () => {
				return expect(validateIp(IpWithLessBlocks)).to.be.false;
			});
		});

		describe('ip with spaces', () => {
			it('should return false', () => {
				return expect(validateIp(IpWithSpaces)).to.be.false;
			});
		});

		describe('ip is null', () => {
			it('should return false', () => {
				return expect(validateIp(null)).to.be.false;
			});
		});

		describe('ip is object', () => {
			it('should return false', () => {
				return expect(validateIp({})).to.be.false;
			});
		});
	});

	describe('#onlyDigits', () => {
		const correctStringWithOnlyNumbers = '76878';
		const inCorrectString = '56676ffg';

		describe('correct string with only number', () => {
			it('should return true', () => {
				return expect(onlyDigits(correctStringWithOnlyNumbers)).to.be.true;
			});
		});

		describe('incorrect string with not only digits', () => {
			it('should return false', () => {
				return expect(onlyDigits(inCorrectString)).to.be.false;
			});
		});

		describe('if argument is null', () => {
			it('should return false', () => {
				return expect(onlyDigits(null)).to.be.false;
			});
		});

		describe('if argument is an object', () => {
			it('should return false', () => {
				return expect(onlyDigits({})).to.be.false;
			});
		});
	});

	describe('#validatePort', () => {
		const correctPort = '5001';
		const portWithCharacters = '5q01';
		const portOutOfRange = '65539';

		describe('correct string with valid port number', () => {
			it('should return true', () => {
				return expect(validatePort(correctPort)).to.be.true;
			});
		});

		describe('incorrect port value having characters', () => {
			it('should return false', () => {
				return expect(validatePort(portWithCharacters)).to.be.false;
			});
		});

		describe('incorrect port number out of range', () => {
			it('should return false', () => {
				return expect(validatePort(portOutOfRange)).to.be.false;
			});
		});

		describe('port number is null', () => {
			it('should return false', () => {
				return expect(validatePort(null)).to.be.false;
			});
		});

		describe('port number is an object', () => {
			it('should return false', () => {
				return expect(validatePort({})).to.be.false;
			});
		});
	});
});

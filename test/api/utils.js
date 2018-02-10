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
const utils = require('api/utils');

describe('api utils module', () => {
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetHash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const livePort = '8000';
	const testPort = '7000';
	const sslPort = '443';

	describe('#getDefaultPort', () => {
		it('should return testnet port when testport is true and ssl is false', () => {
			const port = utils.getDefaultPort(true, false);
			port.should.be.type('string').and.equal(testPort);
		});
		it('should return testnet port when testport and ssl is true', () => {
			const port = utils.getDefaultPort(true, true);
			port.should.be.type('string').and.equal(testPort);
		});
		it('should return ssl port', () => {
			const port = utils.getDefaultPort(false, true);
			port.should.be.type('string').and.equal(sslPort);
		});
		it('should return live port', () => {
			const port = utils.getDefaultPort(false, false);
			port.should.be.type('string').and.equal(livePort);
		});
	});

	describe('#getDefaultHeaders', () => {
		it('should return testnet headers', () => {
			const header = utils.getDefaultHeaders(8080, true);
			header.should.have.property('Content-Type').and.be.type('string');
			header.should.have
				.property('nethash')
				.and.be.type('string')
				.and.equal(testnetHash);
			header.should.have
				.property('broadhash')
				.and.be.type('string')
				.and.equal(testnetHash);
			header.should.have.property('os').and.be.type('string');
			header.should.have.property('version').and.be.type('string');
			header.should.have.property('minVersion').and.be.type('string');
			return header.should.have
				.property('port')
				.and.be.type('number')
				.and.equal(8080);
		});
		it('should return mainnet headers', () => {
			const header = utils.getDefaultHeaders(8080, false);
			header.should.have.property('Content-Type').and.be.type('string');
			header.should.have
				.property('nethash')
				.and.be.type('string')
				.and.equal(mainnetHash);
			header.should.have
				.property('broadhash')
				.and.be.type('string')
				.and.equal(mainnetHash);
			header.should.have.property('os').and.be.type('string');
			header.should.have.property('version').and.be.type('string');
			header.should.have.property('minVersion').and.be.type('string');
			return header.should.have
				.property('port')
				.and.be.type('number')
				.and.equal(8080);
		});
	});
});

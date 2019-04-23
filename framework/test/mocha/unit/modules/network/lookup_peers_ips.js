const lookupPeersIps = require('../../../../../src/modules/network/lookup_peers_ips');
const {
	peers: { list },
} = require('../../../data/app_config.json');

const ipv4Regex = new RegExp(
	/^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/
);

describe('init_steps/lookup_peers_ips', () => {
	it('should return empty array if peers are not enabled', async () => {
		const result = await lookupPeersIps(list, false);

		return expect(result).to.eql([]);
	});

	describe('for each peer', () => {
		let spyConsoleError = null;

		before(done => {
			spyConsoleError = sinonSandbox.spy(console, 'error');
			done();
		});

		it('should throw error when failed to resolve hostname', async () => {
			await lookupPeersIps([{ ip: 'https://lisk.io/' }], true);

			expect(spyConsoleError).to.be.calledOnce;
			return expect(spyConsoleError).to.be.calledWith(
				'Failed to resolve peer domain name https://lisk.io/ to an IP address'
			);
		});

		it('should resolve hostnames to ip address', async () => {
			const resolvedIps = await lookupPeersIps(list, true);

			expect(resolvedIps.length).to.eql(list.length);
			return resolvedIps.forEach(peer => {
				expect(ipv4Regex.test(peer.ip)).to.be.true;
			});
		});
	});
});

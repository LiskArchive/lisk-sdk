import liskApi from '../../src/api/liskApi';

describe('ParseOfflineRequests', () => {
	const LSK = liskApi();

	describe('#httpGETPUTorPOST', () => {
		it('should tell if GET request', () => {
			const requestMethod1 = LSK.parseOfflineRequests('blocks/getHeight');

			(requestMethod1.requestMethod).should.be.equal('GET');
		});

		it('should tell if POST request', () => {
			const requestMethod2 = LSK.parseOfflineRequests('accounts/open');

			(requestMethod2.requestMethod).should.be.equal('POST');
		});

		it('should tell if PUT request', () => {
			const requestMethod3 = LSK.parseOfflineRequests('delegates');

			(requestMethod3.requestMethod).should.be.equal('PUT');
		});
	});

	describe('#checkDoubleNamedAPI', () => {
		it('should route to getTransactions when /transactions API is called and no secret is added', () => {
			const requestMethodGetTx = LSK.parseOfflineRequests('transactions', { senderId: '123' });

			(requestMethodGetTx.requestMethod).should.be.equal('GET');
		});
	});

	describe('#checkDoubleNamedAPI', () => {
		it('should route to getTransactions when /transactions API is called and no secret is added', () => {
			const requestMethodGetTx = LSK.parseOfflineRequests('transactions', { senderId: '123' });

			(requestMethodGetTx.requestMethod).should.be.equal('GET');
		});
	});
});

module.exports = {
	stringToIpPortSet: value => {
		if (typeof value === 'string') {
			return value.split(',').map(peer => {
				const [ip, wsPort] = peer.split(':');
				return {
					ip,
					wsPort: wsPort || 5000,
				};
			});
		}
		return [];
	},

	stringToDelegateList: value => {
		if (typeof value === 'string') {
			return value.split(',').map(delegate => {
				const [publicKey, encryptedPassphrase] = delegate.split('|');
				return {
					publicKey,
					encryptedPassphrase,
				};
			});
		}
		return [];
	},
};

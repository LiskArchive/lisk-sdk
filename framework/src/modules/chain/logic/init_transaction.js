const _ = require('lodash');

const transferAsset = raw => {
	if (raw.tf_data) {
		// This line will throw if there is an error
		const data = raw.tf_data.toString('utf8');
		return { data };
	}
	return null;
};

const signatureAsset = raw => {
	if (!raw.s_publicKey) {
		return null;
	}
	const signature = {
		transactionId: raw.t_id,
		publicKey: raw.s_publicKey,
	};

	return { signature };
};

const delegateAsset = raw => {
	if (!raw.d_username) {
		return null;
	}
	const delegate = {
		username: raw.d_username,
		publicKey: raw.t_senderPublicKey,
		address: raw.t_senderId,
	};

	return { delegate };
};

const voteAsset = raw => {
	if (!raw.v_votes) {
		return null;
	}
	const votes = raw.v_votes.split(',');

	return { votes };
};

const multiAsset = raw => {
	if (!raw.m_keysgroup) {
		return null;
	}
	const multisignature = {
		min: raw.m_min,
		lifetime: raw.m_lifetime,
	};

	if (typeof raw.m_keysgroup === 'string') {
		multisignature.keysgroup = raw.m_keysgroup.split(',');
	} else {
		multisignature.keysgroup = [];
	}

	return { multisignature };
};

const dappAsset = raw => {
	if (!raw.dapp_name) {
		return null;
	}
	const dapp = {
		name: raw.dapp_name,
		description: raw.dapp_description,
		tags: raw.dapp_tags,
		type: raw.dapp_type,
		link: raw.dapp_link,
		category: raw.dapp_category,
		icon: raw.dapp_icon,
	};

	return { dapp };
};

const inTransferAsset = raw => {
	if (!raw.in_dappId) {
		return null;
	}
	const inTransfer = {
		dappId: raw.in_dappId,
	};

	return { inTransfer };
};

const outTransferAsset = raw => {
	if (!raw.ot_dappId) {
		return null;
	}
	const outTransfer = {
		dappId: raw.ot_dappId,
		transactionId: raw.ot_outTransactionId,
	};

	return { outTransfer };
};

class Transaction {
	constructor(transactions) {
		this.transactionClassMap = new Map();

		// TODO: remove after https://github.com/LiskHQ/lisk/issues/2424
		this.assetDbReadMap = new Map([
			[0, transferAsset],
			[1, signatureAsset],
			[2, delegateAsset],
			[3, voteAsset],
			[4, multiAsset],
			[5, dappAsset],
			[6, inTransferAsset],
			[7, outTransferAsset],
		]);

		Object.values(transactions).forEach((transaction, index) => {
			this.transactionClassMap.set(index, transaction);
		});
	}

	dbRead(raw) {
		if (!raw.t_id) {
			return null;
		}

		const transactionJSON = {
			id: raw.t_id,
			height: raw.b_height,
			blockId: raw.b_id || raw.t_blockId,
			type: parseInt(raw.t_type),
			timestamp: parseInt(raw.t_timestamp),
			senderPublicKey: raw.t_senderPublicKey,
			requesterPublicKey: raw.t_requesterPublicKey,
			senderId: raw.t_senderId,
			recipientId: raw.t_recipientId,
			recipientPublicKey: raw.m_recipientPublicKey || null,
			amount: raw.t_amount,
			fee: raw.t_fee,
			signature: raw.t_signature,
			signSignature: raw.t_signSignature,
			signatures: raw.t_signatures ? raw.t_signatures.split(',') : [],
			confirmations: parseInt(raw.confirmations),
			asset: {},
		};

		const assetDbRead = this.assetDbReadMap.get(transactionJSON.type);

		if (!assetDbRead) {
			throw `Unknown transaction type ${transactionJSON.type}`;
		}

		const asset = assetDbRead(raw);

		if (asset) {
			transactionJSON.asset = Object.assign(transactionJSON.asset, asset);
		}

		return this.jsonRead(_.omitBy(transactionJSON, _.isNull));
	}

	storageRead(raw) {
		if (!raw.id) {
			return null;
		}

		const rawData = _.omitBy(raw, _.isNull);

		return this.jsonRead(rawData);
	}

	jsonRead(rawTx) {
		const TransactionClass = this.transactionClassMap.get(rawTx.type);

		if (!TransactionClass) {
			throw new Error('Transaction type not found.');
		}

		return new TransactionClass(rawTx);
	}
}

module.exports = Transaction;

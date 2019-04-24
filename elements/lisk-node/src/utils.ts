import { ProtocolBlock } from './type';
import { BlockJSON } from '@liskhq/lisk-blockchain';

const TRANSACTION_TRANSFER = 0;
interface AssetTransfer {
	readonly data: string;
}
const TRANSACTION_SECOND_SIGNATURE = 1;
interface AssetSecondSignature {
	readonly signature: {
		readonly publicKey: string;
	};
}
const TRANSACTION_DELEGATE = 2;
interface AssetDelegate {
	readonly delegate: {
		readonly username: string;
	};
}
const TRANSACTION_VOTE = 3;
interface AssetVote {
	readonly votes: ReadonlyArray<string>;
}
const TRANSACTION_MULTI_SIGN = 4;
interface AssetMulti {
	readonly multisignature: {
		readonly keysgroup: ReadonlyArray<string>;
		readonly min: number;
		readonly lifetime: number;
	};
}
const TRANSACTION_DAPP = 5;
interface AssetDapp {
	readonly dapp: {
		readonly category: number;
		readonly description?: string;
		readonly icon?: string;
		readonly link: string;
		readonly name: string;
		readonly tags?: string;
		readonly type: number;
	};
}
const TRANSACTION_IN_TRANSFER = 6;
interface AssetInTransfer {
	readonly inTransfer: {
		readonly dappId: string;
	};
}
const TRANSACTION_OUT_TRANSFER = 7;
interface AssetOutTransfer {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}

export const protocolBlockToDomain = (
	rawBlock: ReadonlyArray<ProtocolBlock>,
): ReadonlyArray<BlockJSON> => {
	const blocks = rawBlock.reduce((prev, current) => {
		const blockJSON = prev.get(current.b_id) || {
			id: current.b_id,
			version: current.b_version,
			timestamp: current.b_timestamp,
			height: current.b_height,
			previousBlock: current.b_priviousBlock,
			numberOfTransactions: current.b_numberOfTransactions,
			totalAmount: current.b_totalAmount,
			totalFee: current.b_totalFee,
			reward: current.b_reward,
			payloadHash: current.b_payloadHash,
			payloadLength: current.b_payloadLength,
			generatorPublicKey: current.b_generatorPublicKey,
			blockSignature: current.b_blockSignature,
			transactions: [],
		};
		if (!current.t_id) {
			prev.set(current.b_id, blockJSON);

			return prev;
		}
		const baseTransaction = {
			id: current.t_id,
			type: current.t_type,
			timestamp: current.t_timestamp,
			senderPublicKey: current.t_senderPublicKey,
			senderId: current.t_senderId,
			recipientId: current.t_recipientId || '',
			recipientPublicKey: current.t_recipientPublicKey,
			signature: current.t_signature,
			signSignature: current.t_signSignature,
			signatures: current.t_signatures ? current.t_signatures.split(',') : [],
			amount: current.t_amount,
			fee: current.t_fee,
		};

		switch (current.t_type) {
			case TRANSACTION_TRANSFER: {
				const tx = {
					...baseTransaction,
					asset: {
						data: current.tf_data || undefined,
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_SECOND_SIGNATURE: {
				const tx = {
					...baseTransaction,
					asset: {
						signature: {
							publicKey: current.s_publicKey,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_DELEGATE: {
				const tx = {
					...baseTransaction,
					asset: {
						delegate: {
							username: current.d_username,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_VOTE: {
				const tx = {
					...baseTransaction,
					asset: {
						votes: current.v_votes ? current.v_votes.split(',') : [],
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_MULTI_SIGN: {
				const tx = {
					...baseTransaction,
					asset: {
						multisignature: {
							keysgroup: current.m_keysgroups
								? current.m_keysgroups.split(',')
								: [],
							min: current.m_min,
							lifetime: current.m_lifetime,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_DAPP: {
				const tx = {
					...baseTransaction,
					asset: {
						dapp: {
							name: current.dapp_name,
							description: current.dapp_description,
							tags: current.dapp_tags,
							type: current.dapp_type,
							link: current.dapp_link,
							category: current.dapp_category,
							icon: current.dapp_icon,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_IN_TRANSFER: {
				const tx = {
					...baseTransaction,
					asset: {
						inTransfer: {
							dappId: current.in_dappId,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			case TRANSACTION_OUT_TRANSFER: {
				const tx = {
					...baseTransaction,
					asset: {
						outTransfer: {
							transactionId: current.ot_outTransactionId,
							dappId: current.in_dappId,
						},
					},
				};
				prev.set(current.b_id, {
					...blockJSON,
					transactions: [...blockJSON.transactions, tx],
				});
				break;
			}
			default:
				throw new Error('invalid transaction type');
		}

		return prev;
	}, new Map<string, BlockJSON>());

	return Array.from(blocks.values());
};

export const domainToProtocolBlock = (
	blocks: ReadonlyArray<BlockJSON>,
): ReadonlyArray<ProtocolBlock> =>
	blocks.reduce(
		(prev, current) => {
			const baseBlock = {
				b_id: current.id as string,
				b_version: current.version,
				b_timestamp: current.timestamp,
				b_height: current.height as number,
				b_priviousBlock: current.previousBlock as string,
				b_numberOfTransactions: current.numberOfTransactions,
				b_totalAmount: current.totalAmount,
				b_totalFee: current.totalFee,
				b_reward: current.reward,
				b_payloadHash: current.payloadHash,
				b_payloadLength: current.payloadLength,
				b_generatorPublicKey: current.generatorPublicKey,
				b_blockSignature: current.blockSignature as string,
			};
			if (!current.transactions || current.transactions.length <= 0) {
				return [
					...prev,
					{
						...baseBlock,
						t_id: '',
						t_type: 0,
						t_timestamp: 0,
						t_senderPublicKey: '',
						t_senderId: '',
						t_recipientId: '',
						t_recipientPublicKey: '',
						t_signature: '',
						t_amount: '',
						t_fee: '',
					},
				];
			}
			// tslint:disable-next-line cyclomatic-complexity
			const protocolBlocks = current.transactions.map(tx => ({
				...baseBlock,
				t_id: tx.id as string,
				t_type: tx.type,
				t_timestamp: tx.timestamp,
				t_senderPublicKey: tx.senderPublicKey,
				t_senderId: tx.senderId || '',
				t_recipientId: tx.recipientId || '',
				t_recipientPublicKey: tx.recipientPublicKey || '',
				t_signature: tx.signature || '',
				t_signSignature: tx.signSignature,
				t_signatures: tx.signatures ? tx.signatures.join(',') : '',
				t_amount: tx.amount as string,
				t_fee: tx.fee,
				tf_data:
					tx.type === TRANSACTION_TRANSFER && 'data' in tx.asset
						? (tx.asset as AssetTransfer).data
						: '',
				s_publicKey:
					tx.type === TRANSACTION_SECOND_SIGNATURE && 'signature' in tx.asset
						? (tx.asset as AssetSecondSignature).signature.publicKey
						: '',
				d_username:
					tx.type === TRANSACTION_DELEGATE && 'delegate' in tx.asset
						? (tx.asset as AssetDelegate).delegate.username
						: '',
				v_votes:
					tx.type === TRANSACTION_VOTE && 'votes' in tx.asset
						? (tx.asset as AssetVote).votes.join(',')
						: '',
				m_keysgroup:
					tx.type === TRANSACTION_MULTI_SIGN && 'multisignature' in tx.asset
						? (tx.asset as AssetMulti).multisignature.keysgroup.join(',')
						: '',
				m_min:
					tx.type === TRANSACTION_MULTI_SIGN && 'multisignature' in tx.asset
						? (tx.asset as AssetMulti).multisignature.min.toString()
						: '',
				m_lifetime:
					tx.type === TRANSACTION_MULTI_SIGN && 'multisignature' in tx.asset
						? (tx.asset as AssetMulti).multisignature.lifetime.toString()
						: '',
				dapp_name:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.name
						: '',
				dapp_description:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.description
						: '',
				dapp_tags:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.tags
						: '',
				dapp_type:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.type.toString()
						: '',
				dapp_link:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.link
						: '',
				dapp_category:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.category.toString()
						: '',
				dapp_icon:
					tx.type === TRANSACTION_DAPP && 'dapp' in tx.asset
						? (tx.asset as AssetDapp).dapp.icon
						: '',
				in_dappId:
					tx.type === TRANSACTION_IN_TRANSFER && 'inTransfer' in tx.asset
						? (tx.asset as AssetInTransfer).inTransfer.dappId
						: '',
				out_dappId:
					tx.type === TRANSACTION_OUT_TRANSFER && 'outTransfer' in tx.asset
						? (tx.asset as AssetOutTransfer).outTransfer.dappId
						: '',
				out_outTransactionId:
					tx.type === TRANSACTION_OUT_TRANSFER && 'outTransfer' in tx.asset
						? (tx.asset as AssetOutTransfer).outTransfer.transactionId
						: '',
			}));

			return [...prev, ...protocolBlocks];
		},
		[] as ReadonlyArray<ProtocolBlock>,
	);

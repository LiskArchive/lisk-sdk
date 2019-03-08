/// <reference path="../types/browserify-bignum/index.d.ts" />
import { DB } from '@liskhq/lisk-db';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';

// const dbi = new DB('./blockchain.db');
const BUCKET_CANDIDATE = 'candidate';
const BUCKET_ACCOUNT = 'address:account';
const getEndingKey = (key: string): string => {
	const lastChar = String.fromCharCode(key.charCodeAt(key.length - 1) + 1);

	return key.slice(0, -1) + lastChar;
};

const getCandidates = async (
	db: DB,
	limit: number,
): Promise<Map<string, string>> =>
	new Promise<Map<string, string>>((resolve, reject) => {
		const res = new Map<string, string>();
		db.createReadStream({
			gte: BUCKET_CANDIDATE,
			lt: getEndingKey(BUCKET_CANDIDATE),
			limit,
			reverse: true,
		})
			.on('data', data => {
				const keys = data.key.split(':');
				res.set(data.value, keys[1]);
			})
			.on('error', reject)
			.on('end', () => {
				resolve(res);
			});
	});

const calculateWeight = async (db: DB): Promise<Map<string, string>> => {
	const resultMap = new Map<string, string>();

	return new Promise<Map<string, string>>((resolve, reject) => {
		db.createReadStream({
			gte: BUCKET_ACCOUNT,
			lt: getEndingKey(BUCKET_ACCOUNT),
		})
			.on('data', ({ value }) => {
				if (
					value.votedDelegatesPublicKeys &&
					value.votedDelegatesPublicKeys.length > 0
				) {
					value.votedDelegatesPublicKeys.forEach((pk: string) => {
						const address = getAddressFromPublicKey(pk);
						if (resultMap.has(address)) {
							const original = resultMap.get(address);
							resultMap.set(
								address,
								new BigNum(original as string).add(value.balance).toString(),
							);
						} else {
							resultMap.set(address, value.balance);
						}
					});
				}
			})
			.on('error', reject)
			.on('end', () => {
				resolve(resultMap);
			});
	});
};

export const validateWeight = async (db: DB): Promise<void> => {
	const candidates = await getCandidates(db, 500);
	const calculatedWeight = await calculateWeight(db);
	calculatedWeight.forEach((val, address) => {
		const weight = candidates.get(address);
		const weightStr = weight ? parseInt(weight, 10).toString() : '';
		if (val !== weightStr) {
			throw new Error(
				`Invalid vote weight Address: ${address} Expected: ${val} Actual: ${weightStr}`,
			);
		}
	});
};

// const run = async () => {
// 	const candidates = await getCandidates(dbi, 500);
// 	const calculatedWeight = await calculateWeight(dbi);
// 	calculatedWeight.forEach((val, address) => {
// 		const weight = candidates.get(address);
// 		const weightStr = weight ? parseInt(weight, 10).toString(): '';
// 		console.log(`Address: ${address} Value: ${val} weight: ${weightStr} ok?: ${val === weightStr}`);
// 	});
// };

// run()
// .catch(console.error);

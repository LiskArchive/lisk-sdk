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

interface PKWeight {
	readonly publicKey: string;
	readonly weight: string;
}

const getCandidates = async (
	db: DB,
	limit: number,
): Promise<Map<string, PKWeight>> =>
	new Promise<Map<string, PKWeight>>((resolve, reject) => {
		const res = new Map<string, PKWeight>();
		db.createReadStream({
			gte: BUCKET_CANDIDATE,
			lt: getEndingKey(BUCKET_CANDIDATE),
			limit,
			reverse: true,
		})
			.on('data', data => {
				const keys = data.key.split(':');
				res.set(data.value, { weight: keys[1], publicKey: keys[2] });
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
	const errors = [] as Error[];
	calculatedWeight.forEach((val, address) => {
		const candidate = candidates.get(address);
		const weightStr = candidate
			? parseInt(candidate.weight, 10).toString()
			: '';
		if (val !== weightStr) {
			errors.push(
				new Error(
					`Invalid vote weight Address: ${address} Expected: ${val} Actual: ${weightStr}`,
				),
			);
		}
	});
	if (errors.length > 0) {
		throw errors;
	}
};

export const validateDuplicate = async (db: DB): Promise<void> => {
	const candidates = await new Promise<PKWeight[]>((resolve, reject) => {
		const res = [] as PKWeight[];
		db.createReadStream({
			gte: BUCKET_CANDIDATE,
			lt: getEndingKey(BUCKET_CANDIDATE),
			limit: 500,
		})
			.on('data', data => {
				const keys = data.key.split(':');
				res.push({ weight: keys[1], publicKey: keys[2] });
			})
			.on('error', reject)
			.on('end', () => {
				resolve(res);
			});
	});
	const map = new Map<string, string>();
	candidates.forEach(candidate => {
		if (map.has(candidate.publicKey)) {
			throw new Error(
				`Candidate ${candidate.publicKey} is duplicate with ${
					candidate.weight
				} and ${map.get(candidate.publicKey)}`,
			);
		}
		map.set(candidate.publicKey, candidate.weight);
	});
};

// const run = async () => {
// 	const target = 'eddeb37070a19e1277db5ec34ea12225e84ccece9e6b2bb1bb27c3ba3999dac7';
// 	const targetAddress = getAddressFromPublicKey(target);
// 	const targetAccount = await dbi.get(BUCKET_ACCOUNT, targetAddress);
// 	const calculatedWeight = await new Promise<BigNum>((resolve, reject) => {
// 		let weight = new BigNum(0);
// 		dbi.createReadStream({
// 			gte: BUCKET_ACCOUNT,
// 			lt: getEndingKey(BUCKET_ACCOUNT),
// 		})
// 			.on('data', ({ value }) => {
// 				if (
// 					value.votedDelegatesPublicKeys &&
// 					value.votedDelegatesPublicKeys.length > 0 &&
// 					value.votedDelegatesPublicKeys.includes(target)
// 				) {
// 					weight = weight.add(value.balance);
// 				}
// 			})
// 			.on('error', reject)
// 			.on('end', () => {
// 				resolve(weight);
// 			});
// 	});
// 	console.log(targetAccount.votes);
// 	console.log(calculatedWeight.toString());
// };

// run()
// .catch(console.error);

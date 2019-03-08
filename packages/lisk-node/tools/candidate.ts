import { DB } from '@liskhq/lisk-db';

const db = new DB('./blockchain.db');
const BUCKET_CANDIDATE = 'candidate';
const getEndingKey = (key: string): string => {
	const lastChar = String.fromCharCode(key.charCodeAt(key.length - 1) + 1);

	return key.slice(0, -1) + lastChar;
};

const getCandidates = async (limit: number): Promise<any> =>
	new Promise<string[]>((resolve, reject) => {
		const res = [] as string[];
		db.createReadStream({
			gte: BUCKET_CANDIDATE,
			lt: getEndingKey(BUCKET_CANDIDATE),
			limit,
			reverse: true,
		})
			.on('data', data => {
				res.push(data.value);
			})
			.on('error', reject)
			.on('end', () => {
				resolve(res);
			});
	});

getCandidates(150)
	.then(async results =>
		Promise.all(
			results.map(async (address: string) =>
				db.get('address:account', address),
			),
		),
	)
	.then(accounts => {
		return accounts;
	})
	.then(accounts => {
		const set = new Set();
		accounts.forEach((val, i) => {
			set.add((val as any).username);
			console.log(`Ranking ${i}\n`, val);
		});
		console.log(set.values(), set.size);
	});

/*
 * Copyright © 2020 Lisk Foundation
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
 */

type HistoryType = [string, number];

interface Frontier {
	[key: string]: {
		x: number;
		history: HistoryType[];
	};
}

const diffAlgo = (initial: Buffer, final: Buffer): HistoryType[] => {
	const one = (idx: number): number => idx - 1;
	const initialBytesLength = initial.length;
	const finalBytesLength = final.length;

	if (initialBytesLength === 0) {
		return Array.from(final).map(b => ['+', b]);
	}

	if (finalBytesLength === 0) {
		return Array.from(initial).map(b => ['-', b]);
	}

	const frontier: Frontier = { 1: { x: 0, history: [] } };
	for (let d = 0; d < initialBytesLength + finalBytesLength + 1; d += 1) {
		for (let k = -d; k < d + 1; k += 2) {
			let history: HistoryType[] = [];
			const goDown =
				k === -d || (k !== d && frontier[k - 1].x < frontier[k + 1].x);

			let x: number;
			if (goDown) {
				history = [...frontier[k + 1].history];
				x = frontier[k + 1].x;
			} else {
				history = [...frontier[k - 1].history];
				x = frontier[k - 1].x + 1;
			}

			let y = x - k;

			if (y >= 0 && y <= finalBytesLength && goDown) {
				history.push(['+', final[one(y)]]);
			} else if (x >= 0 && x <= initialBytesLength) {
				history.push(['-', initial[one(x)]]);
			}

			while (
				x < initialBytesLength &&
				y < finalBytesLength &&
				initial[one(x + 1)] === final[one(y + 1)]
			) {
				x += 1;
				y += 1;
				history.push(['=', initial[one(x)]]);
			}

			if (x >= initialBytesLength && y >= finalBytesLength) {
				return history.splice(1);
			}

			if (x >= initialBytesLength && x + y === d + 2 * initialBytesLength) {
				const fDiff = diffAlgo(Buffer.from([]), final.subarray(y));

				return history.splice(1).concat(fDiff);
			}

			if (y >= finalBytesLength && x + y === d + 2 * finalBytesLength) {
				const fDiff = diffAlgo(initial.subarray(x), Buffer.from([]));

				return history.splice(1).concat(fDiff);
			}
			frontier[k] = { x, history };
		}
	}
	return [];
};

export const calculateDiff = (
	initial: Buffer,
	final: Buffer,
): HistoryType[] => {
	const longDiff = diffAlgo(initial, final);
	const reducedDiff = [];
	let count = 0;

	for (const b of longDiff) {
		if (b[0] === '+' || b[0] === '-') {
			if (count > 0) {
				reducedDiff.push(['=', count]);
			}
			reducedDiff.push(b);
			count = 0;
		} else {
			count += 1;
		}
	}
	if (count > 0) {
		reducedDiff.push(['=', count]);
	}
	return reducedDiff as HistoryType[];
};

export const undo = (finalBuffer: Buffer, diff: HistoryType[]): Buffer => {
	let finalBytes = Buffer.from(finalBuffer);
	let res = Buffer.from([]);

	for (const d of diff.reverse()) {
		if (d[0] === '=') {
			const unchangedBytes = finalBytes.slice(
				finalBytes.length - d[1],
				finalBytes.length,
			);
			finalBytes = finalBytes.slice(0, finalBytes.length - d[1]);
			res = Buffer.concat([unchangedBytes, res]);
		} else if (d[0] === '-') {
			res = Buffer.concat([Buffer.from([d[1]]), res]);
		} else if (d[0] === '+') {
			finalBytes = finalBytes.slice(0, finalBytes.length - 1);
		} else {
			throw new Error('Diff contains non expected symbol');
		}
	}

	return res;
};

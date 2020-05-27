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

/**
 * This function is an implementation of "An O(ND) Difference Algorithm and its Variations" (Myers, 1986)
 * See http://www.xmailserver.org/diff2.pdf
 *  */
const diffAlgo = (initial: Buffer, final: Buffer): HistoryType[] => {
	const one = (idx: number): number => idx - 1;
	const initialBytesLength = initial.length;
	const finalBytesLength = final.length;
	const emptyBuffer = Buffer.from([]);

	if (initialBytesLength === 0) {
		const diff = [];
		for (const byte of final) {
			diff.push(['+', byte]);
		}
		return diff as HistoryType[];
	}

	if (finalBytesLength === 0) {
		const diff = [];
		for (const byte of initial) {
			diff.push(['-', byte]);
		}
		return diff as HistoryType[];
	}

	/**
	 * This marks the farthest-right point along each diagonal in the edit grid,
	 * along with the history that got it there.
	 * */
	const frontier: Frontier = { 1: { x: 0, history: [] } };
	/**
	 * d is the total number of grid points and k is the cursor that moves within the grid.
	 */
	for (let d = 0; d < initialBytesLength + finalBytesLength + 1; d += 1) {
		for (let k = -d; k < d + 1; k += 2) {
			let history: HistoryType[] = [];
			/**
			 * This flag determines whether our next search will go down or right in the edit graph.
			 * We should go down if we are on the left edge (k === -d) to make sure if the left edge is fully explored.
			 * If we are not at the top (k !== d) then we try to go down and explore unvisited areas.
			 */
			const goDown =
				k === -d || (k !== d && frontier[k - 1].x < frontier[k + 1].x);

			let x: number;
			/**
			 * Find the starting point of this iteration, if you are going down then diagonal is lower,
			 * otherwise your diagonal is higher if we are going right.
			 * x and y represent the geometrical coordinates in the grid
			 */
			if (goDown) {
				// we want to avoid modifying the old history
				history = [...frontier[k + 1].history];
				x = frontier[k + 1].x;
			} else {
				// we want to avoid modifying the old history
				history = [...frontier[k - 1].history];
				x = frontier[k - 1].x + 1;
			}

			let y = x - k;

			/**
			 * We start at (0,0) in the grid and start inserting into the history
			 * when we move away.
			 */
			if (y >= 0 && y <= finalBytesLength && goDown) {
				history.push(['+', final[one(y)]]);
			} else if (x >= 0 && x <= initialBytesLength) {
				history.push(['-', initial[one(x)]]);
			}
			/**
			 * Cover as many common lines as we can to maximize it in the output.
			 */
			while (
				x < initialBytesLength &&
				y < finalBytesLength &&
				initial[one(x + 1)] === final[one(y + 1)]
			) {
				x += 1;
				y += 1;
				history.push(['=', initial[one(x)]]);
			}

			/**
			 * When we reach bottom-left of the corner then we are done
			 */
			if (x >= initialBytesLength && y >= finalBytesLength) {
				return history.splice(1);
			}

			if (x >= initialBytesLength && x + y === d + 2 * initialBytesLength) {
				const fDiff = diffAlgo(emptyBuffer, final.subarray(y));

				return history.splice(1).concat(fDiff);
			}

			if (y >= finalBytesLength && x + y === d + 2 * finalBytesLength) {
				const fDiff = diffAlgo(initial.subarray(x), emptyBuffer);

				return history.splice(1).concat(fDiff);
			}
			frontier[k] = { x, history };
		}
	}
	return [];
};

/**
 * This function returns the length of common prefix between two buffers
 */
const diffCommonPrefix = (buffer1: Buffer, buffer2: Buffer): number => {
	// Quick check for common null cases.
	if (buffer1[0] !== buffer2[0]) {
		return 0;
	}
	// Binary search.
	// Performance analysis: http://neil.fraser.name/news/2007/10/09/
	let pointerMin = 0;
	let pointerMax = Math.min(buffer1.length, buffer2.length);
	let pointerMid = pointerMax;
	let pointerstart = 0;

	while (pointerMin < pointerMid) {
		if (
			buffer1
				.slice(pointerstart, pointerMid)
				.equals(buffer2.slice(pointerstart, pointerMid))
		) {
			pointerMin = pointerMid;
			pointerstart = pointerMin;
		} else {
			pointerMax = pointerMid;
		}
		pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
	}

	return pointerMid;
};

/**
 * This function returns the length of common suffix between two buffers
 */
const diffCommonSuffix = (buffer1: Buffer, buffer2: Buffer): number => {
	// Quick check for common null cases.
	if (buffer1[buffer1.length - 1] !== buffer2[buffer2.length - 1]) {
		return 0;
	}
	// Binary search.
	// Performance analysis: http://neil.fraser.name/news/2007/10/09/
	let pointerMin = 0;
	let pointerMax = Math.min(buffer1.length, buffer2.length);
	let pointerMid = pointerMax;
	let pointerEnd = 0;

	while (pointerMin < pointerMid) {
		if (
			buffer1
				.slice(buffer1.length - pointerMid, buffer1.length - pointerEnd)
				.equals(
					buffer2.slice(
						buffer2.length - pointerMid,
						buffer2.length - pointerEnd,
					),
				)
		) {
			pointerMin = pointerMid;
			pointerEnd = pointerMin;
		} else {
			pointerMax = pointerMid;
		}
		pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
	}

	return pointerMid;
};

/**
 * This function reduces the diff generated by the diff algorithm based on unchanged bytes
 */
export const calculateDiff = (
	initial: Buffer,
	final: Buffer,
): HistoryType[] => {
	// When both the buffers are equal then return all '=' history
	if (initial.equals(final)) {
		return [['=', initial.length]];
	}
	const commonPrefix = diffCommonPrefix(initial, final);
	const commonSuffix = diffCommonSuffix(initial, final);

	const strippedPrefixInitial = initial.slice(commonPrefix, initial.length);
	const strippedPrefixFinal = final.slice(commonPrefix, final.length);

	const strippedInitial = strippedPrefixInitial.slice(
		0,
		strippedPrefixInitial.length - commonSuffix,
	);
	const strippedFinal = strippedPrefixFinal.slice(
		0,
		strippedPrefixFinal.length - commonSuffix,
	);
	const longDiff = diffAlgo(strippedInitial, strippedFinal);

	// Add common prefix to the reduced array in the start
	const reducedDiff = commonPrefix > 0 ? [['=', commonPrefix]] : [];
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
	// When commonSuffix or last counts are greater zero then combine them
	if (count > 0 || commonSuffix > 0) {
		reducedDiff.push(['=', count + commonSuffix]);
	}

	return reducedDiff as HistoryType[];
};

/**
 * This function takes the current buffer and uses diff to revert back to its original buffer
 */
export const undo = (finalBuffer: Buffer, diffArray: HistoryType[]): Buffer => {
	let finalBytes = Buffer.from(finalBuffer);
	let res = Buffer.from([]);

	for (const [op, diff] of diffArray.reverse()) {
		if (op === '=') {
			const unchangedBytes = finalBytes.slice(
				finalBytes.length - diff,
				finalBytes.length,
			);
			finalBytes = finalBytes.slice(0, finalBytes.length - diff);
			res = Buffer.concat([unchangedBytes, res]);
		} else if (op === '-') {
			res = Buffer.concat([Buffer.from([diff]), res]);
		} else if (op === '+') {
			finalBytes = finalBytes.slice(0, finalBytes.length - 1);
		} else {
			throw new Error('Diff contains unexpected symbol');
		}
	}

	return res;
};

/* tslint:disable:only-arrow-functions member-access readonly-keyword no-any */
/// <reference types="node" />

declare module 'browserify-bignum' {
	class BigNum {
		/**
		 * Create a new BigNum from a Buffer.
		 *
		 * The default options are: {endian: 'big', size: 1}.
		 */
		static fromBuffer(buffer: Buffer, options?: BigNum.BufferOptions): BigNum;

		/** Return true if num is identified as a BigNum instance. Otherwise, return false. */
		static isBigNum(num: any): boolean;

		/**
		 * Generate a probable prime of length bits.
		 *
		 * If safe is true, it will be a "safe" prime of the form p=2p'+1 where p' is also prime.
		 */
		static prime(bits: number, safe?: boolean): BigNum;

		/** Create a new BigNum from n. */
		constructor(n: number | BigNum);

		/** Create a new BigNum from n and a base. */
		constructor(n: string, base?: number);

		/** Return a new BigNum with the absolute value of the instance. */
		abs(): BigNum;

		/** Return a new BigNum containing the instance value plus n. */
		add(n: BigNum.BigNumCompatible): BigNum;

		/** Return the number of bits used to represent the current BigNum. */
		bitLength(): number;

		/**
		 * Compare the instance value to n.
		 *
		 * Return a positive integer if > n, a negative integer if < n, and 0 if == n.
		 */
		cmp(n: BigNum.BigNumCompatible): number;

		/** Return a new BigNum containing the instance value integrally divided by n. */
		div(n: BigNum.BigNumCompatible): BigNum;

		/** Return a boolean: whether the instance value is equal to n (== n). */
		eq(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is greater than or equal to n (>= n). */
		ge(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is greater than n (> n). */
		gt(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is greater than n (>= n). */
		gte(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is less than or equal to n (<= n). */
		le(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is less than n (< n). */
		lt(n: BigNum.BigNumCompatible): boolean;

		/** Return a boolean: whether the instance value is less than or equal to n (<= n). */
		lte(n: BigNum.BigNumCompatible): boolean;

		/** Return a new BigNum with the instance value modulo n. */
		mod(n: BigNum.BigNumCompatible): BigNum;

		/** Return a new BigNum containing the instance value multiplied by n. */
		mul(n: BigNum.BigNumCompatible): BigNum;

		/** Return a new BigNum with the negative of the instance value. */
		neg(): BigNum;

		/** Return a new BigNum containing the instance value plus n. */
		plus(n: BigNum.BigNumCompatible): BigNum;

		/** Return a new BigNum with the instance value raised to the nth power. */
		pow(n: BigNum.BigNumCompatible): BigNum;

		/** Return a new BigNum with the instance value raised to the nth power modulo m. */
		powm(n: BigNum.BigNumCompatible, m: BigNum.BigNumCompatible): BigNum;

		/** Return a new BigNum containing the instance value minus n. */
		sub(n: BigNum.BigNumCompatible): BigNum;

		/**
		 * Return a new Buffer with the data from the BigNum.
		 *
		 * The default options are: {endian: 'big', size: 1}.
		 */
		toBuffer(options?: BigNum.BufferOptions): Buffer;

		/**
		 * Turn a BigNum into a Number.
		 *
		 * If the BigNum is too big you'll lose precision or you'll get ±Infinity.
		 */
		toNumber(): number;

		/** Print out the BigNum instance in the requested base as a string. Default: base 10 */
		toString(base?: number): string;

		/** Print out the BigNum instance in the requested base as a string. Default: base 10 */
		toString(base?: number): string;
	}

	export = BigNum;

	namespace BigNum {
		/** Anything that can be converted to BigNum. */
		type BigNumCompatible = BigNum | number | string;

		export interface BufferOptions {
			/** Can be either 'big' or 'little'. Also accepts 1 for big and -1 for little. Doesn't matter when size = 1. */
			endian: string | number;

			/** Number of bytes per word, or 'auto' to flip entire Buffer. */
			size: number | string;
		}

		/**
		 * Turn a BigNum into a Number.
		 *
		 * If the BigNum is too big you'll lose precision or you'll get ±Infinity.
		 */
		export function toNumber(n: BigNumCompatible): number;

		/**
		 * Return a new Buffer with the data from the BigNum.
		 *
		 * The default options are: {endian: 'big', size: 1}.
		 */
		export function toBuffer(
			n: BigNumCompatible,
			options?: BufferOptions,
		): Buffer;

		/** Return a new BigNum containing the instance value plus n. */
		export function add(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum containing the instance value plus n. */
		export function plus(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum containing the instance value minus n. */
		export function sub(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum containing the instance value multiplied by n. */
		export function mul(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum containing the instance value integrally divided by n. */
		export function div(
			dividend: BigNumCompatible,
			divisor: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum with the absolute value of the instance. */
		export function abs(n: BigNumCompatible): BigNum;

		/** Return a new BigNum with the negative of the instance value. */
		export function neg(n: BigNumCompatible): BigNum;

		/**
		 * Compare the instance value to n.
		 *
		 * Return a positive integer if > n, a negative integer if < n, and 0 if == n.
		 */
		export function cmp(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): number;

		/** Return a boolean: whether the instance value is greater than n (> n). */
		export function gt(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is greater than or equal to n (>= n). */
		export function gte(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is greater than or equal to n (>= n). */
		export function ge(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is equal to n (== n). */
		export function eq(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is less than n (< n). */
		export function lt(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is less than or equal to n (<= n). */
		export function lte(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a boolean: whether the instance value is less than or equal to n (<= n). */
		export function le(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): boolean;

		/** Return a new BigNum with the instance value modulo n. */
		export function mod(
			left: BigNumCompatible,
			right: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum with the instance value raised to the nth power. */
		export function pow(
			base: BigNumCompatible,
			exponent: BigNumCompatible,
		): BigNum;

		/** Return a new BigNum with the instance value raised to the nth power modulo m. */
		export function powm(
			base: BigNumCompatible,
			exponent: BigNumCompatible,
			m: BigNumCompatible,
		): BigNum;

		/**
		 * If upperBound is supplied, return a random BigNum between the instance value and upperBound - 1, inclusive.
		 * Otherwise, return a random BigNum between 0 and the instance value - 1, inclusive.
		 */
		export function rand(
			n: BigNumCompatible,
			upperBound?: BigNumCompatible,
		): BigNum;

		/** Return the number of bits used to represent the current BigNum. */
		export function bitLength(n: BigNumCompatible): number;
	}
}

declare module 'sodium-native' {
	export const crypto_box_MACBYTES: number;
	export const crypto_sign_BYTES: number;
	export const crypto_sign_PUBLICKEYBYTES: number;
	export const crypto_sign_SECRETKEYBYTES: number;
	export function crypto_box_easy(
		cipher: Buffer,
		message: Buffer,
		nonce: Buffer,
		publicKey: Buffer,
		secretKey: Buffer,
	): void;
	export function crypto_box_open_easy(
		message: Buffer,
		cipherText: Buffer,
		nonce: Buffer,
		publicKey: Buffer,
		secretKey: Buffer,
	): boolean;
	export function crypto_sign_detached(signature: Buffer, message: Buffer, secretKey: Buffer): void;
	export function crypto_sign_verify_detached(
		signature: Buffer,
		message: Buffer,
		publicKey: Buffer,
	): boolean;
	export function randombytes_buf(buffer: Buffer): void;
	export function crypto_sign_ed25519_sk_to_pk(publicKey: Buffer, privateKey: Buffer): void;
	export function crypto_sign_seed_keypair(
		publicKey: Buffer,
		privateKey: Buffer,
		hashSeed: Buffer,
	): void;
}

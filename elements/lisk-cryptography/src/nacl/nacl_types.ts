import { KeypairBytes } from '../keys';

export interface NaclInterface {
	box(
		messageInBytes: Buffer,
		nonceInBytes: Buffer,
		convertedPublicKey: Buffer,
		convertedPrivateKey: Buffer,
	): Buffer;
	getKeyPair(hashedSeed: Buffer): KeypairBytes;
	getPublicKey(privateKey: Buffer): Buffer;
	getRandomBytes(length: number): Buffer;
	openBox(
		cipherBytes: Buffer,
		nonceBytes: Buffer,
		convertedPublicKey: Buffer,
		convertedPrivateKey: Buffer,
	): Buffer;
	signDetached(messageBytes: Buffer, privateKeyBytes: Buffer): Buffer;
	verifyDetached(
		messageBytes: Buffer,
		signatureBytes: Buffer,
		publicKeyBytes: Buffer,
	): boolean;
}

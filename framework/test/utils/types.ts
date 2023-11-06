export type Mocked<Type extends Pick<Type, Methods>, Methods extends keyof Type> = Pick<
	{ [Key in keyof Type]: jest.Mock<ReturnType<Type[Key]>> },
	Methods
>;

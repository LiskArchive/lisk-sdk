/* tslint:disable:callable-types no-any no-method-signature readonly-keyword no-mixed-interface */
declare module 'chai' {
	global {
		export namespace Chai {
			interface ChaiStatic {
				_obj: any;
				Assertion: {
					new (value: any): Assertion;
					addProperty(name: string, handler: () => void): void;
					addMethod(name: string, handler: (val: any) => void): void;
				};
			}
			interface Assert {
				(expression: any, message?: string, messageNegative?: string): void;
			}
			export interface TypeComparison {
				hexString: Assertion;
				integer: Assertion;
				customError: (obj?: Error | typeof Error | string) => Assertion;
				matchAny: Assertion;
			}
		}
	}
}

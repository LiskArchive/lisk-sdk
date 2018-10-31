/* tslint:disable:callable-types no-any no-method-signature readonly-keyword */
declare module 'chai' {
	global {
		export namespace Chai {
			interface ChaiStatic {
				_obj: any;
				Assertion: {
					new (value: any): Assertion;
					addProperty(name: string, handler: () => void): void;
				};
			}
			interface Assert {
				(expression: any, message?: string, messageNegative?: string): void;
			}
			export interface TypeComparison {
				hexString: Assertion;
				integer: Assertion;
			}
		}

		export namespace NodeJS {
			interface Global {
				sandbox: object;
			}
		}
	}
}

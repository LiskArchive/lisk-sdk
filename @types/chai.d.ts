declare module 'chai' {
	global {
		export namespace Chai {
			interface ChaiStatic {
				Assertion: {
					new (value: any): Assertion;
					addProperty(name: string, handler: Function): void;
				};
				_obj: any;
			}
			interface Assert {
				(expression: any, message?: string, messageNegative?: string): void;
			}
			export interface TypeComparison {
				integer: Assertion;
				hexString: Assertion;
			}
		}
	}
}

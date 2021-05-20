import { <%= assetClass %> } from '../../../../../src/app/modules/<%= moduleName %>/assets/<%= assetFileName %>';

describe('<%= assetClass %>', () => {
  let transactionAsset: <%= assetClass %>;

	beforeEach(() => {
		transactionAsset = new <%= assetClass %>();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(<%= assetID %>);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('<%= assetName %>');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('validate', () => {
		describe('schema validation', () => {
      it.todo('should throw errors for invalid schema');
      it.todo('should be ok for valid schema');
    });
	});

	describe('apply', () => {
    describe('valid cases', () => {
      it.todo('should update the state store');
    });

    describe('invalid cases', () => {
      it.todo('should throw error');
    });
	});
});

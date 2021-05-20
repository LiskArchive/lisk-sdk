import { BaseAsset, ApplyAssetContext, ValidateAssetContext } from 'lisk-sdk';

export class <%= assetClass %> extends BaseAsset {
	public name = '<%= assetName%>';
  public id = <%= assetID%>;

  // Define schema for asset
	public schema = {
    $id: '<%= moduleName %>/<%= assetName %>-asset',
		title: '<%= assetClass %> transaction asset for <%= moduleName %> module',
		type: 'object',
		required: [],
		properties: {},
  };

  public validate({ asset }: ValidateAssetContext<{}>): void {
    // Validate your asset
  }

	// eslint-disable-next-line @typescript-eslint/require-await
  public async apply({ asset, transaction, stateStore }: ApplyAssetContext<{}>): Promise<void> {
		throw new Error('Asset "<%= assetName %>" apply hook is not implemented.');
	}
}

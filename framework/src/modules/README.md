# Modules

### Table of contents

- [Description](#description)
- [Custom Modules](#custom-modules)
- [Custom Assets](#custom-assets)

## Description

Modules are logic which define state changes that are executed on-chain, meaning that it will be a part of the blockchain protocol.

### Custom Modules

> The implementation of each module is up to the user, but it must inherit from the `BaseModule` class and implement its methods.

Custom Modules can be plugged into the Lisk Framework and implement a new protocol for the application.

```js
// Exported as main file to javascript package
export class MyModule extends BaseModule {
    /**
     * ID of this module, which must be greater than 1000 for non-default modules and unique across the application.
     * This property is used for routing transaction asset and account schema field number.
     */
    public abstract id: Buffer;

    /**
     * Name of this module.
     * This property is used for the namespace of account property defined in this module.
     */
    public abstract name: string;

    // Optional
    /**
     * Reducers are functions that can be called during block processing from other modules.
     */
    public reducers: Reducers = {};

    /**
     * Actions are functions registered to the framework and will be callable from the plugins.
     */
    public actions: Actions = {};

    /**
     * Events are functions registered to the framework and will be subscribable from the plugins.
     */
    public events: string[] = [];

    /**
     * Account schema is a definition of account data properties and types, that is intended to
     * be used within the scope of the module. This information is stored in a blockchain database.
     */
    public accountSchema?: AccountSchema;

    /**
     * Transaction assets are a set of instantiated custom assets described below.
     */
    public transactionAssets: BaseAsset[] = [];

    /**
     * beforeTransactionApply is a function which is called for all the transactions before applying
     * asset whether it is registered to the particular module or not.
     */
    public async beforeTransactionApply?(context: TransactionApplyContext): Promise<void>;

    /**
     * afterTransactionApply is a function which is called for all the transactions after applying asset
     * whether it is registered to the particular module or not.
     */
    public async afterTransactionApply?(context: TransactionApplyContext): Promise<void>;

    /**
     * afterGenesisBlockApply is a function which is called once when starting a blockchain.
     */
    public async afterGenesisBlockApply?(context: AfterGenesisBlockApplyContext): Promise<void>;

    /**
     * beforeBlockApply is a function which is called once per module before starting the state changes
     * on each block processing.
     */
    public async beforeBlockApply?(context: BeforeBlockApplyContext): Promise<void>;

    /**
     * afterBlockApply is a function which is called once per module after all the state changes
     * on each block processing.
     */
	public async afterBlockApply?(context: AfterBlockApplyContext): Promise<void>;
}
```

### Custom Assets

Custom Asset must be instantiated and added to `transactionAssets` property of a Custom Module.

```js
// Exported as main file to javascript package
export class MyAsset extends BaseAsset<T = unknown> {
    /**
     * ID of this asset, which must be unique within a registering module.
     * This property is used for routing transaction asset.
     */
    public abstract id: Buffer;

    /**
     * Name of this asset.
     */
    public abstract name: string;

    /**
     * Schema is a definition of transaction asset data.
     * This information is stored in a blockchain database as part of a transaction.
     */
	public abstract schema: Schema;

    /**
     * Apply is a function which is called for a transaction which contains this asset.
     * It should implement any state change introduced by this asset.
     */
    public abstract async apply(context: ApplyAssetContext<T>): Promise<void>;

    // Optional
    /**
     * Validate is a function which is called for a transaction which contains this asset.
     * It should implement additional conditions which cannot be represented by the schema.
     */
	public validate?(context: ValidateAssetContext<T>): void;

}
```

# Getting Started with Lisk Blockchain Client

This project was bootstrapped with [Lisk SDK](https://github.com/LiskHQ/lisk-sdk)

### Start a node
```
./bin/run start
```

### Add a new module
```
lisk generate:module ModuleName ModuleID
// Example
lisk generate:module token 1
```

### Add a new asset
```
lisk generate:asset ModuleName AssetName AssetID
// Example
lisk generate:asset token transfer 1
```

### Add a new plugin
```
lisk generate:plugin PluginAlias
// Example
lisk generate:plugin httpAPI
```

## Learn More

You can learn more in the [documentation](https://lisk.io/documentation/lisk-sdk/index.html).

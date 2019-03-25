# Components

## Description

Components are shared objects within the [controller](../controller/README.md) layer which any [module](../modules/README.md) can utilize.
Components can use [channels](../modules/README.md#module-communication) if required for implementation behavior.
The following components are available currently.

### Cache

This component provides basic caching capabilities, generic enough for any module to use if required.

### Logger

Logger is responsible for all application-level logging activity.
The logger component can be passed to any module, where it can be extended by adding module-specific behaviour.

### Storage

The storage component is responsible for all database activity in the system.
It exposes an interface with specific features for getting or setting particular database entities and a raw handler to the database object so that any module can extend it for its own use.

Find more details about the storage component in the dedicated [LIP](https://github.com/LiskHQ/lips/blob/master/proposals/lip-0011.md).

### System

This component provides a central registry of up-to-date system information.
Especially network height, nonce, broadhash, nethash, and network specific constants.
This component will use channels and events to make all instances of the component stay in sync in different modules.

# Components

## Description

Components are shared objects within the [controller](../controller/README.md) layer which any [module](../modules/README.md) can utilize.
Components can use [channels](../modules/README.md#module-communication) if required for implementation behavior.
The following components are available currently.

### Cache

This component provides basic caching capabilities, generic enough for any module to use if required.

### Logger

Logger is responsible for all application-level logging activity and logs everything in JSON format.
This central logger component can be passed to any module, where it can be extended by adding module-specific fields.

### Storage

This component is responsible for all database activity in the system.
The database component exposes an interface with specific features for getting or setting particular database entities.
It will also expose a raw handler to the database object so that any module can extend it for its own use.

### System

This component provides a central registry of up-to-date system information.
Especially network height, nonce, broadhash, nethash, and network specific constants.
This component will use channels and events to make all instances of the component stay in sync in different modules.

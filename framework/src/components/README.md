# Components

## Description

Components are shared objects within the [controller](../controller/README.md) layer which any [module](../modules/README.md) can utilize.
Components can use [channels](../modules/README.md#module-communication) if required for implementation behavior.
The following components are available currently.

### Logger

Logger is responsible for all application-level logging activity.
The logger component can be passed to any module, where it can be extended by adding module-specific behavior.

## Configuration

Configuration options for each component are located in `framework/src/component/<component-name>/defaults/config.js`.

Each `config.js` file consists of 2 parts:

1. JSON-schema specification for all available config options.
2. Default values for the available config options for this specific component.

Please don't change the default values in these files directly as they will be overwritten on software updates, instead define the custom configuration options inside your blockchain application.

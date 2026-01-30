# Simple State Model v1.0.0

A synced state model with support for real-time mutations, provisional updates, and authoritative modes.

## Features

- **Dual Operation Modes**: Traditional provisional mutations or authoritative mode
- **Real-time Synchronization**: Subscribe to external stores (GraphQL, LocalStorage, etc.)
- **RFC6902 JSON Patch**: Standard patch operations for state mutations
- **Configurable Logging**: Replace console.log with your preferred logger
- **Event-Driven Architecture**: Listen to state changes, patches, and status updates
- **Dependency Management**: Automatic rejection cascading for dependent mutations
- **Authoritative Source Support**: Handle patches from authoritative sources in any mode

## Installation

```bash
npm install simple-state-model
```

## Quick Start

```javascript
import { ConfigModel, InMemoryKeyedConfigProvider } from "simple-state-model";
import SimpleLogger from "simple-utility-logger";

const logger = new SimpleLogger();

const model = new ConfigModel({
    providers: {
        repository: new InMemoryKeyedConfigProvider({
            logger: logger
        })
    }
});

(async () => {
    const config = await model.load("repository", "config-test");

    config.on('value', (newValue) => {
        console.log("Config value changed:", newValue);
    });

    config.value = {"key": "value"};
})();
```

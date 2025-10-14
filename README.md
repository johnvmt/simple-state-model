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
import StatesModel from 'simple-state-model';

// Create a states model
const statesModel = new StatesModel({
    logger: console, // or your custom logger
    authoritative: false // traditional mode with provisional mutations
});

// Get or create a state
const userState = statesModel.get('user-123');

// Listen for changes
userState.on('value', (value) => {
    console.log('User data changed:', value);
});

// Apply a patch
const patch = [
    { op: 'add', path: '/name', value: 'John Doe' },
    { op: 'add', path: '/email', value: 'john@example.com' }
];

const mutation = userState.patch(patch);
```

## Direct StateType Usage

You can also use StateType directly without StatesModel for more control or simpler use cases:

```javascript
import { StateType, LocalSessionStorageStore } from 'simple-state-model';

// Create a state directly
const userState = new StateType({
    id: 'user-123',
    logger: console,
    authoritative: true, // immediate accept/reject mode
    value: { name: '', email: '' } // initial value
});

// Listen for changes
userState.on('value', (newValue) => {
    console.log('User value changed:', newValue);
});

userState.on('status', (status) => {
    console.log('State status:', status); // OK, LOADING, ERROR
});

// Apply patches directly
const mutation = userState.patch([
    { op: 'replace', path: '/name', value: 'Alice Smith' },
    { op: 'add', path: '/age', value: 30 }
]);

console.log('Current value:', userState.value);
// Output: { name: 'Alice Smith', email: '', age: 30 }

// With external store
const store = new LocalSessionStorageStore({
    storage: localStorage,
    prefix: 'myapp:'
});

const syncedState = new StateType({
    id: 'profile-data',
    store: store,
    logger: console,
    authoritative: false // use provisional mutations with store
});

// This state will automatically sync with localStorage
syncedState.on('patch', (patch, options) => {
    if (options.source === 'store') {
        console.log('Received update from storage:', patch);
    } else {
        console.log('Local patch applied:', patch);
    }
});
```

## Operation Modes

### Traditional Mode (Default)

In traditional mode, mutations are applied provisionally and can be accepted or rejected later:

```javascript
const statesModel = new StatesModel({
    authoritative: false // default
});

const state = statesModel.get('example');

// Apply provisional patch
const mutation = state.patch([
    { op: 'add', path: '/status', value: 'pending' }
]);

// Later, accept or reject the mutation
mutation.accept(); // or mutation.reject()
```

### Authoritative Mode

In authoritative mode, mutations are immediately accepted if they apply successfully, or rejected if they fail:

```javascript
const statesModel = new StatesModel({
    authoritative: true
});

const state = statesModel.get('example');

// Patch is immediately accepted or rejected
try {
    const mutation = state.patch([
        { op: 'add', path: '/user/name', value: 'Alice' }
    ]);
    // Mutation is automatically accepted if patch applies successfully
} catch (error) {
    // Mutation was automatically rejected due to patch failure
    console.error('Patch failed:', error.message);
}
```

## Authoritative Source Patches

Handle patches from authoritative sources even when not running in authoritative mode:

```javascript
const state = new StateType({
    id: 'user-data',
    authoritative: false // This state is NOT authoritative
});

// Apply patch with authoritative flag - immediately accepted
const mutation = state.patch(serverPatch, {
    authoritative: true,
    source: 'server',
    tag: 'server-update-123'
});

// The mutation will be immediately accepted regardless of state mode
```

## API Reference

### StatesModel

#### Constructor
```javascript
new StatesModel(options)
```

Options:
- `logger`: Custom logger object (default: `console`)
- `authoritative`: Enable authoritative mode (default: `false`)
- `store`: External store for synchronization (optional)

#### Methods
- `get(id)`: Get or create a state by ID
- `has(id)`: Check if a state exists
- `remove(id)`: Remove a state by ID
- `getStateIds()`: Get all state IDs
- `clear()`: Remove all states

### StateType

#### Properties
- `id`: State identifier
- `data`: StateDataType instance
- `value`: Current state value
- `status`: Current status (OK, LOADING, ERROR)
- `isAuthoritative`: Whether in authoritative mode

#### Methods
- `patch(patch, options)`: Apply a JSON patch (use `authoritative: true` for immediate acceptance)
- `reset(options)`: Reset state to initial value
- `setData(data, options)`: Set state data
- `setStatus(status, options)`: Set state status
- `destroy()`: Clean up resources

#### Events
- `value`: Emitted when value changes
- `data`: Emitted when data changes
- `status`: Emitted when status changes
- `patch`: Emitted when patch is applied

### StateMutationType

#### Properties
- `status`: Mutation status (IDLE, PROVISIONAL, ACCEPTED, REJECTED)
- `tag`: Unique mutation identifier
- `source`: Source identifier
- `error`: Rejection error (if any)
- `closed`: Whether mutation is finalized
- `authoritative`: Whether this specific patch is authoritative

#### Methods
- `accept()`: Accept the mutation
- `reject(options)`: Reject the mutation
- `addDependentMutation(mutation)`: Add dependent mutation

#### Events
- `status`: Emitted when status changes
- `close`: Emitted when mutation is finalized

## Migration from v0.x

The v1.0.0 release includes breaking changes:

1. **Logger Integration**: Replace `console.log` calls with configurable logger
2. **Authoritative Mode**: New operation mode for immediate accept/reject
3. **Authoritative Source Support**: Handle patches from authoritative sources
4. **Enhanced Error Handling**: Better error propagation and handling
5. **Improved Events**: More detailed event data and options

### Migration Steps

1. Update logger configuration:
```javascript
// Old
const statesModel = new StatesModel();

// New
const statesModel = new StatesModel({
    logger: myCustomLogger
});
```

2. Consider authoritative mode for simpler use cases:
```javascript
const statesModel = new StatesModel({
    authoritative: true // No provisional mutations
});
```

3. Use authoritative source patches for server updates:
```javascript
// Handle server patches that should be immediately accepted
state.patch(serverPatch, {
    authoritative: true,
    source: 'server'
});
```

4. Update event handlers to use new event data structure

## Use Cases

### Master-Slave Architecture
```javascript
// Slave node - not authoritative, but accepts master patches
const slaveState = new StateType({
    authoritative: false,
    logger: logger
});

// When receiving patch from master
slaveState.patch(masterPatch, {
    authoritative: true,
    source: 'master',
    tag: masterTag
});
```

### Client-Server Sync
```javascript
// Client state - provisional mutations, but accepts server authority
const clientState = new StateType({
    authoritative: false,
    store: serverStore
});

// Local user changes (provisional)
clientState.patch(userEdit);

// Server updates (authoritative)
clientState.patch(serverUpdate, {
    authoritative: true
});
```

## Error Handling

Handle errors gracefully:

```javascript
const state = statesModel.get('error-example');

try {
    // This might fail if the path doesn't exist
    const mutation = state.patch([
        { op: 'replace', path: '/nonexistent/path', value: 'new value' }
    ]);
} catch (error) {
    console.error('Patch failed:', error.message);
    
    if (error.mutated) {
        console.log('State was partially modified');
    }
}

// Listen for state errors
state.on('status', (status) => {
    if (status === 'ERROR') {
        console.error('State entered error state');
    }
});
```

## Handling Conflicts and Rejections

The state model provides several ways patches can be rejected due to conflicts:

### Version Conflicts with Test Operations

Use `test` operations to ensure data hasn't changed before applying updates:

```javascript
const documentState = new StateType({
    id: 'document',
    authoritative: true,
    value: { 
        version: 1,
        content: 'Original content',
        lastModified: '2025-01-01'
    }
});

// This patch will succeed
const validUpdate = documentState.patch([
    { op: 'test', path: '/version', value: 1 }, // Verify version is still 1
    { op: 'replace', path: '/content', value: 'Updated content' },
    { op: 'replace', path: '/version', value: 2 }
]);

// This patch will fail due to version conflict
try {
    const conflictUpdate = documentState.patch([
        { op: 'test', path: '/version', value: 1 }, // Will fail - version is now 2
        { op: 'replace', path: '/content', value: 'Conflicting update' }
    ]);
} catch (error) {
    console.log('Version conflict detected:', error.message);
    // State remains unchanged
}
```

### Path Validation Failures

Patches fail when targeting non-existent paths:

```javascript
const userState = new StateType({
    id: 'user',
    authoritative: true,
    value: { name: 'Alice', email: 'alice@example.com' }
});

try {
    // This will fail - nested path doesn't exist
    const invalidPatch = userState.patch([
        { op: 'replace', path: '/profile/avatar', value: 'new-avatar.jpg' }
    ]);
} catch (error) {
    console.log('Path not found:', error.message);
}

// Create the path first, then update
userState.patch([
    { op: 'add', path: '/profile', value: {} },
    { op: 'add', path: '/profile/avatar', value: 'avatar.jpg' }
]);
```

### Conditional Updates with Multiple Tests

Ensure multiple conditions are met before applying changes:

```javascript
const orderState = new StateType({
    id: 'order',
    authoritative: true,
    value: {
        id: 'order-123',
        status: 'pending',
        total: 100.00,
        items: ['item1', 'item2']
    }
});

// Only process if order is pending and total matches
try {
    const processOrder = orderState.patch([
        { op: 'test', path: '/status', value: 'pending' },
        { op: 'test', path: '/total', value: 100.00 },
        { op: 'replace', path: '/status', value: 'processing' },
        { op: 'add', path: '/processedAt', value: new Date().toISOString() }
    ]);
    console.log('Order processed successfully');
} catch (error) {
    console.log('Cannot process order:', error.message);
}
```

### Handling Rejections in Non-Authoritative Mode

In traditional mode, you can handle rejections through events:

```javascript
const collaborativeState = new StateType({
    id: 'collaborative-doc',
    authoritative: false // traditional provisional mode
});

// Apply a provisional patch
const mutation = collaborativeState.patch([
    { op: 'replace', path: '/content', value: 'My changes' }
]);

// Listen for acceptance or rejection
mutation.on('close', (status, options) => {
    if (status === 'ACCEPTED') {
        console.log('Changes accepted by server');
    } else if (status === 'REJECTED') {
        console.log('Changes rejected:', options.error?.message);
        // Handle conflict resolution here
        handleConflict(options.error);
    }
});

function handleConflict(error) {
    // Implement conflict resolution strategy
    console.log('Implementing conflict resolution...');
    
    // Option 1: Retry with updated data
    // Option 2: Merge changes
    // Option 3: Prompt user for resolution
}
```

### Server Conflict Resolution

Handle server-side rejections of authoritative patches:

```javascript
const clientState = new StateType({
    id: 'shared-data',
    authoritative: false,
    store: serverStore
});

// Local provisional change
clientState.patch([
    { op: 'replace', path: '/field', value: 'local change' }
]);

// Server sends conflicting authoritative update
try {
    clientState.patch(serverUpdate, {
        authoritative: true, // This will override local changes
        source: 'server'
    });
} catch (error) {
    // Even authoritative patches can fail if they're invalid
    console.log('Server patch failed:', error.message);
}
```

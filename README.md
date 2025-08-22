# Anypoint MCP

Model Context Protocol (MCP) server implementation for MuleSoft Anypoint Platform

## Description

Anypoint MCP is a Model Context Protocol (MCP) server for integrating with MuleSoft Anypoint Platform. It provides access to Anypoint Platform resources such as environments, deployments, and logs, enabling direct MuleSoft application operations and monitoring through AI assistants like ChatGPT and Claude.

## Features

- **Environment Listing**: Retrieve detailed information of all environments (Design, Sandbox, Production) within Anypoint Platform
- **Deployment Monitoring**: Check application deployment status across environments
- **Log Search**: Advanced search and filtering capabilities for application logs
- **Intelligent Caching**: TTL-based cache mechanism for efficient API access
- **Resource Auto-completion**: Auto-completion for environment and deployment names

## Comparison with Traditional Methods

Compared to traditional MuleSoft operation methods, Anypoint MCP offers the following advantages:

- **Runtime Manager UI**: Requires manual GUI operations, difficult to automate
- **Anypoint CLI**: Limited to command-line operations, difficult to integrate with AI
- **Direct API calls**: Requires authentication and complex query construction

## Requirements

- Node.js 18 or higher
- MuleSoft Anypoint Platform account
- Connected App configuration (Client Credentials Grant)

## Usage

### Basic Setup

Set environment variables:

```bash
export ANYPOINT_CLIENT_ID="your-client-id"
export ANYPOINT_CLIENT_SECRET="your-client-secret"  
export ANYPOINT_ORGANIZATION_ID="your-organization-id"
```

### Starting MCP Server

**Recommended method**:

```bash
npx -y github:sato-hxx/anypoint-mcp
```

**Development environment**:

```bash
# When cloning repository for development
npm start
```

### MCP Configuration for Cursor

To use with Cursor, add the following configuration to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "anypoint": {
      "command": "npx",
      "args": ["-y", "github:sato-hxx/anypoint-mcp"],
      "env": {
        "ANYPOINT_CLIENT_ID": "your-client-id",
        "ANYPOINT_CLIENT_SECRET": "your-client-secret",
        "ANYPOINT_ORGANIZATION_ID": "your-organization-id"
      }
    }
  }
}
```

After configuration, restart Cursor to access MuleSoft resources from the chat interface.

### Resource Access

**Get Environment List**:

```
anypoint://accounts/api/organizations/YOUR_ORG_ID/environments
```

**Get Deployment List**:

```
anypoint://amc/application-manager/api/v2/organizations/YOUR_ORG_ID/environments/production/deployments
```

**Get Deployment Specifications**:

```
anypoint://amc/application-manager/api/v2/organizations/YOUR_ORG_ID/environments/production/deployments/my-app/specs
```

### Using Log Search Tool

```typescript
// Log search example
{
  "environmentName": "production",
  "deploymentName": "my-mule-app", 
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "logLevel": ["ERROR", "WARN"],
  "regexp": "Exception|Error"
}
```

## Installation

### Easiest Method (Recommended)

No installation required, run directly:

```bash
npx -y github:sato-hxx/anypoint-mcp
```

### Build from Source

```bash
git clone https://github.com/sato-hxx/anypoint-mcp.git
cd anypoint-mcp
npm install
npm run build
```

### Connected App Configuration

1. Anypoint Platform > Access Management > Connected Apps
2. Create a new Connected App
3. Grant Type: Client Credentials
4. Set required scopes:
   - Runtime Manager: Read Applications
   - Runtime Manager: Read Runtime Fabrics
   - Accounts: Read Environments

## Configuration

### Environment Variables

The following environment variables can be used to configure the MCP server:

#### Required Settings
```bash
# MuleSoft Anypoint Platform credentials (Required)
ANYPOINT_CLIENT_ID=your-client-id-uuid-here
ANYPOINT_CLIENT_SECRET=your-client-secret-here
ANYPOINT_ORGANIZATION_ID=your-organization-id-uuid-here
```

#### Optional Settings
```bash
# Cache configuration
ANYPOINT_ENABLE_CACHE=true  # Enable/disable caching (default: true)
ANYPOINT_CACHE_MAX_SIZE=52428800  # Max cache size in bytes (default: 50MB)
ANYPOINT_CACHE_MAX_ENTRIES=1000  # Max number of cache entries (default: 1000)
ANYPOINT_CACHE_CLEANUP_INTERVAL=300000  # Cleanup interval in ms (default: 5 minutes)
ANYPOINT_CACHE_DEFAULT_TTL=60000  # Default TTL in ms (default: 1 minute)
ANYPOINT_CACHE_RESOURCE_TTL="/accounts/api/organizations/*/environments:3600000,/amc/application-manager/api/v2/organizations/*/environments/*/deployments/*/specs/*/logs:0"  # Resource-specific TTL settings

# API configuration
ANYPOINT_API_BASE_URL=https://anypoint.mulesoft.com  # API base URL
ANYPOINT_API_TIMEOUT=30000  # Request timeout in ms (default: 30 seconds)
ANYPOINT_API_RETRY_ATTEMPTS=3  # Number of retry attempts (default: 3)

# Logging configuration
ANYPOINT_LOG_LEVEL=info  # Log level: debug, info, warn, error (default: info)
```

### Configuration Validation

The server performs comprehensive validation of all configuration values:
- **UUID Format**: Client ID and Organization ID must be valid UUIDs
- **Security**: Client Secret must be at least 10 characters
- **Numeric Ranges**: Cache sizes, timeouts, and retry attempts are validated
- **URL Format**: API base URL must be a valid URL
- **Resource TTL Format**: Must follow 'path:milliseconds,path:milliseconds' pattern with positive values

#### Resource TTL Configuration

The `ANYPOINT_CACHE_RESOURCE_TTL` setting allows fine-grained control over cache TTL for specific API paths:

```bash
# Format: "path1:ttl1,path2:ttl2"
# Example: Cache environments for 1 hour, logs for 0 seconds (No Cache)
ANYPOINT_CACHE_RESOURCE_TTL="/accounts/api/organizations/*/environments:3600000,/amc/application-manager/api/v2/organizations/*/environments/*/deployments/*/specs/*/logs:0"
```

**Default Resource TTL Settings:**
- Environments: 3600000ms (1 hour) - Low change frequency
- Logs: 0ms (No cache) - High update frequency

Invalid configurations will cause the server to exit with detailed error messages.

## Contribution

1. Fork ([https://github.com/sato-hxx/anypoint-mcp/fork](https://github.com/sato-hxx/anypoint-mcp/fork))
2. Create a feature branch
3. Commit your changes
4. Rebase your local changes against the main branch
5. Run test suite with the `npm test` command and confirm that it passes
6. Run `npm run build` to verify TypeScript compilation
7. Create new Pull Request

## Licence

[MIT](https://github.com/sato-hxx/anypoint-mcp/blob/main/LICENSE)

## Author

[sato-hxx](https://github.com/sato-hxx)
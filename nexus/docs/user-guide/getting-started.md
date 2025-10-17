# Getting Started with Nexus

Nexus is your unified infrastructure command center for managing Kubernetes clusters and platform deployments.

## Prerequisites

- Node.js 18 or higher
- Git
- Access to target Kubernetes clusters
- GitHub account for authentication

## Installation

### Option 1: NPM Installation
```bash
npm install -g @proficientnowtech/nexus
nexus --help
```

### Option 2: Binary Download
Download the latest release from GitHub:
```bash
# Download for your platform
curl -L https://github.com/proficientnowtech/nexus/releases/latest/download/nexus-linux -o nexus
chmod +x nexus
./nexus --help
```

### Option 3: Development Build
```bash
git clone https://github.com/proficientnowtech/nexus.git
cd nexus
npm install
npm run build
npm start
```

## First Run

1. **Authentication**: Nexus will prompt you to authenticate with GitHub
2. **Configuration**: Set up your infrastructure configuration
3. **Repository**: Clone or specify your infrastructure repository
4. **Validation**: Run initial platform validation

## Basic Usage

### Interactive Mode
```bash
nexus
```
Launches the full TUI interface with step-by-step guidance.

### Non-Interactive Mode
```bash
nexus deploy --environment production
nexus validate --cluster my-cluster
nexus status --all
```

## Next Steps

- [Configuration Guide](configuration.md)
- [Authentication Setup](authentication.md)
- [Platform Management](platform-management.md)
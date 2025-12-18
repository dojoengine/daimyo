# Blockchain Roles

Discord roles based on Starknet state.

## Overview

Users can link their Cartridge Controller wallets to Discord accounts, enabling automatic role assignment based on on-chain state such as NFT ownership, token holdings, or smart contract interactions.

## Goals

1. **Blockchain Integration**: Bridge Discord identity with Starknet addresses
2. **Automated Role Assignment**: Grant roles based on verifiable on-chain criteria
3. **Secure Verification**: Ensure users can only link wallets they control
4. **Flexible Criteria**: Support multiple types of blockchain-based requirements

## Architecture

### System Overview

**Backend** - Single Node.js process running:
- **Discord.js Client**: Handles Discord commands and events via WebSocket/REST to Discord
- **Express HTTP API**: REST endpoints for wallet verification
- **Starknet.js Client**: Queries blockchain state via RPC

**Frontend** - Vite + React SPA:
- Deployed to Vercel CDN from `./client` directory
- Integrates Cartridge Controller SDK
- Makes API calls to backend

**Key Point**: Discord.js does NOT provide HTTP endpoints.
We add Express alongside Discord.js in the same process.
Frontend and backend are deployed separately but communicate via REST API.

### Components Detail

**Discord Bot**: Slash commands for `/connect-wallet`, `/check-wallet`, etc.

**HTTP API**: Express server with REST endpoints:
- `POST /api/verify` - accepts signature and stores wallet link
- `GET /api/status` - check if wallet is linked

**Frontend SPA** (Vite + React):
- Deployed at `https://link.daimyo.cartridge.gg`
- Route: `/auth?code={code}&discord_id={user_id}`
- Uses Cartridge Controller SDK to connect wallet and request signature

**Starknet Client**: Queries on-chain state for role criteria

### Authentication Flow

**User Links Wallet to Discord**:

1. User runs `/connect-wallet` command in Discord
2. Bot generates unique verification code and provides link: `https://link.daimyo.cartridge.gg/auth?code={code}&discord_id={user_id}`
3. User opens link in browser (Vercel-hosted React app)
4. Frontend extracts params from URL and prompts user to connect Cartridge Controller wallet
5. User signs message: `"Link wallet to Discord user {discord_id}. Verification code: {code}"`
6. Frontend POSTs signature to backend API: `POST /api/verify { code, discord_id, address, signature }`
7. Backend verifies signature matches provided Starknet address and stores mapping
8. Backend sends confirmation DM to user via Discord

**Security Considerations**:
- Verification codes expire after 15 minutes
- Each code can only be used once
- Signature verification ensures wallet ownership
- Users can unlink and relink wallets anytime

## Role Assignment

User runs `/check-wallet` command.
Bot queries Starknet immediately and assigns/removes roles instantaneously.

### Criteria Types

**NFT Ownership**:
Check if user owns NFTs from specific contract addresses.

**Token Holdings**:
Check if user holds minimum amount of specific tokens.

**Contract Interactions**:
Check if user has interacted with specific contracts (e.g., deployed on Dojo).

**Future**: Combination rules (e.g., reputation + NFT = special role)

## Database Schema

### Controllers Table
```
controllers {
    discord_id: string (primary key)
    starknet_address: string (unique)
    signature: string
    verified_at: timestamp
    verification_code: string
    verification_expiry: timestamp
}
```

## Commands

### User Commands

#### `/connect-wallet`
Generate verification link for linking Cartridge Controller wallet.
Returns unique URL for authentication.
Expires after 15 minutes.

#### `/disconnect-wallet`
Unlink currently connected wallet.
Removes all blockchain-based roles.
Requires confirmation.

#### `/check-wallet`
Manually trigger blockchain role check.
Invalidates cache and queries current on-chain state.
Updates roles immediately.

## Technical Stack

**Backend** (single Node.js process):
- **Discord.js v14** - Discord bot client
- **Express** - REST API server
- **starknet.js** - Starknet RPC client
- **better-sqlite3** - Database (shared with reputation system)

**Frontend** (Vite + React):
- **React 18** - UI framework
- **Vite** - build tool and dev server
- **Cartridge Controller SDK** - wallet connection and signing
- Deployed to Vercel from `./client` directory

**Infrastructure**:
- **RPC Provider**: Cartridge RPC node
- **Frontend Hosting**: Vercel CDN
- **Backend Hosting**: VPS or cloud provider with HTTPS

## Configuration

**Backend** environment variables:
```
# Starknet
STARKNET_RPC_URL=https://api.cartridge.gg/rpc/starknet/mainnet
STARKNET_NETWORK=mainnet

# HTTP Server
HTTP_PORT=3000
CORS_ORIGIN=https://daimyo.cartridge.gg

# Verification
VERIFICATION_CODE_EXPIRY_MINUTES=15
```

## Security Considerations

**Signature Verification**:
All wallet links require cryptographic proof of ownership via signed message.

**Code Expiry**:
Verification codes expire after 15 minutes to prevent replay attacks.

**One-to-One Mapping**:
Each Discord account can link one wallet.
Each wallet can link to one Discord account.

## Deployment

**Backend**:
Discord bot and HTTP API run in the same Node.js process.
Both services share state and database connection.
Deploy to VPS or cloud provider with HTTPS (e.g., daimyo.cartridge.gg).
SSL certificate needed for secure API communication.

**Frontend**:
Vite + React SPA deployed to Vercel from `./client` directory.
Automatic deployment on git push.
Served at link.daimyo.cartridge.gg.
Environment variables configured in Vercel dashboard.

**Project Structure**:
```
daimyo/
├── backend/
│   ├── src/               # Discord bot + Express API
│   ├── package.json       # Backend dependencies
│   ├── tsconfig.json
│   └── .env.example
├── client/
│   ├── src/               # React components
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── spec/
│   ├── REPUTATION.md
│   └── BLOCKCHAIN.md      # This document
├── .gitignore
└── README.md              # Root project documentation
```

Each directory has its own package.json with separate dependencies.
No shared dependencies between frontend and backend.

*This specification is a living document and will be updated as the feature develops.*

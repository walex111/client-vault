# client-vault

A high-performance, zero-knowledge encrypted client portal designed for independent builders to share confidential deliverables, design assets, and files without relying on bloated SaaS tools or insecure email attachments.

## Core Architecture & Security Model

`client-vault` is built around a zero-trust security boundary. The backend and storage infrastructure never see plaintext files, cryptographic keys, or unencrypted metadata.

1. **Client-Side Zero-Knowledge Encryption**: Files are encrypted and decrypted entirely in the browser using the native Web Crypto API (`AES-GCM` with a 256-bit key and a random 12-byte initialization vector) before a single byte touches the network.
2. **Blind Storage via Cloudflare R2**: The application uses S3-compatible presigned URLs. Files are uploaded directly from the browser to Cloudflare R2 as unreadable ciphertext, completely bypassing the Next.js server and avoiding serverless payload limits.
3. **The URL Fragment Key Boundary**: Decryption keys are passed exclusively via the URL hash fragment (`/v/[id]#key`). HTTP specifications dictate that URL fragments are never sent to servers or edge proxies, ensuring that logs never capture the key.
4. **Immutable Audit Logging**: Every view and download event is recorded in a PostgreSQL database via Drizzle ORM, capturing access timestamps and event metadata while preserving file confidentiality.

---

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript and Tailwind CSS.
- **Database & ORM**: PostgreSQL paired with Drizzle ORM for relational metadata and audit trails.
- **Cryptography**: Native browser Web Crypto API (`crypto.subtle`).
- **Storage**: Cloudflare R2 via AWS SDK v3 (`@aws-sdk/client-s3`).
- **Runtime & Package Management**: Bun, configured as a monorepo workspace.

---

## Getting Started

### Prerequisites

Make sure you have Bun installed on your machine.

### Local Setup

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```

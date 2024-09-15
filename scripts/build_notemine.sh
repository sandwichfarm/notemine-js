#!/bin/bash

set -e

# Configuration
RUST_DIR="rust"                          # Directory containing the Rust project
WASM_OUTPUT_DIR="dist/wasm"             # Destination directory for the WASM files
WASM_BUILD_TARGET="web"                  # Build target for wasm-pack (web | bundler | nodejs | no-modules)

# Navigate to the Rust project directory
cd "$RUST_DIR"

# Build the WASM module using wasm-pack
echo "Building the WASM module..."
wasm-pack build --target "$WASM_BUILD_TARGET" --out-dir ../dist/wasm --release
# Navigate back to the root directory
cd -

echo "WASM module built and copied successfully."
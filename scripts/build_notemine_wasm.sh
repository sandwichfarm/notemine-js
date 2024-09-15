#!/bin/bash

set -e

TEMP_DIR="tmp"                         
NOTEMINE_REPO_URL="https://github.com/sandwichfarm/notemine.git" 
NOTEMINE_DIR="$TEMP_DIR/notemine"    
WASM_OUTPUT_DIR=$(pwd)/dist/wasm
WASM_BUILD_TARGET="web"              

rm -rf ./tmp

# Ensure the temporary directory is .gitignored
if ! grep -qxF "$TEMP_DIR/" .gitignore; then
    echo "$TEMP_DIR/" >> .gitignore
    echo "Added '$TEMP_DIR/' to .gitignore"
fi

# Create temporary directory
mkdir -p "$NOTEMINE_DIR"

# Clone the notemine repository
echo "Cloning notemine repository into $NOTEMINE_DIR..."
git clone "$NOTEMINE_REPO_URL" "$NOTEMINE_DIR"

# Build the WASM module using wasm-pack
echo "Building the WASM module..."
cd $NOTEMINE_DIR 
cargo clean
wasm-pack build --target "$WASM_BUILD_TARGET" --out-dir $WASM_OUTPUT_DIR --release 

# # Delete useless wasm-bindgen typescript types
# echo "Deleting useless typescript types"
# rm ../dist/wasm/*.d.ts

# # Generate useful typescript types
# echo "Generating useful typescript types"
# typeshare . --lang=typescript --output-file=../dist/wasm/notemine_wrapper.d.ts

# Back to root
# cd -

# Clean up the temporary directory
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo "WASM module built and copied successfully."

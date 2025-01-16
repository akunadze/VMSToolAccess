#!/bin/bash

# Define the path to your PEM file
PEM_FILE="MyRootCA.pem"

# Define the target header file
HEADER_FILE="../../firmware/main/ca_pem.h"

# Create or overwrite the target header file
echo "// Generated CA certificate" > "$HEADER_FILE"

# Write the C++ code with the raw string literal to the header file
echo "static const char *serverCert = R\"rawliteral(" >> "$HEADER_FILE"

# Append the contents of the PEM file as a raw string (with proper formatting)
cat "$PEM_FILE" >> "$HEADER_FILE"

# Close the raw string literal and complete the C++ code
echo ")rawliteral\";" >> "$HEADER_FILE"

# Optional: Print success message
echo "The certificate has been written to $HEADER_FILE"
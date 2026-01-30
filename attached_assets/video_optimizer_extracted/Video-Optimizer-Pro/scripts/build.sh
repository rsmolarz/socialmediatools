#!/usr/bin/env bash

set -e

# Increase memory limit for build process
export NODE_OPTIONS='--max-old-space-size=4096'

# Run build with reduced optimization to lower memory usage
exec mastra build

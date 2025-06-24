#!/usr/bin/env node

// Simple script to get the absolute path for MCP configuration
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'build', 'index.js');

console.log('=== Replicate FLUX.1 Kontext [Max] MCP Server Configuration ===\n');
console.log('🎨 Image Generation & Editing with FLUX.1 Kontext [Max] via Replicate\n');

console.log('🚀 Universal npx Configuration (Works Everywhere)\n');

const config = {
  "mcpServers": {
    "replicate-flux-kontext-max": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/PierrunoYT/replicate-flux-kontext-max-mcp-server.git"
      ],
      "env": {
        "REPLICATE_API_TOKEN": "r8_YOUR_REPLICATE_API_TOKEN_HERE"
      }
    }
  }
};

console.log(JSON.stringify(config, null, 2));

console.log('\n=== Available Tools ===');
console.log('📸 flux_kontext_max_generate - Generate images from text prompts');
console.log('⏳ flux_kontext_max_generate_async - Generate images with prediction tracking');
console.log('❌ flux_kontext_max_cancel_prediction - Cancel a running prediction');
console.log('📊 flux_kontext_max_get_prediction - Get prediction status and details');

console.log('\n=== Instructions ===');
console.log('1. Get your Replicate API token from https://replicate.com/');
console.log('2. Replace "r8_YOUR_REPLICATE_API_TOKEN_HERE" with your actual API token');
console.log('3. Add this configuration to your MCP settings file');
console.log('4. Restart your MCP client');
console.log('\n✅ Benefits of npx configuration:');
console.log('  • Works on any machine with Node.js');
console.log('  • No local installation required');
console.log('  • Always uses the latest version');
console.log('  • Cross-platform compatible');
console.log('\n🎨 New in v1.2.0: Replicate API Integration!');
console.log('  • Direct integration with Replicate API');
console.log('  • Prediction tracking and management');
console.log('  • Support for both text-to-image and image editing');
console.log('  • Enhanced error handling and status monitoring');
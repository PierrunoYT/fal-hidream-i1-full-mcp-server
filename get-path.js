#!/usr/bin/env node

// Simple script to get the absolute path for MCP configuration
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'build', 'index.js');

console.log('=== fal-ai/hidream-i1-full MCP Server Configuration ===\n');
console.log('🎨 High-Quality Image Generation with fal-ai/hidream-i1-full\n');

console.log('🚀 Universal npx Configuration (Works Everywhere)\n');

const config = {
  "mcpServers": {
    "fal-hidream-i1-full": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/PierrunoYT/fal-hidream-i1-full-mcp-server.git"
      ],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
};

console.log(JSON.stringify(config, null, 2));

console.log('\n=== Available Tools ===');
console.log('📸 hidream_i1_full_generate - Generate high-quality images from text prompts');
console.log('🌊 hidream_i1_full_generate_stream - Generate images with streaming progress updates');
console.log('⏳ hidream_i1_full_generate_queue - Submit long-running generation requests to queue');
console.log('📊 hidream_i1_full_queue_status - Check status of queued requests');
console.log('📥 hidream_i1_full_queue_result - Get results of completed queued requests');

console.log('\n=== Instructions ===');
console.log('1. Get your fal.ai API key from https://fal.ai/');
console.log('2. Replace "your_fal_api_key_here" with your actual API key');
console.log('3. Add this configuration to your MCP settings file');
console.log('4. Restart your MCP client');
console.log('\n✅ Benefits of npx configuration:');
console.log('  • Works on any machine with Node.js');
console.log('  • No local installation required');
console.log('  • Always uses the latest version');
console.log('  • Cross-platform compatible');
console.log('\n🎨 Features of fal-ai/hidream-i1-full:');
console.log('  • Advanced high-quality image generation');
console.log('  • Multiple generation methods (sync, stream, queue)');
console.log('  • LoRA support for custom styles');
console.log('  • Automatic local image download');
console.log('  • Flexible sizing and advanced parameters');
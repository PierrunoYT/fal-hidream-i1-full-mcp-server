# fal-ai/hidream-i1-full MCP Server

A Model Context Protocol (MCP) server that provides access to the fal-ai/hidream-i1-full image generation model. This server allows you to generate high-quality images using advanced AI technology through the fal.ai platform.

## Features

- **High-Quality Image Generation**: Generate stunning images using the fal-ai/hidream-i1-full model
- **Multiple Generation Methods**: Support for synchronous, streaming, and queue-based generation
- **Flexible Image Sizing**: Support for predefined sizes and custom dimensions
- **Advanced Parameters**: Control over inference steps, guidance scale, safety checker, and more
- **LoRA Support**: Apply custom LoRA weights for specialized image styles
- **Local Image Download**: Automatically downloads generated images to local storage
- **Queue Management**: Submit long-running requests and check their status
- **Webhook Support**: Optional webhook notifications for completed requests

## Installation

1. Clone this repository:
```bash
git clone https://github.com/PierrunoYT/fal-hidream-i1-full-mcp-server.git
cd fal-hidream-i1-full-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Set your fal.ai API key as an environment variable:

```bash
export FAL_KEY="your_fal_api_key_here"
```

You can get your API key from [fal.ai](https://fal.ai/).

### MCP Client Configuration

Add this server to your MCP client configuration. For example, in Claude Desktop's config file:

```json
{
  "mcpServers": {
    "fal-hidream-i1-full": {
      "command": "node",
      "args": ["/path/to/fal-hidream-i1-full-mcp-server/build/index.js"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

## Available Tools

### 1. `hidream_i1_full_generate`

Generate images using the standard synchronous method.

**Parameters:**
- `prompt` (required): Text description of the image to generate
- `negative_prompt` (optional): What you don't want in the image
- `image_size` (optional): Predefined size or custom {width, height} object
- `num_inference_steps` (optional): Number of inference steps (1-100, default: 50)
- `seed` (optional): Random seed for reproducible results
- `guidance_scale` (optional): CFG scale (1-20, default: 5)
- `sync_mode` (optional): Wait for completion (default: true)
- `num_images` (optional): Number of images to generate (1-4, default: 1)
- `enable_safety_checker` (optional): Enable safety filtering (default: true)
- `output_format` (optional): "jpeg" or "png" (default: "jpeg")
- `loras` (optional): Array of LoRA weights to apply

**Example:**
```json
{
  "prompt": "a cat holding a skateboard which has 'fal' written on it in red spray paint",
  "image_size": {"width": 1024, "height": 1024},
  "num_inference_steps": 50,
  "guidance_scale": 7.5
}
```

### 2. `hidream_i1_full_generate_stream`

Generate images using streaming for real-time progress updates.

**Parameters:** Same as `hidream_i1_full_generate`

### 3. `hidream_i1_full_generate_queue`

Submit a long-running image generation request to the queue.

**Parameters:** Same as `hidream_i1_full_generate` plus:
- `webhook_url` (optional): URL for webhook notifications

**Returns:** A request ID for tracking the job

### 4. `hidream_i1_full_queue_status`

Check the status of a queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission
- `logs` (optional): Include logs in response (default: true)

### 5. `hidream_i1_full_queue_result`

Get the result of a completed queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission

## Image Sizes

### Predefined Sizes
- `square_hd`: High-definition square
- `square`: Standard square
- `portrait_4_3`: Portrait 4:3 aspect ratio
- `portrait_16_9`: Portrait 16:9 aspect ratio
- `landscape_4_3`: Landscape 4:3 aspect ratio
- `landscape_16_9`: Landscape 16:9 aspect ratio

### Custom Sizes
You can also specify custom dimensions:
```json
{
  "image_size": {
    "width": 1280,
    "height": 720
  }
}
```

## LoRA Support

Apply custom LoRA weights for specialized styles:

```json
{
  "loras": [
    {
      "path": "https://example.com/lora-weights.safetensors",
      "scale": 1.0,
      "weight_name": "optional_weight_name"
    }
  ]
}
```

## Output

Generated images are automatically downloaded to a local `images/` directory with descriptive filenames. The response includes:

- Local file paths
- Original URLs
- Image dimensions
- Content types
- Generation parameters used
- Request IDs for tracking

## Error Handling

The server provides detailed error messages for:
- Missing API keys
- Invalid parameters
- Network issues
- API rate limits
- Generation failures

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the Server

```bash
npm test
```

### Getting the Installation Path

```bash
npm run get-path
```

## API Reference

This server implements the fal-ai/hidream-i1-full API. For detailed API documentation, visit:
- [fal.ai Documentation](https://fal.ai/models/fal-ai/hidream-i1-full)
- [fal.ai Client Library](https://github.com/fal-ai/fal-js)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/PierrunoYT/fal-hidream-i1-full-mcp-server/issues)
- Check the [fal.ai documentation](https://fal.ai/docs)

## Changelog

### v2.0.0
- Complete rewrite to use fal-ai/hidream-i1-full API
- Added streaming support
- Added queue management
- Added LoRA support
- Improved error handling
- Updated to latest MCP SDK
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fal } from "@fal-ai/client";
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
// Check for required environment variable
const FAL_KEY = process.env.FAL_KEY;
let falConfigured = false;
if (!FAL_KEY) {
    console.error('FAL_KEY environment variable is required');
    console.error('Please set your fal.ai API key: export FAL_KEY=your_api_key_here');
    // Server continues running, no process.exit()
}
else {
    // Configure fal.ai client
    fal.config({
        credentials: FAL_KEY
    });
    falConfigured = true;
}
// Download image function
async function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            // Create images directory if it doesn't exist
            const imagesDir = path.join(process.cwd(), 'images');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            const filePath = path.join(imagesDir, filename);
            const file = fs.createWriteStream(filePath);
            client.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(filePath);
                });
                file.on('error', (err) => {
                    fs.unlink(filePath, () => { }); // Delete partial file
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
// Generate safe filename for images
function generateImageFilename(prompt, index, seed) {
    const safePrompt = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const seedStr = seed ? `_${seed}` : '';
    return `hidream_i1_full_${safePrompt}${seedStr}_${index}_${timestamp}.jpg`;
}
// Create MCP server
const server = new McpServer({
    name: "fal-hidream-i1-full-server",
    version: "2.0.0",
});
// Tool: Generate images with fal-ai/hidream-i1-full
server.tool("hidream_i1_full_generate", {
    description: "Generate high-quality images using fal-ai/hidream-i1-full - Advanced image generation model with superior quality and detail",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "The prompt to generate an image from"
            },
            negative_prompt: {
                type: "string",
                description: "The negative prompt to use. Use it to address details that you don't want in the image",
                default: ""
            },
            image_size: {
                oneOf: [
                    {
                        type: "string",
                        enum: ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
                        description: "Predefined image size"
                    },
                    {
                        type: "object",
                        properties: {
                            width: {
                                type: "integer",
                                description: "The width of the generated image",
                                default: 1024
                            },
                            height: {
                                type: "integer",
                                description: "The height of the generated image",
                                default: 1024
                            }
                        },
                        required: ["width", "height"]
                    }
                ],
                description: "The size of the generated image. Can be a predefined size or custom width/height",
                default: { width: 1024, height: 1024 }
            },
            num_inference_steps: {
                type: "integer",
                description: "The number of inference steps to perform",
                default: 50,
                minimum: 1,
                maximum: 100
            },
            seed: {
                type: "integer",
                description: "The same seed and the same prompt given to the same version of the model will output the same image every time"
            },
            guidance_scale: {
                type: "number",
                description: "The CFG (Classifier Free Guidance) scale is a measure of how close you want the model to stick to your prompt",
                default: 5,
                minimum: 1,
                maximum: 20
            },
            sync_mode: {
                type: "boolean",
                description: "If set to true, the function will wait for the image to be generated and uploaded before returning the response",
                default: true
            },
            num_images: {
                type: "integer",
                description: "The number of images to generate",
                default: 1,
                minimum: 1,
                maximum: 4
            },
            enable_safety_checker: {
                type: "boolean",
                description: "If set to true, the safety checker will be enabled",
                default: true
            },
            output_format: {
                type: "string",
                enum: ["jpeg", "png"],
                description: "The format of the generated image",
                default: "jpeg"
            },
            loras: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "URL or the path to the LoRA weights"
                        },
                        weight_name: {
                            type: "string",
                            description: "Name of the LoRA weight. Used only if path is a Hugging Face repository"
                        },
                        scale: {
                            type: "number",
                            description: "The scale of the LoRA weight",
                            default: 1
                        }
                    },
                    required: ["path"]
                },
                description: "A list of LoRAs to apply to the model",
                default: []
            }
        },
        required: ["prompt"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { prompt, negative_prompt = "", image_size = { width: 1024, height: 1024 }, num_inference_steps = 50, seed, guidance_scale = 5, sync_mode = true, num_images = 1, enable_safety_checker = true, output_format = "jpeg", loras = [] } = args;
    try {
        // Prepare input for fal.ai API
        const input = {
            prompt,
            negative_prompt,
            image_size,
            num_inference_steps,
            guidance_scale,
            sync_mode,
            num_images,
            enable_safety_checker,
            output_format,
            loras
        };
        // Add optional parameters if provided
        if (seed !== undefined) {
            input.seed = seed;
        }
        console.error(`Generating image with fal-ai/hidream-i1-full - prompt: "${prompt}"`);
        // Call fal.ai hidream-i1-full API
        const result = await fal.subscribe("fal-ai/hidream-i1-full", {
            input,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.error);
                }
            },
        });
        const output = result.data;
        // Download images locally
        console.error("Downloading images locally...");
        const downloadedImages = [];
        for (let i = 0; i < output.images.length; i++) {
            const image = output.images[i];
            const filename = generateImageFilename(prompt, i + 1, output.seed);
            try {
                const localPath = await downloadImage(image.url, filename);
                downloadedImages.push({
                    url: image.url,
                    localPath,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
                console.error(`Downloaded: ${filename}`);
            }
            catch (downloadError) {
                console.error(`Failed to download image ${i + 1}:`, downloadError);
                // Still add the image info without local path
                downloadedImages.push({
                    url: image.url,
                    localPath: null,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
            }
        }
        // Format response with download information
        const imageDetails = downloadedImages.map(img => {
            let details = `Image ${img.index}:`;
            if (img.localPath) {
                details += `\n  Local Path: ${img.localPath}`;
            }
            details += `\n  Original URL: ${img.url}`;
            details += `\n  Filename: ${img.filename}`;
            details += `\n  Dimensions: ${img.width}x${img.height}`;
            details += `\n  Content Type: ${img.content_type}`;
            return details;
        }).join('\n\n');
        const imageSizeStr = typeof image_size === 'string' ? image_size : `${image_size.width}x${image_size.height}`;
        const responseText = `Successfully generated ${downloadedImages.length} image(s) using fal-ai/hidream-i1-full:

Prompt: "${prompt}"
${negative_prompt ? `Negative Prompt: "${negative_prompt}"` : ''}
Image Size: ${imageSizeStr}
Inference Steps: ${num_inference_steps}
Guidance Scale: ${guidance_scale}
Output Format: ${output_format}
${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}
${loras.length > 0 ? `LoRAs: ${loras.length} applied` : ''}
Request ID: ${result.requestId}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error generating image:', error);
        let errorMessage = "Failed to generate image with fal-ai/hidream-i1-full.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Generate images using streaming method
server.tool("hidream_i1_full_generate_stream", {
    description: "Generate images using fal-ai/hidream-i1-full with streaming for real-time progress updates",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "The prompt to generate an image from"
            },
            negative_prompt: {
                type: "string",
                description: "The negative prompt to use. Use it to address details that you don't want in the image",
                default: ""
            },
            image_size: {
                oneOf: [
                    {
                        type: "string",
                        enum: ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
                        description: "Predefined image size"
                    },
                    {
                        type: "object",
                        properties: {
                            width: {
                                type: "integer",
                                description: "The width of the generated image",
                                default: 1024
                            },
                            height: {
                                type: "integer",
                                description: "The height of the generated image",
                                default: 1024
                            }
                        },
                        required: ["width", "height"]
                    }
                ],
                description: "The size of the generated image. Can be a predefined size or custom width/height",
                default: { width: 1024, height: 1024 }
            },
            num_inference_steps: {
                type: "integer",
                description: "The number of inference steps to perform",
                default: 50,
                minimum: 1,
                maximum: 100
            },
            seed: {
                type: "integer",
                description: "The same seed and the same prompt given to the same version of the model will output the same image every time"
            },
            guidance_scale: {
                type: "number",
                description: "The CFG (Classifier Free Guidance) scale is a measure of how close you want the model to stick to your prompt",
                default: 5,
                minimum: 1,
                maximum: 20
            },
            num_images: {
                type: "integer",
                description: "The number of images to generate",
                default: 1,
                minimum: 1,
                maximum: 4
            },
            enable_safety_checker: {
                type: "boolean",
                description: "If set to true, the safety checker will be enabled",
                default: true
            },
            output_format: {
                type: "string",
                enum: ["jpeg", "png"],
                description: "The format of the generated image",
                default: "jpeg"
            },
            loras: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "URL or the path to the LoRA weights"
                        },
                        weight_name: {
                            type: "string",
                            description: "Name of the LoRA weight. Used only if path is a Hugging Face repository"
                        },
                        scale: {
                            type: "number",
                            description: "The scale of the LoRA weight",
                            default: 1
                        }
                    },
                    required: ["path"]
                },
                description: "A list of LoRAs to apply to the model",
                default: []
            }
        },
        required: ["prompt"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { prompt, negative_prompt = "", image_size = { width: 1024, height: 1024 }, num_inference_steps = 50, seed, guidance_scale = 5, num_images = 1, enable_safety_checker = true, output_format = "jpeg", loras = [] } = args;
    try {
        // Prepare input for fal.ai API
        const input = {
            prompt,
            negative_prompt,
            image_size,
            num_inference_steps,
            guidance_scale,
            sync_mode: false, // Use async mode for streaming
            num_images,
            enable_safety_checker,
            output_format,
            loras
        };
        // Add optional parameters if provided
        if (seed !== undefined) {
            input.seed = seed;
        }
        console.error(`Creating stream for fal-ai/hidream-i1-full - prompt: "${prompt}"`);
        // Create stream
        const stream = await fal.stream("fal-ai/hidream-i1-full", {
            input
        });
        console.error("Processing stream events...");
        const events = [];
        for await (const event of stream) {
            console.error(`Stream event: ${JSON.stringify(event)}`);
            events.push(event);
        }
        const result = await stream.done();
        const output = result;
        // Download images locally
        console.error("Downloading images locally...");
        const downloadedImages = [];
        for (let i = 0; i < output.images.length; i++) {
            const image = output.images[i];
            const filename = generateImageFilename(prompt, i + 1, output.seed);
            try {
                const localPath = await downloadImage(image.url, filename);
                downloadedImages.push({
                    url: image.url,
                    localPath,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
                console.error(`Downloaded: ${filename}`);
            }
            catch (downloadError) {
                console.error(`Failed to download image ${i + 1}:`, downloadError);
                // Still add the image info without local path
                downloadedImages.push({
                    url: image.url,
                    localPath: null,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
            }
        }
        // Format response with download information
        const imageDetails = downloadedImages.map(img => {
            let details = `Image ${img.index}:`;
            if (img.localPath) {
                details += `\n  Local Path: ${img.localPath}`;
            }
            details += `\n  Original URL: ${img.url}`;
            details += `\n  Filename: ${img.filename}`;
            details += `\n  Dimensions: ${img.width}x${img.height}`;
            details += `\n  Content Type: ${img.content_type}`;
            return details;
        }).join('\n\n');
        const imageSizeStr = typeof image_size === 'string' ? image_size : `${image_size.width}x${image_size.height}`;
        const responseText = `Successfully generated ${downloadedImages.length} image(s) using fal-ai/hidream-i1-full (Streaming):

Prompt: "${prompt}"
${negative_prompt ? `Negative Prompt: "${negative_prompt}"` : ''}
Image Size: ${imageSizeStr}
Inference Steps: ${num_inference_steps}
Guidance Scale: ${guidance_scale}
Output Format: ${output_format}
${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}
${loras.length > 0 ? `LoRAs: ${loras.length} applied` : ''}
Stream Events: ${events.length} received

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error generating image with streaming:', error);
        let errorMessage = "Failed to generate image with fal-ai/hidream-i1-full (Streaming).";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Generate images using queue method for long-running requests
server.tool("hidream_i1_full_generate_queue", {
    description: "Generate images using fal-ai/hidream-i1-full with queue method for long-running requests and webhook support",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "The prompt to generate an image from"
            },
            negative_prompt: {
                type: "string",
                description: "The negative prompt to use. Use it to address details that you don't want in the image",
                default: ""
            },
            image_size: {
                oneOf: [
                    {
                        type: "string",
                        enum: ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
                        description: "Predefined image size"
                    },
                    {
                        type: "object",
                        properties: {
                            width: {
                                type: "integer",
                                description: "The width of the generated image",
                                default: 1024
                            },
                            height: {
                                type: "integer",
                                description: "The height of the generated image",
                                default: 1024
                            }
                        },
                        required: ["width", "height"]
                    }
                ],
                description: "The size of the generated image. Can be a predefined size or custom width/height",
                default: { width: 1024, height: 1024 }
            },
            num_inference_steps: {
                type: "integer",
                description: "The number of inference steps to perform",
                default: 50,
                minimum: 1,
                maximum: 100
            },
            seed: {
                type: "integer",
                description: "The same seed and the same prompt given to the same version of the model will output the same image every time"
            },
            guidance_scale: {
                type: "number",
                description: "The CFG (Classifier Free Guidance) scale is a measure of how close you want the model to stick to your prompt",
                default: 5,
                minimum: 1,
                maximum: 20
            },
            num_images: {
                type: "integer",
                description: "The number of images to generate",
                default: 1,
                minimum: 1,
                maximum: 4
            },
            enable_safety_checker: {
                type: "boolean",
                description: "If set to true, the safety checker will be enabled",
                default: true
            },
            output_format: {
                type: "string",
                enum: ["jpeg", "png"],
                description: "The format of the generated image",
                default: "jpeg"
            },
            loras: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "URL or the path to the LoRA weights"
                        },
                        weight_name: {
                            type: "string",
                            description: "Name of the LoRA weight. Used only if path is a Hugging Face repository"
                        },
                        scale: {
                            type: "number",
                            description: "The scale of the LoRA weight",
                            default: 1
                        }
                    },
                    required: ["path"]
                },
                description: "A list of LoRAs to apply to the model",
                default: []
            },
            webhook_url: {
                type: "string",
                description: "Optional webhook URL for result notifications"
            }
        },
        required: ["prompt"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { prompt, negative_prompt = "", image_size = { width: 1024, height: 1024 }, num_inference_steps = 50, seed, guidance_scale = 5, num_images = 1, enable_safety_checker = true, output_format = "jpeg", loras = [], webhook_url } = args;
    try {
        // Prepare input for fal.ai API
        const input = {
            prompt,
            negative_prompt,
            image_size,
            num_inference_steps,
            guidance_scale,
            sync_mode: false, // Use async mode for queue
            num_images,
            enable_safety_checker,
            output_format,
            loras
        };
        // Add optional parameters if provided
        if (seed !== undefined) {
            input.seed = seed;
        }
        console.error(`Submitting queue request for fal-ai/hidream-i1-full - prompt: "${prompt}"`);
        // Submit to queue
        const queueOptions = { input };
        if (webhook_url) {
            queueOptions.webhookUrl = webhook_url;
        }
        const { request_id } = await fal.queue.submit("fal-ai/hidream-i1-full", queueOptions);
        console.error(`Request submitted with ID: ${request_id}`);
        const imageSizeStr = typeof image_size === 'string' ? image_size : `${image_size.width}x${image_size.height}`;
        const responseText = `Successfully submitted image generation request to fal-ai/hidream-i1-full queue:

Request ID: ${request_id}
Prompt: "${prompt}"
${negative_prompt ? `Negative Prompt: "${negative_prompt}"` : ''}
Image Size: ${imageSizeStr}
Inference Steps: ${num_inference_steps}
Guidance Scale: ${guidance_scale}
Output Format: ${output_format}
${seed ? `Seed: ${seed}` : 'Seed: Auto-generated'}
${loras.length > 0 ? `LoRAs: ${loras.length} applied` : ''}
${webhook_url ? `Webhook URL: ${webhook_url}` : ''}

Use the 'hidream_i1_full_queue_status' tool with request ID '${request_id}' to check the status.
Use the 'hidream_i1_full_queue_result' tool with request ID '${request_id}' to get the result when completed.`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error submitting queue request:', error);
        let errorMessage = "Failed to submit image generation request to fal-ai/hidream-i1-full queue.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Check queue status
server.tool("hidream_i1_full_queue_status", {
    description: "Check the status of a queued image generation request",
    inputSchema: {
        type: "object",
        properties: {
            request_id: {
                type: "string",
                description: "The request ID returned from the queue submission"
            },
            logs: {
                type: "boolean",
                description: "Whether to include logs in the response",
                default: true
            }
        },
        required: ["request_id"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { request_id, logs = true } = args;
    try {
        console.error(`Checking status for request: ${request_id}`);
        const status = await fal.queue.status("fal-ai/hidream-i1-full", {
            requestId: request_id,
            logs
        });
        let responseText = `Queue Status for Request ${request_id}:

Status: ${status.status}`;
        if (status.response_url) {
            responseText += `\nResponse URL: ${status.response_url}`;
        }
        if (status.logs && status.logs.length > 0) {
            responseText += `\n\nLogs:\n${status.logs.map((log) => `[${log.timestamp}] ${log.message}`).join('\n')}`;
        }
        if (status.status === 'COMPLETED') {
            responseText += `\n\nRequest completed! Use 'hidream_i1_full_queue_result' tool to get the results.`;
        }
        else if (status.status === 'FAILED') {
            responseText += `\n\nRequest failed. Check the logs above for error details.`;
        }
        else if (status.status === 'IN_PROGRESS') {
            responseText += `\n\nRequest is still processing. Check again in a few moments.`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error checking queue status:', error);
        let errorMessage = "Failed to check queue status.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Get queue result
server.tool("hidream_i1_full_queue_result", {
    description: "Get the result of a completed queued image generation request",
    inputSchema: {
        type: "object",
        properties: {
            request_id: {
                type: "string",
                description: "The request ID returned from the queue submission"
            }
        },
        required: ["request_id"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { request_id } = args;
    try {
        console.error(`Getting result for request: ${request_id}`);
        const result = await fal.queue.result("fal-ai/hidream-i1-full", {
            requestId: request_id
        });
        const output = result.data;
        // Download images locally
        console.error("Downloading images locally...");
        const downloadedImages = [];
        for (let i = 0; i < output.images.length; i++) {
            const image = output.images[i];
            const filename = generateImageFilename(output.prompt || "generated", i + 1, output.seed);
            try {
                const localPath = await downloadImage(image.url, filename);
                downloadedImages.push({
                    url: image.url,
                    localPath,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
                console.error(`Downloaded: ${filename}`);
            }
            catch (downloadError) {
                console.error(`Failed to download image ${i + 1}:`, downloadError);
                // Still add the image info without local path
                downloadedImages.push({
                    url: image.url,
                    localPath: null,
                    index: i + 1,
                    width: image.width,
                    height: image.height,
                    content_type: image.content_type,
                    filename
                });
            }
        }
        // Format response with download information
        const imageDetails = downloadedImages.map(img => {
            let details = `Image ${img.index}:`;
            if (img.localPath) {
                details += `\n  Local Path: ${img.localPath}`;
            }
            details += `\n  Original URL: ${img.url}`;
            details += `\n  Filename: ${img.filename}`;
            details += `\n  Dimensions: ${img.width}x${img.height}`;
            details += `\n  Content Type: ${img.content_type}`;
            return details;
        }).join('\n\n');
        const responseText = `Successfully retrieved result for request ${request_id}:

Request ID: ${result.requestId}
${output.prompt ? `Prompt: "${output.prompt}"` : ''}
${output.seed ? `Seed: ${output.seed}` : ''}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error getting queue result:', error);
        let errorMessage = "Failed to get queue result.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Graceful shutdown handlers
process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('fal-ai/hidream-i1-full MCP server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
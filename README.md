# z.ai MCP Server for Netlify

A Model Context Protocol (MCP) server that integrates with z.ai API, designed for easy deployment on Netlify.

## Features

- **Chat Completion**: Conversational AI with z.ai's models
- **Search**: Semantic search capabilities using z.ai
- **Summarization**: Text summarization with customizable styles
- **Netlify Ready**: Serverless deployment with SSE transport
- **Production Ready**: Error handling, validation, and environment configuration

## Quick Start

### 1. Deploy to Netlify

1. Use this repository as a template or fork it
2. Connect your repository to Netlify
3. Set environment variables in Netlify dashboard:
   - `ZAI_API_KEY`: Your z.ai API key
   - `ZAI_BASE_URL`: (Optional) Custom API base URL
   - `ZAI_MODEL`: (Optional) Default model to use

4. Deploy! Your MCP server will be available at: `https://your-site.netlify.app/mcp`

### 2. Local Development

```bash
# Clone your repository
git clone https://github.com/your-username/zai-mcp-server
cd zai-mcp-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your z.ai API key

# Run the server
npm run dev
```

## Tools Available

### zai_chat
Send messages to z.ai for conversational AI responses.

**Parameters:**
- `message` (required): The message to send
- `system_prompt`: Optional system prompt for context
- `temperature`: Randomness in responses (0-1)
- `max_tokens`: Maximum response length

### zai_search
Search using z.ai's search capabilities.

**Parameters:**
- `query` (required): Search query
- `limit`: Maximum number of results (default: 10)
- `filters`: Search filter criteria

### zai_summarize
Summarize text using z.ai.

**Parameters:**
- `text` (required): Text to summarize
- `length`: Summary length (short/medium/long)
- `style`: Summary style (bullets/paragraph/technical)

## Configuration

### Environment Variables

**Required:**
- `ZAI_API_KEY`: Your z.ai API key

**Optional:**
- `ZAI_BASE_URL`: API base URL (default: https://api.z.ai)
- `ZAI_MODEL`: Default model (default: claude-3-sonnet-20240229)
- `ZAI_MAX_TOKENS`: Default max tokens (default: 4000)
- `ZAI_TEMPERATURE`: Default temperature (default: 0.7)

## Integration with Poke

1. After deploying to Netlify, your MCP server URL will be: `https://your-site.netlify.app/mcp`
2. Add this URL to your Poke MCP connections
3. Start using z.ai through Poke!

## Repository Structure

```
├── index.js                 # Main MCP server implementation
├── netlify/
│   └── functions/
│       └── mcp.js          # Netlify serverless function
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variable template
└── README.md               # This file
```

## Development

### Running Locally

The server runs using stdio transport for local MCP client connections:

```bash
npm start
```

### Testing with MCP Inspector

You can test the server locally using the MCP Inspector tool:

```bash
npx @modelcontextprotocol/inspector node index.js
```

## Deployment

### Netlify Deployment

This repository is configured for automatic deployment on Netlify:

1. **Automatic Builds**: Netlify will automatically install dependencies and deploy
2. **Serverless Functions**: The MCP server runs as a Netlify function
3. **Environment Variables**: Configure in Netlify dashboard under Site Settings → Environment Variables
4. **Custom Domain**: Optional - set up a custom domain in Netlify

### Testing Your Deployment

After deployment, test your MCP server:

```bash
curl https://your-site.netlify.app/mcp
```

## Usage Examples

### Using zai_chat

```json
{
  "tool": "zai_chat",
  "arguments": {
    "message": "What is the capital of France?",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

### Using zai_search

```json
{
  "tool": "zai_search",
  "arguments": {
    "query": "latest developments in AI",
    "limit": 5
  }
}
```

### Using zai_summarize

```json
{
  "tool": "zai_summarize",
  "arguments": {
    "text": "Your long text here...",
    "length": "medium",
    "style": "paragraph"
  }
}
```

## Troubleshooting

### Common Issues

**Server won't start locally:**
- Check that `ZAI_API_KEY` is set in your `.env` file
- Verify Node.js version is 18 or higher: `node --version`
- Ensure dependencies are installed: `npm install`

**Netlify deployment fails:**
- Check build logs in Netlify dashboard
- Verify environment variables are set correctly
- Ensure `package.json` and `netlify.toml` are committed

**API errors:**
- Verify your z.ai API key is valid
- Check `ZAI_BASE_URL` is correct
- Review API rate limits

## License

MIT License - feel free to use and modify as needed.

## Author

Richard Hewitt

## Support

For issues with this MCP server template, please create an issue in this repository.
For z.ai API questions, consult the z.ai documentation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

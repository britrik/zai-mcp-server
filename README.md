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
- `system_prompt`: Optional system prompt to set context
- `temperature`: Randomness in responses (0-1)
- `max_tokens`: Maximum response length

### zai_search
Search using z.ai's search capabilities.

**Parameters:**
- `query` (required): Search query
- `limit`: Maximum number of results
- `filters`: Search filter criteria

### zai_summarize
Summarize text using z.ai.

**Parameters:**
- `text` (required): Text to summarize
- `length`: Summary length (short/medium/long)
- `style`: Summary style (bullets/paragraph/technical)

## Configuration

### Environment Variables

Required:
- `ZAI_API_KEY`: Your z.ai API key

Optional:
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
├── .gitignore              # Git ignore patterns
└── README.md               # This file
```

## License

MIT License - feel free to use and modify as needed.

## Support

For issues with this MCP server template, please create an issue in this repository.
For z.ai API questions, consult the z.ai documentation.

---

**Created by Richard Hewitt** | [Use this template](../../generate) to create your own z.ai MCP server

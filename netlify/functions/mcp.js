import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMCPServer } from "../../index.js";

export const handler = async (event, context) => {
  const server = createMCPServer();
  const transport = new SSEServerTransport("/mcp", server);
  
  return transport.handleRequest(event, context);
};

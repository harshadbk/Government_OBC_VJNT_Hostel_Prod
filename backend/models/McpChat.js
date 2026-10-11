import mongoose from 'mongoose';

// One question/answer exchange with the MCP AI assistant (sent by the Python MCP server).
const toolCallSchema = new mongoose.Schema(
  {
    tool: { type: String, default: '' },
    arguments: { type: mongoose.Schema.Types.Mixed, default: {} },
    ok: { type: Boolean, default: true },
    rows: { type: Number, default: null },
    error: { type: String, default: '' }
  },
  { _id: false }
);

const mcpChatSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: '', index: true },
    adminUser: { type: String, default: '' },
    clientIp: { type: String, default: '' },
    question: { type: String, required: true, trim: true },
    answer: { type: String, default: '' },
    success: { type: Boolean, default: true },
    source: { type: String, default: '' },
    iterations: { type: Number, default: 0 },
    toolsUsed: { type: [toolCallSchema], default: [] },
    toolCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: null },
    error: { type: String, default: '' },
    groqError: { type: String, default: '' },
    askedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

mcpChatSchema.index({ 'toolsUsed.tool': 1 });

export default mongoose.model('McpChat', mcpChatSchema);

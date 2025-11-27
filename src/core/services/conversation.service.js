import axios from "axios";
import crypto from "crypto";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleAuth } from "google-auth-library";
import { AppError, ValidationError } from "../errors/httpErrors.js";
import { regex } from "zod";
import { logger } from "../../infra/logger/index.js";
import { Status } from "@prisma/client";

const AGENT_QUERY_PATH = ":query";
const AGENT_STREAM_QUERY_PATH = ":streamQuery?alt=sse";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../../../services/strange-mind-475717-i4-7c3713d03a9c.json"
);

const jsonBlockRegex = /\^\^\^(?:\s*\S+)?\s*([\s\S]*?)\^\^\^/g;

const safeJsonParse = (maybeJson) => {
  if (typeof maybeJson !== "string") {
    return null;
  }
  try {
    return JSON.parse(maybeJson);
  } catch (error) {
    return null;
  }
};

const stripInvalidJsonEscapes = (value) => {
  if (typeof value !== "string" || value.indexOf("\\") === -1) {
    return value;
  }

  let result = "";
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "\\" && value[i + 1] === "'") {
      let backslashCount = 0;
      for (let j = i - 1; j >= 0 && value[j] === "\\"; j--) {
        backslashCount++;
      }
      if (backslashCount % 2 === 0) {
        continue;
      }
    }
    result += char;
  }
  return result;
};

const parseJsonCandidate = (candidate) => {
  if (typeof candidate !== "string") {
    return null;
  }

  const direct = safeJsonParse(candidate);
  if (direct) {
    return direct;
  }

  const sanitized = stripInvalidJsonEscapes(candidate);
  if (sanitized !== candidate) {
    return safeJsonParse(sanitized);
  }
  return null;
};

const extractStructuredAgentPayload = (rawData) => {
  if (typeof rawData !== "string") {
    return { structuredPayload: null, plainText: "" };
  }

  jsonBlockRegex.lastIndex = 0;
  const matches = [...rawData.matchAll(jsonBlockRegex)];
  let structuredPayload = null;

  for (const match of matches) {
    const [, block] = match ?? [];
    if (!block) continue;

    let candidate = block.trim();
    if (!candidate) continue;

    const firstStructureIndex = candidate.search(/[{\[]/);
    if (firstStructureIndex > 0) {
      candidate = candidate.slice(firstStructureIndex).trim();
    }

    const openingChar = candidate[0];
    if (openingChar !== "{" && openingChar !== "[") {
      continue;
    }

    const closingChar = openingChar === "[" ? "]" : "}";
    const lastClosingIndex = candidate.lastIndexOf(closingChar);
    if (lastClosingIndex === -1) {
      continue;
    }

    const jsonSlice = candidate.slice(0, lastClosingIndex + 1);
    const parsed = parseJsonCandidate(jsonSlice);
    if (parsed) {
      structuredPayload = parsed;
      break;
    }
  }

  let plainText = rawData;
  if (matches.length) {
    for (const match of matches) {
      if (!match) continue;
      plainText = plainText.replace(match[0], "");
    }
  }
  plainText = plainText.trim();

  return { structuredPayload, plainText };
};

const extractSessionMetadata = (payload) => {
  if (!payload) return {};
  const candidateSources = [payload, payload.output, payload.session, payload.output?.session];
  for (const source of candidateSources) {
    if (!source) continue;
    const sessionId =
      source.session_id ||
      source.sessionId ||
      source.id ||
      source.session?.id ||
      source.session?.session_id;
    const name =
      source.display_name ||
      source.name ||
      source.session_name ||
      source.session?.name ||
      source.session?.display_name;
    if (sessionId) {
      return { sessionId, name };
    }
  }
  return {};
};

const makeEncryptor = (secret) => {
  const key = crypto.createHash("sha256").update(secret).digest();

  const encrypt = (plainText) => {
    if (!plainText) return plainText;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  };

  const decrypt = (cipherText) => {
    if (!cipherText) return cipherText;
    const buffer = Buffer.from(cipherText, "base64");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  };

  return { encrypt, decrypt };
};

export function makeConversationService({
  userRepository,
  currentSessionRepository,
  logger,
  env,
}) {
  let agentToken = null;
  let agentTokenLoaded = false;
  const service = {};
  const { encrypt, decrypt } = makeEncryptor(env.JWT_SECRET ?? "temp-current-session-secret");

  const persistAgentToken = async (token) => {
    if (!token) return;
    try {
      const encrypted = encrypt(token);
      await currentSessionRepository.saveEncryptedSession(encrypted);
    } catch (err) {
      logger?.error?.(err, "Failed to persist encrypted agent token");
    }
  };

  const ensureAgentToken = async () => {
    if (agentTokenLoaded) {
      return agentToken;
    }

    try {
      const stored = await currentSessionRepository.getCurrentSession();
      if (stored?.currentSession) {
        agentToken = decrypt(stored.currentSession);
        console.log("agentToken", agentToken);
      }
    } catch (err) {
      logger?.error?.(err, "Failed to load stored agent token");
    }

    if (!agentToken && env.TOKENAGENT) {
      agentToken = env.TOKENAGENT;
      await persistAgentToken(agentToken);
    }

    agentTokenLoaded = true;
    return agentToken;
  };

  const agentClient = axios.create({
    baseURL: env.AGENTURL,
    headers: { "Content-Type": "application/json" },
  });

  const resolveAgentAuthOptions = () => {
    if (env.GCP_AGENT_CREDENTIALS) {
      try {
        return { credentials: JSON.parse(env.GCP_AGENT_CREDENTIALS) };
      } catch (error) {
        logger?.warn?.(error, "Failed to parse GCP_AGENT_CREDENTIALS secret");
      }
    }
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      return { keyFilename: SERVICE_ACCOUNT_PATH };
    }
    return {};
  };

  agentClient.interceptors.request.use(async (config) => {
    const token = await ensureAgentToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  agentClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const nextToken = await service.refreshAgentToken();
          if (nextToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            console.log("nextToken");
            originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          }
          return agentClient(originalRequest);
        } catch (refreshError) {
          logger?.error?.(refreshError, "Failed to refresh agent token");
          throw refreshError;
        }
      }
      return Promise.reject(error);
    }
  );


  service.createConversation = async (clientContext, userId) => {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const body = {
      class_method: "create_session",
      input: {
        user_id: user.id,
      },
    };
    try {
      const { data } = await agentClient.post(AGENT_QUERY_PATH, body);
      console.log("agent123", data);
      const { sessionId, name } = extractSessionMetadata(data);
      if (!sessionId) {
        throw new AppError("Unable to determine session id from agent response", 502);
      }

      return { ok: true, sessionId };
    } catch (error) {
      if (error.response) {
        console.error("🔥 Error dari Agent AI (Response):", error.response.data);
        console.error("🔥 Status Code:", error.response.status);
      } else if (error.request) {
        console.error("🔥 Tidak ada respon dari Agent AI (Mungkin Server Mati/Timeout)");
      } else {
        console.error("🔥 Error Coding/Setup:", error.message);
      }
      logger?.error?.(error, "Failed to create agent conversation");
      throw error instanceof AppError ? error : new AppError(`Failed to create agent: ${error.message}`);
      // throw error instanceof AppError ? error : new AppError("Failed to create agent conversation");
    }
  };

  service.refreshAgentToken = async () => {
    try {
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        ...resolveAgentAuthOptions(),
      });
      const client = await auth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      const token =
        typeof accessTokenResponse === "string" ? accessTokenResponse : accessTokenResponse?.token;

      if (!token) {
        throw new Error("Unable to retrieve Google access token");
      }
      agentToken = token;
      agentTokenLoaded = true;
      await persistAgentToken(agentToken);

      return token;
    } catch (error) {
      logger?.error?.(error, "Failed to refresh agent token via GoogleAuth");
      throw error;
    }
  };

  service.streamConversation = async (clientContext, userId, sessionId, message) => {
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    if (!normalizedMessage) {
      throw new AppError("Message is required", 400);
    }


    const body = {
      class_method: "async_stream_query",
      input: {
        user_id: conversation.userId,
        session_id: conversation.sessionId,
        message: normalizedMessage,
      },
    };

    try {
      const response = await agentClient.post(AGENT_STREAM_QUERY_PATH, body);
      const data = response.data.content.parts[0].text;

      const { structuredPayload, plainText } = extractStructuredAgentPayload(data);
      if (!structuredPayload) {
        return {
          structuredPayload: null,
          plainText,
        };
      }

      const detailSections = Array.isArray(structuredPayload?.data)
        ? structuredPayload.data
        : Array.isArray(structuredPayload)
          ? structuredPayload
          : [];

      await service.pushConversationDetail({
        userId,
        conversationId: conversation.id,
        details: detailSections,
      });

      return {
        structuredPayload,
        plainText,
      };
    } catch (error) {
      logger?.error?.(error, "Failed to stream agent conversation");
      throw error instanceof AppError ? error : new AppError("Failed to stream conversation");
    }
  };

  service.pushConversationDetail = async ({ userId, conversationId, details }) => {
    if (!conversationId) {
      throw new AppError("conversationId is required", 400);
    }
    if (!userId) {
      throw new AppError("userId is required", 400);
    }

    if (!Array.isArray(details) || details.length === 0) {
      return false;
    }

    const upsertPayloads = details
      .map((detailEntry) => {
        if (!detailEntry || typeof detailEntry !== "object") {
          return null;
        }
        const title = typeof detailEntry.title === "string" ? detailEntry.title.trim() : "";
        if (!title) {
          return null;
        }
        const markdown =
          typeof detailEntry.markdown === "string"
            ? detailEntry.markdown
            : JSON.stringify(detailEntry);

        return {
          conversationId,
          userId,
          title,
          detail: markdown,
        };
      })
      .filter(Boolean);

    if (!upsertPayloads.length) {
      return false;
    }

    return true;
  };
  return service;
}
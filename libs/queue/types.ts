export interface JobPayload {
  sessionId: string;
  browserConfig?: {
    viewport?: {
      width: number;
      height: number;
    };
    userAgent?: string;
    headless?: boolean;
  };
  timeout?: number; // in milliseconds, default 300000 (5 minutes)
  createdAt: number;
}

export interface ResultPayload {
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed" | "terminated";
  browserWssUrl?: string;
  containerId?: string;
  containerPort?: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface BrowserSession {
  id: string;
  status: ResultPayload["status"];
  wssUrl?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export const QUEUE_NAMES = {
  BROWSER_REQUESTS: "browser-requests",
} as const;

export const JOB_TYPES = {
  CREATE_BROWSER: "create-browser",
  TERMINATE_BROWSER: "terminate-browser",
} as const;

import { Handlers } from "$fresh/server.ts";
import { QueueClient } from "../../../libs/queue/client.ts";
import {
  getRequiredEnvVar,
  createErrorResponse,
  isValidSessionId,
} from "../../../libs/shared.ts";

const queueClient = new QueueClient(getRequiredEnvVar("REDIS_URL"));

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        return new Response(
          JSON.stringify(
            createErrorResponse(
              "Missing sessionId parameter",
              "MISSING_SESSION_ID"
            )
          ),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      if (!isValidSessionId(sessionId)) {
        return new Response(
          JSON.stringify(
            createErrorResponse(
              "Invalid sessionId format",
              "INVALID_SESSION_ID"
            )
          ),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const status = await queueClient.getJobStatus(sessionId);

      if (!status) {
        return new Response(
          JSON.stringify(
            createErrorResponse("Session not found", "SESSION_NOT_FOUND")
          ),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      return new Response(JSON.stringify(status), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error) {
      console.error("Error getting session status:", error);

      return new Response(
        JSON.stringify(
          createErrorResponse(
            "Failed to get session status",
            "STATUS_FETCH_FAILED",
            error.message
          )
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },

  // Handle CORS preflight
  OPTIONS() {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  },
};

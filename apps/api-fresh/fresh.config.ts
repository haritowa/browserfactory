import { type Config } from "$fresh/server.ts";

export default {
  build: {
    target: ["chrome99", "firefox99", "safari15"],
  },
} satisfies Config;

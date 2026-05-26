import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  // pino-pretty transport uses worker threads which break jest — skip in test env
  ...(!isTest && !isProd && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});

export default logger;

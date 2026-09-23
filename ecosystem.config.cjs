const fs = require("fs");

module.exports = {
  apps: [
    {
      name: "classflow-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/ubuntu/Biovators-ClassFlow",
      env: {
        NODE_ENV: "production",
        WHATSAPP_API_URL: "http://127.0.0.1:3001",
        WHATSAPP_API_KEY: fs
          .readFileSync("/home/ubuntu/.classflow-api-key", "utf8")
          .trim(),
        REMINDER_API_KEY: fs
          .readFileSync("/home/ubuntu/.classflow-reminder-key", "utf8")
          .trim(),
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "mqtt-tool",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        OPENAI_API_KEY: "sk-5678ijklmnopabcd5678ijklmnopabcd5678ijkl"
      }
    }
  ]
};
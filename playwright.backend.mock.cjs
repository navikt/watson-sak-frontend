const http = require("node:http");

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/v1/kontrollsaker") {
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: "test-sak" }));
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(8089);

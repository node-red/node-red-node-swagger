/**
 * Copyright 2015, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

//const swaggerUiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();

const DEFAULT_TEMPLATE = {
  openapi: "3.0.0",
  info: {
    title: "My Node-RED API",
    version: "1.0.0",
    description: "A sample API",
    // You can also add 'termsOfService', 'contact', and 'license' information here
  },
  servers: [
    {
      url: "http://localhost:1880/",
      description: "Local server",
    },
  ],
  paths: {},
  components: {
    schemas: {},
    responses: {},
    parameters: {},
    securitySchemes: {},
  },
  tags: [],
  // Add more properties as needed
};

module.exports = function (RED) {
  "use strict";

  const path = require("path");

  const convToSwaggerPath = (x) => `/{${x.substring(2)}}`;
  const trimAll = (ary) => ary.map((x) => x.trim());
  const csvStrToArray = (csvStr) => (csvStr ? trimAll(csvStr.split(",")) : []);
  const ensureLeadingSlash = (url) => (url.startsWith("/") ? url : "/" + url);
  const stripTerminalSlash = (url) =>
    url.length > 1 && url.endsWith("/") ? url.slice(0, -1) : url;
  const regexColons = /\/:\w*/g;

  RED.httpNode.get("/http-api/swagger.json", (req, res) => {
    const {
      httpNodeRoot,
      swagger: {
        parameters: additionalParams = [],
        template: resp = { ...DEFAULT_TEMPLATE },
      } = {},
    } = RED.settings;
    const { basePath = httpNodeRoot } = resp;

    resp.paths = {};

    RED.nodes.eachNode((node) => {
      const { name, type, method, swaggerDoc, url } = node;

      if (type === "http in") {
        const swaggerDocNode = RED.nodes.getNode(swaggerDoc);

        if (swaggerDocNode) {
          const endPoint = ensureLeadingSlash(
            url.replace(regexColons, convToSwaggerPath)
          );
          if (!resp.paths[endPoint]) resp.paths[endPoint] = {};

          const {
            summary = swaggerDocNode.summary || name || method + " " + endPoint,
            description = swaggerDocNode.description || "",
            tags = swaggerDocNode.tags || "",
            deprecated = swaggerDocNode.deprecated || false,
            parameters = swaggerDocNode.parameters || [],
          } = swaggerDocNode;

          const aryTags = csvStrToArray(tags);

          const operation = {
            summary,
            description,
            tags: aryTags,
            deprecated,
            parameters: [...parameters, ...additionalParams].map((param) => {
              return {
                name: param.name,
                in: param.in,
                required: param.required,
                schema: {
                  type: param.type,
                  // Add other schema properties here
                },
                description: param.description,
              };
            }),
            responses: {},
          };

          // Check if responses is an object and not null or undefined
          if (
            swaggerDocNode &&
            typeof swaggerDocNode.responses === "object" &&
            swaggerDocNode.responses !== null
          ) {
            Object.keys(swaggerDocNode.responses).forEach((status) => {
              const responseDetails = swaggerDocNode.responses[status];
              operation.responses[status] = {
                description: responseDetails.description || "No description",
                content: {},
              };

              // Conditionally add schema if it's set
              if (responseDetails.schema) {
                operation.responses[status].content["application/json"] = {
                  schema: responseDetails.schema,
                };
              }
            });
          } else {
            console.error(
              "swaggerDocNode.responses is not an object or is null:",
              swaggerDocNode.responses
            );
          }

          // Add the operation to the path in the spec
          resp.paths[endPoint][method.toLowerCase()] = operation;
        } else {
          console.error(
            "No Swagger Documentation node found for HTTP In node:",
            node.id
          );
        }
      }
    });

    // Final cleanup to remove empty sections
    cleanupOpenAPISpec(resp);
    res.json(resp);
  });

  function cleanupOpenAPISpec(spec) {
    // Clean up components
    if (spec.components) {
      ["schemas", "responses", "parameters", "securitySchemes"].forEach(
        (key) => {
          if (
            spec.components[key] &&
            Object.keys(spec.components[key]).length === 0
          ) {
            delete spec.components[key];
          }
        }
      );

      // If all components are empty, remove the components object itself
      if (Object.keys(spec.components).length === 0) {
        delete spec.components;
      }
    }

    // Clean up empty tags array
    if (Array.isArray(spec.tags) && spec.tags.length === 0) {
      delete spec.tags;
    }
  }

  function SwaggerDoc(n) {
    RED.nodes.createNode(this, n);
    this.summary = n.summary;
    this.description = n.description;
    this.tags = n.tags;
    this.parameters = n.parameters;
    this.responses = n.responses;
    this.deprecated = n.deprecated;
  }
  RED.nodes.registerType("swagger-doc", SwaggerDoc);

  // Serve the main Swagger UI HTML file
  RED.httpAdmin.get("/swagger-ui/swagger-ui.html", (req, res) => {
    // Correct the path to point directly to the 'swagger-ui.html' file
    const filename = path.join(__dirname, "swagger-ui/swagger-ui.html");
    sendFile(res, filename);
  });

  // Serve i18next localization files
  RED.httpAdmin.get("/swagger-ui/i18next.min.js", (req, res) => {
    const filename = path.join(
      __dirname,
      "..",
      "node_modules",
      "i18next",
      "i18next.min.js"
    );
    sendFile(res, filename);
  });

  // Serve Swagger UI assets like CSS and JS from swagger-ui-dist
  RED.httpAdmin.get(
    "/swagger-ui/*",
    (req, res, next) => {
      // Extract the actual file name from the request params
      let filename = req.params[0];

      // If the filename is 'swagger-ui.html', redirect to the correct handler
      if (filename === "swagger-ui.html") {
        return next();
      }

      // Serve the file from swagger-ui-dist
      try {
        const basePath = require("swagger-ui-dist").getAbsoluteFSPath();
        const filePath = path.join(basePath, filename);
        sendFile(res, filePath);
      } catch (err) {
        console.error(err);
        res.status(404).send("File not found");
      }
    },
    (req, res) => {
      // Fallback handler for 'swagger-ui.html', in case the above handler is triggered
      // due to the way Express handles wildcard routes
      const filename = path.join(__dirname, "swagger", "swagger-ui.html");
      sendFile(res, filename);
    }
  );

  // Serve any other localization files
  RED.httpAdmin.get("/swagger-ui/nls/*", (req, res) => {
    const filename = path.join(__dirname, "locales", req.params[0]);
    sendFile(res, filename);
  });

  // Generic function to send files
  function sendFile(res, filePath) {
    // Implement the logic to send the file
    // For example, using Express' res.sendFile:
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(err.status || 500).send("Error sending file.");
      }
    });
  }
};

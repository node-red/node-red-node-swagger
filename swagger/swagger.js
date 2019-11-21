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

const DEFAULT_TEMPLATE = {
    swagger: "2.0",
    info: {
        title: "My Node-RED API",
        version: "0.0.1"
    }
};

module.exports = function(RED) {
    "use strict";

    const path = require("path");

    const convToSwaggerPath = x => `/{${x.substring(2)}}`;
    const trimAll = ary => ary.map(x => x.trim());
    const csvStrToArray = csvStr => csvStr ? trimAll(csvStr.split(",")) : [];
    const ensureLeadingSlash = url => (url.startsWith("/") ? url : "/" + url);
    const stripTerminalSlash = url =>
        url.length > 1 && url.endsWith("/") ? url.slice(0, -1) : url;
    const regexColons = /\/:\w*/g;

    RED.httpNode.get("/http-api/swagger.json", (req, res) => {
        const {
            httpNodeRoot,
            swagger: { parameters: additionalParams = [], template: resp = { ...DEFAULT_TEMPLATE } } = {}
        } = RED.settings;
        const { basePath = httpNodeRoot } = resp;
        resp.basePath = stripTerminalSlash(basePath);
        resp.paths = {};

        RED.nodes.eachNode(node => {
            const { name, type, method, swaggerDoc, url } = node;

            if (type === "http in") {
                const swagger = RED.nodes.getNode(swaggerDoc);
                const endPoint = ensureLeadingSlash(url.replace(regexColons, convToSwaggerPath));
                if (!resp.paths[endPoint]) resp.paths[endPoint] = {};

                const {
                    summary = name || method + " " + endPoint,
                    description = "",
                    tags = "",
                    consumes,
                    produces,
                    deprecated,
                    parameters = [],
                    responses = {
                        default: {
                            description: ""
                        }
                    }
                } = swagger || {};
                
                const aryTags = csvStrToArray(tags),
                    aryConsumes = csvStrToArray(consumes),
                    aryProduces = csvStrToArray(produces);

                resp.paths[endPoint][method] = {
                    summary,
                    description,
                    tags: aryTags,
                    consumes: aryConsumes,
                    produces: aryProduces,
                    deprecated,
                    parameters: [...parameters, ...additionalParams],
                    responses
                };
            }
        });
        res.json(resp);
    });

    function SwaggerDoc(n) {
        RED.nodes.createNode(this, n);
        this.summary = n.summary;
        this.description = n.description;
        this.tags = n.tags;
        this.consumes = n.consumes;
        this.produces = n.produces;
        this.parameters = n.parameters;
        this.responses = n.responses;
        this.deprecated = n.deprecated;
    }
    RED.nodes.registerType("swagger-doc", SwaggerDoc);

    function sendFile(res, filename) {
        // Use the right function depending on Express 3.x/4.x
        if (res.sendFile) {
            res.sendFile(filename);
        } else {
            res.sendfile(filename);
        }
    }

    RED.httpAdmin.get("/swagger-ui/reqs/i18next.min.js", (req, res) => {
        const basePath = require.resolve("i18next-client").replace(/[\\/]i18next.js$/, "");
        const filename = path.join(basePath, "i18next.min.js");
        sendFile(res, filename);
    });
    RED.httpAdmin.get("/swagger-ui/reqs/*", (req, res) => {
        const basePath = require.resolve("swagger-ui").replace(/[\\/]swagger-ui.js$/, "");
        const filename = path.join(basePath, req.params[0]);
        sendFile(res, filename);
    });
    RED.httpAdmin.get("/swagger-ui/nls/*", (req, res) => {
        const filename = path.join(__dirname, "locales", req.params[0]);
        sendFile(res, filename);
    });
    RED.httpAdmin.get("/swagger-ui/*", (req, res) => {
        const filename = path.join(__dirname, "swagger-ui", req.params[0]);
        sendFile(res, filename);
    });
};

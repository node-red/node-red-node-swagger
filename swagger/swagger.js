/**
 * Copyright 2015 IBM Corp.
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

module.exports = function(RED) {
    "use strict";

    var path = require("path");
    RED.httpAdmin.get("/http-api/lib/yaml.js",function(req,res) {
        res.sendfile(path.join(__dirname,"lib","yaml.js"));
    });
    
    RED.httpNode.get("/http-api/swagger.json",function(req,res) {
        var basePath = RED.settings.httpNodeRoot;
        if (basePath != "/") {
            basePath = basePath.replace(/\/$/,"");
        }
        var resp = {
            swagger: "2.0",
            info: {
                "title": "An API",
                "description": "Another Node-RED API",
                "version": "0.0.1"
            },
            basePath: basePath,
            paths: {
                
            }
        };
        
        RED.nodes.eachNode(function(node) {
            if (node.type === "http in") {
                var pathObj = {
                    method: node.method
                }
                
                resp.paths[node.url] = resp.paths[node.url]||{};
                
                resp.paths[node.url][node.method] = {
                    summary: node.name||(node.method+" "+node.url)
                }
            }
        });
        
        
        res.json(resp);
    });
h}

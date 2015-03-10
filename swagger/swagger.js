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

    RED.httpNode.get("/swagger-doc/swagger.json",function(req,res) {
            
        var swagger = RED.settings.swagger;
        
        if (!swagger) {
            swagger = {
                swagger: "2.0",
                info: {
                    "title": "My Node-RED API",
                    "version": "0.0.1"
                }
            };
        }
        
        if (!swagger.basePath) {
            var basePath = RED.settings.httpNodeRoot;
            if (basePath != "/") {
                basePath = basePath.replace(/\/$/,"");
            }
            swagger.basePath = basePath;
        }
        
        swagger.paths = swagger.paths || {};
        
        RED.nodes.eachNode(function(node) {
            if (node.type === "http in") {
                var pathObj = {
                    method: node.method
                }
                
                swagger.paths[node.url] = swagger.paths[node.url]||{};
                
                var path = swagger.paths[node.url][node.method] = {
                    responses: {
                        200: {
                            description: "success"
                        }
                    }
                }
                
                if (node.name) {
                    path.summary = node.name;
                }
            }
        });
        
        
        res.json(swagger);
    });
h}

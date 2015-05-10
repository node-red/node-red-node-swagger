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
    
    RED.httpNode.get("/http-api/swagger.json",function(req,res) {
        var resp = RED.settings.swagger;
        if(!resp){
            resp = {
                swagger: "2.0",
                info: {
                    "title": "My Node-RED API",
                    "version": "0.0.1"
                }
            };
        }
        if(!resp.basePath){
            var basePath = "/";
            if(RED.settings.httpNodeRoot){
                basePath = RED.settings.httpNodeRoot;
                if (basePath != "/") {
                    basePath = basePath.replace(/\/$/,"");
                }
            }
            resp.basePath = basePath;
        }
        resp.paths = {};
        RED.nodes.eachNode(function(node) {
            if (node.type === "http in") {
                var swagger = RED.nodes.getNode(node.swaggerDoc);
                
                var url = node.url.replace(/\/:\w*/g, function convToSwaggerPath(x){return '/{' + x.substring(2) + '}';});
                
                resp.paths[url] = {};
                    var swaggerPart = {};
                if(swagger){
                    swaggerPart.summary = swagger.summary || node.name || (node.method+" "+url);
                    if(swagger.description)
                        swaggerPart.description = swagger.description;
                    
                    if(swagger.tags){
                        swaggerPart.tags = swagger.tags.split(',');
                        for(var i=0; i < swaggerPart.tags.length; i++){
                            swaggerPart.tags[i] = swaggerPart.tags[i].trim();
                        }
                    }
                                            
                    if(swagger.consumes){
                        swaggerPart.consumes = swagger.consumes.split(',');
                        for(var i=0; i < swaggerPart.consumes.length; i++){
                            swaggerPart.consumes[i] = swaggerPart.consumes[i].trim();
                        }
                    }
                    if(swagger.produces){
                        swaggerPart.produces = swagger.produces.split(',');
                        for(var i=0; i < swaggerPart.produces.length; i++){
                            swaggerPart.produces[i] = swaggerPart.produces[i].trim();
                        }
                    }
                    if(swagger.deprecated){
                        swaggerPart.deprecated = true;
                    }
                    if(swagger.parameters.length > 0){
                        swaggerPart.parameters = swagger.parameters;
                    }
                    if(Object.keys(swagger.responses).length > 0){
                        swaggerPart.responses = swagger.responses;
                    } else{
                        swaggerPart.responses = {
                            default: {}
                        };
                    }
                } else{
                    swaggerPart.summary = node.name || (node.method+" "+url);
                    swaggerPart.responses = {
                        default: {}
                    };
                }
                resp.paths[url][node.method] = swaggerPart;
            }
        });

        res.json(resp);
    });
    
    function SwaggerDoc(n){
        RED.nodes.createNode(this,n);
        this.summary = n.summary;
        this.description = n.description;
        this.tags = n.tags;
        this.consumes = n.consumes;
        this.produces = n.produces;
        this.parameters = n.parameters;
        this.responses = n.responses;
        this.deprecated = n.deprecated;
    }
    RED.nodes.registerType("swagger-doc",SwaggerDoc);
}

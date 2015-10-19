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
        var resp;
        if(RED.settings.swagger){
            resp = RED.settings.swagger.template;
        }
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
        var additionalParams;
        if(RED.settings.swagger && RED.settings.swagger.parameters){
            additionalParams = RED.settings.swagger.parameters;
        }
        resp.paths = {};
        RED.nodes.eachNode(function(node) {
            if (node && node.type === "http in") {
                if(checkWiresForHttpResponse(node)){
                    var swagger = RED.nodes.getNode(node.swaggerDoc);
                
                    var url = node.url.replace(/\/:\w*/g, function convToSwaggerPath(x){return '/{' + x.substring(2) + '}';});
                    if(url.charAt(0) !== '/'){
                        url = '/' + url;
                    }
                    
                    if(!resp.paths[url]){
                        resp.paths[url] = {};
                    }
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
                            swaggerPart.parameters = swagger.parameters.slice();
                            if(additionalParams){
                                for(var i in additionalParams){
                                    swaggerPart.parameters.push(additionalParams[i]);
                                }
                            }
                        } else if(additionalParams){
                            swaggerPart.parameters = additionalParams.slice();
                        }
                        if(Object.keys(swagger.responses).length > 0){
                            swaggerPart.responses = swagger.responses;
                        } else{
                            swaggerPart.responses = {
                                default: {}
                            };
                        }
                        node.status({});
                    } else{
                        swaggerPart.summary = node.name || (node.method+" "+url);
                        swaggerPart.responses = {
                            default: {}
                        };
                        if(additionalParams){
                            swaggerPart.parameters = additionalParams.slice();
                        }
                        node.status({fill:"yellow",shape:"ring",text:"node-red-node-swagger/swagger:swagger.status.missingconfig"});
                    }
                    resp.paths[url][node.method] = swaggerPart;
                } else{
                    node.status({fill:"grey",shape:"ring",text:"node-red-node-swagger/swagger:swagger.status.excluded"});
                }
            }
        });
        res.json(resp);
    });
    
    function checkWiresForHttpResponse (node) {
        var wires = node.wires[0];
        for(var i in wires){
            var newNode = RED.nodes.getNode(wires[i]);
            if(newNode.type == "http response"){
                return true;
            } else if(checkWiresForHttpResponse(newNode)){
                return true;
            }
        }
        return false;
    }
    
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
    
    
    RED.httpAdmin.get('/swagger-ui/reqs/i18next.min.js', function(req, res){
        var filename = path.join(__dirname , '../node_modules/i18next-client/i18next.min.js');
        res.sendfile(filename);
    });
    RED.httpAdmin.get('/swagger-ui/reqs/*', function(req, res){
        var filename = path.join(__dirname , '../node_modules/swagger-ui/dist', req.params[0]);
        res.sendfile(filename);
    });
    RED.httpAdmin.get('/swagger-ui/nls/*', function(req, res){
        var filename = path.join(__dirname , 'locales', req.params[0]);
        res.sendfile(filename);
    });
    RED.httpAdmin.get('/swagger-ui/*', function(req, res){
        var filename = path.join(__dirname , 'swagger-ui', req.params[0]);
        res.sendfile(filename);
    });
}
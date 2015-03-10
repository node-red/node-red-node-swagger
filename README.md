# Node-RED Swagger Documentation Generator

This package provides a set of tools for generating Swagger api documentation
based on the HTTP nodes deployed in a flow.

## Usage

1. Install the node module

        npm install node-red-node-swagger

  **Note:** until this is published to npm, you will need to install from git:
  
        npm install node-red/node-red-node-swagger

2. Provide a template swagger file in `settings.js`:

        swagger: {
          "swagger": "2.0",
          "info": {
            "title": "My Node-RED API",
            "version": "0.0.1"
          }
        }

3. The generated swagger is then available at <http://localhost:1880/swagger-doc/swagger.json>.

### Notes

- the `paths` entry of the swagger is generated based on the `HTTP In` nodes 
  present in the flow.
- if a swagger template is not provided, the example above is used as the default.
- if `basePath` is not set in the template, it is set to the value of `httpNodeRoot`
  if that value is something other than `/`.


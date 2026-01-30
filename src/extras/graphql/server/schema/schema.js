import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import gql from "graphql-tag";
import { makeExecutableSchema } from "@graphql-tools/schema";
import createResolvers from "./resolvers.js";

const schemaWithOptions = (model, logger) => {
    const typeDefsString = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "typedefs.graphql"), "utf8");

    const schema = makeExecutableSchema({
        typeDefs: gql(typeDefsString),
        resolvers: createResolvers(model, logger),
    });

    return {
        schema: schema,
        merge: {}
    };
}

export default schemaWithOptions;

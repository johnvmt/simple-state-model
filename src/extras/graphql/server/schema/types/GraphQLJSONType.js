// ObjectOrPrimitive v0.0.1

import { GraphQLScalarType, Kind } from "graphql";

export default new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON',
    parseValue: (value) => {
        if(typeof value === 'object')
            return value;
        else if(typeof value === 'string') {
            try {
                return JSON.parse(value)
            } catch (error) {
                return value;
            }
        }
        else
            return value;

    },
    serialize: (value) => {
        if(typeof value === 'object')
            return value;
        else if(typeof value === 'string') {
            try {
                return JSON.parse(value)
            } catch (error) {
                return value;
            }
        }
        else
            return value;
    },
    parseLiteral: (ast) => {
        switch (ast.kind) {
            case Kind.OBJECT:
                throw new Error(`Not sure what to do with OBJECT for ObjectScalarType`);
            case Kind.STRING:
                try {
                    return JSON.parse(ast.value);
                }
                catch(error) {
                    return ast.value;
                }
            default:
                return ast.value;
        }
    }
});

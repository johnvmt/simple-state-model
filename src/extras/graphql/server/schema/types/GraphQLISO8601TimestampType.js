// ISO8601Date v0.0.1
import { GraphQLScalarType, Kind } from "graphql";

export default new GraphQLScalarType({
    name: 'ISO8601Timestamp',
    description: 'ISO-8601-formatted timestamp'
});

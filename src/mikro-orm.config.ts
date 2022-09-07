import { Options } from "@mikro-orm/core";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

const config: Options = {
    type: 'sqlite',
    dbName: 'test.db',
    highlighter: new SqlHighlighter(),
    debug: true,
    entities: ['./build/modules/entities'],
    entitiesTs: ['./src/modules/entities'],
    forceUtcTimezone: true,
    forceUndefined: true,
    validate: true,
    allowGlobalContext: true,
    metadataProvider: TsMorphMetadataProvider
};

export default config;

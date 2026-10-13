import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'server/src/graphql/type-defs.ts',
  generates: {
    'server/src/graphql/generated/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#GraphqlContext',
        useTypeImports: true,
        enumsAsTypes: true,
      },
    },
    'packages/common/api/src/generated/': {
      preset: 'client',
      documents: 'packages/common/api/src/operations/*.graphql',
      presetConfig: { fragmentMasking: false },
      config: {
        documentMode: 'string',
        useTypeImports: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
